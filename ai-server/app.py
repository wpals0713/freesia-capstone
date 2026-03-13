import json
import logging
import os
import re

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)


# ── DCU LLM 설정 ───────────────────────────────────────────────────────────────

_DCU_API_URL  = "https://code.cu.ac.kr/llm/v1/chat/completions"
_DCU_MODEL    = "Qwen/Qwen3.5-35B-A3B-FP8"
_DCU_API_KEY  = os.getenv("DCU_LLM_API_KEY", "")
_TIMEOUT_SEC  = 30          # 응답 대기 최대 시간 (초)

_VALID_EMOTIONS = {"기쁨", "슬픔", "분노", "불안", "중립"}

_SYSTEM_PROMPT = (
    "너는 감정 분석 전문가이자 따뜻한 심리 상담사야. "
    "사용자의 일기를 읽고 다음 두 가지를 수행해.\n"
    "1. 반드시 '기쁨', '슬픔', '분노', '불안', '중립' 중 하나의 감정으로 분류하고, "
    "0.0~1.0 사이의 확신도 점수를 매겨.\n"
    "2. 일기를 읽은 느낌을 바탕으로 사용자에게 공감하고 위로해 주는 "
    "1~2줄 분량의 다정한 한국어 코멘트를 작성해. "
    "코멘트는 구체적인 일기 내용을 언급하며 진심 어린 위로가 되도록 써줘.\n"
    "대답은 반드시 마크다운 없이 순수한 JSON 형식으로만 출력해.\n"
    "출력 예시: {\"emotion\": \"불안\", \"sentimentScore\": 0.8, "
    "\"aiComment\": \"오늘 첫날이라 많이 긴장되셨겠어요. 새로운 시작은 늘 떨리지만, 그만큼 설레는 일이기도 해요.\"}"
)

if not _DCU_API_KEY:
    logger.warning("[AI서버] DCU_LLM_API_KEY 가 설정되지 않았습니다. .env 파일을 확인하세요.")
else:
    logger.info("[AI서버] DCU LLM API 준비 완료 (model=%s)", _DCU_MODEL)


# ── 헬스 체크 ─────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model": _DCU_MODEL,
        "api_key_set": bool(_DCU_API_KEY),
    }), 200


# ── 감정 분석 엔드포인트 ──────────────────────────────────────────────────────

@app.route("/api/analyze", methods=["POST"])
def analyze():
    """
    Request Body (JSON):
        { "text": "오늘 하루가 너무 행복했어요." }

    Response (JSON):
        {
            "success": true,
            "emotion": "기쁨",          # 기쁨 | 슬픔 | 분노 | 불안 | 중립
            "sentimentScore": 0.8       # 0.0 ~ 1.0 (LLM 확신도)
        }
    """
    body = request.get_json(silent=True)

    if not body or "text" not in body:
        return jsonify({
            "success": False,
            "message": "요청 본문에 'text' 필드가 필요합니다.",
        }), 400

    text: str = body["text"].strip()
    if not text:
        return jsonify({
            "success": False,
            "message": "'text' 값이 비어 있습니다.",
        }), 400

    emotion, score, ai_comment = _analyze_emotion(text)

    return jsonify({
        "success":        True,
        "emotion":        emotion,
        "sentimentScore": round(score, 4),
        "aiComment":      ai_comment,
    }), 200


# ── 내부 분석 함수 ────────────────────────────────────────────────────────────

def _analyze_emotion(text: str) -> tuple[str, float, str]:
    """
    DCU LLM API 를 호출해 (감정, 확신도, AI코멘트) 를 반환합니다.
    API 오류·파싱 실패·타임아웃 발생 시 ("중립", 0.0, "") 을 반환합니다.
    """
    if not _DCU_API_KEY:
        logger.warning("[AI서버] API 키 없음 — 기본값(중립, 0.0) 반환")
        return "중립", 0.0, ""

    payload = {
        "model": _DCU_MODEL,
        "stream": False,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user",   "content": text},
        ],
    }
    headers = {
        "Authorization": f"Bearer {_DCU_API_KEY}",
        "Content-Type":  "application/json",
    }

    try:
        resp = requests.post(
            _DCU_API_URL,
            json=payload,
            headers=headers,
            timeout=_TIMEOUT_SEC,
        )
        resp.raise_for_status()

    except requests.exceptions.Timeout:
        logger.warning("[AI서버] LLM API 타임아웃 (%ds 초과) — 기본값 반환", _TIMEOUT_SEC)
        return "중립", 0.0, ""

    except requests.exceptions.RequestException as exc:
        logger.error("[AI서버] LLM API 호출 실패: %s — 기본값 반환", exc)
        return "중립", 0.0, ""

    # ── LLM 응답에서 content 추출 ──────────────────────────────────────────
    try:
        llm_text: str = resp.json()["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, ValueError) as exc:
        logger.error("[AI서버] LLM 응답 구조 파싱 실패: %s | 응답=%s", exc, resp.text[:200])
        return "중립", 0.0, ""

    # ── content → JSON 파싱 ────────────────────────────────────────────────
    return _parse_llm_output(llm_text)


def _parse_llm_output(llm_text: str) -> tuple[str, float, str]:
    """
    LLM 이 반환한 텍스트에서 emotion / sentimentScore / aiComment 를 추출합니다.

    LLM 이 가끔 ```json ... ``` 블록으로 감싸거나 앞뒤에 설명을 붙이는 경우를
    대비해 JSON 객체 부분만 정규식으로 먼저 뽑아냅니다.
    """
    # 1) 전체 텍스트를 직접 파싱 시도
    # 2) 실패하면 중괄호 블록만 추출해서 재시도 (가장 바깥 중괄호 기준)
    candidates = [llm_text]
    brace_match = re.search(r'\{.*\}', llm_text, re.DOTALL)
    if brace_match:
        candidates.append(brace_match.group())

    for candidate in candidates:
        try:
            data = json.loads(candidate)
            emotion: str    = str(data.get("emotion", "")).strip()
            score_raw        = data.get("sentimentScore", data.get("score", 0.0))
            score: float     = float(score_raw)
            ai_comment: str  = str(data.get("aiComment", "")).strip()

            # 유효성 검사
            if emotion not in _VALID_EMOTIONS:
                logger.warning("[AI서버] 알 수 없는 감정값 '%s' — 중립으로 대체", emotion)
                emotion = "중립"
            score = max(0.0, min(1.0, score))   # 0.0~1.0 범위 클램핑

            logger.info("[AI서버] 분석 완료 — emotion=%s, score=%.4f, comment=%s",
                        emotion, score, ai_comment[:30])
            return emotion, score, ai_comment

        except (json.JSONDecodeError, TypeError, ValueError):
            continue

    logger.error("[AI서버] JSON 파싱 최종 실패 — llm_text=%s", llm_text[:200])
    return "중립", 0.0, ""


# ── 서버 실행 ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
