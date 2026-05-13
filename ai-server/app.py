import json
import logging
import os
import re
import time

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
_TIMEOUT_SEC  = 90          # 응답 대기 최대 시간 (초)
_MAX_RETRIES  = 3           # 재시도 최대 횟수

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


# ── 채팅 엔드포인트 ───────────────────────────────────────────────────────────

@app.route("/api/chat", methods=["POST"])
def chat():
    """
    Request Body (JSON):
        { "text": "사용자 메시지 (시스템 프롬프트가 이미 적용됨)" }

    Response (JSON):
        {
            "success": true,
            "reply": "AI 의 응답 메시지"
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

    reply = _generate_chat_response(text)

    return jsonify({
        "success": True,
        "reply": reply,
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

    retry_count = 0
    last_exception = None

    while retry_count < _MAX_RETRIES:
        try:
            logger.info(
                "[AI서버] LLM API 요청 시작 (시도 %d/%d, timeout=%ds)",
                retry_count + 1, _MAX_RETRIES, _TIMEOUT_SEC
            )

            resp = requests.post(
                _DCU_API_URL,
                json=payload,
                headers=headers,
                timeout=_TIMEOUT_SEC,
            )
            resp.raise_for_status()

            logger.info("[AI서버] LLM API 성공 (시도 %d/%d)", retry_count + 1, _MAX_RETRIES)
            return _parse_llm_output(resp.json()["choices"][0]["message"]["content"].strip())

        except requests.exceptions.Timeout as exc:
            retry_count += 1
            last_exception = exc
            if retry_count < _MAX_RETRIES:
                logger.warning(
                    "[AI서버] LLM API 타임아웃 (%ds 초과) — 시도 %d/%d 실패, 재시도 중...",
                    _TIMEOUT_SEC, retry_count, _MAX_RETRIES
                )
            else:
                logger.error(
                    "[AI서버] LLM API 타임아웃 (%ds 초과) — 시도 %d/%d 모두 실패, 기본값 반환",
                    _TIMEOUT_SEC, retry_count, _MAX_RETRIES
                )
                return "중립", 0.0, ""

        except requests.exceptions.RequestException as exc:
            retry_count += 1
            last_exception = exc
            if retry_count < _MAX_RETRIES:
                logger.warning(
                    "[AI서버] LLM API 호출 실패 (%s) — 시도 %d/%d 실패, 재시도 중...",
                    str(exc), retry_count, _MAX_RETRIES
                )
            else:
                logger.error(
                    "[AI서버] LLM API 호출 실패 (%s) — 시도 %d/%d 모두 실패, 기본값 반환",
                    str(exc), retry_count, _MAX_RETRIES
                )
                return "중립", 0.0, ""

        # 재시도 전 대기 (지수 백오프: 1 초, 2 초, 4 초)
        wait_time = 2 ** retry_count
        logger.info("[AI서버] %d 초 후 재시도...", wait_time)
        time.sleep(wait_time)

    # 최종 실패 시 (이론적으로 위 루프에서 반환되므로 도달하지 않음)
    logger.error("[AI서버] LLM API 최종 실패 — 기본값 반환")
    return "중립", 0.0, ""


# ── 채팅 응답 생성 함수 ───────────────────────────────────────────────────────

_CHAT_SYSTEM_PROMPT = (
    "너는 다정하고 공감 능력이 뛰어난 다이어리 봇 '프리지아'야. "
    "반말로 친근하게 대답해 줘. "
    "사용자의 말에 공감하고 위로해주는 톤으로 답변해. "
    "자연스럽고 따뜻한 대화체를 사용해."
)

def _generate_chat_response(user_message: str) -> str:
    """
    DCU LLM API 를 호출하여 채팅 응답을 생성합니다.
    API 오류·파싱 실패·타임아웃 발생 시 기본 응답을 반환합니다.
    """
    if not _DCU_API_KEY:
        logger.warning("[AI서버] API 키 없음 — 기본값 반환")
        return "죄송해요, 지금 연결이 안 되고 있어요. 😢"

    payload = {
        "model": _DCU_MODEL,
        "stream": False,
        "messages": [
            {"role": "system", "content": _CHAT_SYSTEM_PROMPT},
            {"role": "user",   "content": user_message},
        ],
    }
    headers = {
        "Authorization": f"Bearer {_DCU_API_KEY}",
        "Content-Type":  "application/json",
    }

    retry_count = 0
    last_exception = None

    while retry_count < _MAX_RETRIES:
        try:
            logger.info(
                "[채팅] LLM API 요청 시작 (시도 %d/%d, timeout=%ds)",
                retry_count + 1, _MAX_RETRIES, _TIMEOUT_SEC
            )

            resp = requests.post(
                _DCU_API_URL,
                json=payload,
                headers=headers,
                timeout=_TIMEOUT_SEC,
            )
            resp.raise_for_status()

            logger.info("[채팅] LLM API 성공 (시도 %d/%d)", retry_count + 1, _MAX_RETRIES)
            content = resp.json()["choices"][0]["message"]["content"].strip()
            logger.info("[채팅] 응답: %s", content[:50])
            return content

        except requests.exceptions.Timeout as exc:
            retry_count += 1
            last_exception = exc
            if retry_count < _MAX_RETRIES:
                logger.warning(
                    "[채팅] LLM API 타임아웃 (%ds 초과) — 시도 %d/%d 실패, 재시도 중...",
                    _TIMEOUT_SEC, retry_count, _MAX_RETRIES
                )
            else:
                logger.error(
                    "[채팅] LLM API 타임아웃 (%ds 초과) — 시도 %d/%d 모두 실패, 기본값 반환",
                    _TIMEOUT_SEC, retry_count, _MAX_RETRIES
                )
                return "죄송해요, 지금 연결이 안 되고 있어요. 😢"

        except requests.exceptions.RequestException as exc:
            retry_count += 1
            last_exception = exc
            if retry_count < _MAX_RETRIES:
                logger.warning(
                    "[채팅] LLM API 호출 실패 (%s) — 시도 %d/%d 실패, 재시도 중...",
                    str(exc), retry_count, _MAX_RETRIES
                )
            else:
                logger.error(
                    "[채팅] LLM API 호출 실패 (%s) — 시도 %d/%d 모두 실패, 기본값 반환",
                    str(exc), retry_count, _MAX_RETRIES
                )
                return "죄송해요, 지금 연결이 안 되고 있어요. 😢"

        # 재시도 전 대기 (지수 백오프: 1 초, 2 초, 4 초)
        wait_time = 2 ** retry_count
        logger.info("[채팅] %d 초 후 재시도...", wait_time)
        time.sleep(wait_time)

    return "죄송해요, 지금 연결이 안 되고 있어요. 😢"


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
