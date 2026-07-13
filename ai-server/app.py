import os
import json
import logging
import asyncio
import joblib
import httpx
import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# 환경변수 로드
load_dotenv()

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# FastAPI 앱 초기화
app = FastAPI(title="Freesia Hybrid AI API")

# CORS 설정 (프론트엔드 연동을 위해)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 1. 자체 머신러닝 모델 & DCU LLM 설정 ──────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "training", "emotion_model.pkl")

# 전역 변수
emotion_model = None

_DCU_API_URL  = "https://code.cu.ac.kr/llm/v1/chat/completions"
_DCU_MODEL    = "Qwen/Qwen3.5-35B-A3B-FP8"
_DCU_API_KEY  = os.getenv("DCU_LLM_API_KEY", "")
_TIMEOUT_SEC  = 90.0
_MAX_RETRIES  = 3

# ── 2. 서버 시작 시 머신러닝 모델 단 1회 로딩 ─────────────────────────────
@app.on_event("startup")
async def startup_event():
    global emotion_model
    if os.path.exists(MODEL_PATH):
        emotion_model = joblib.load(MODEL_PATH)
        logger.info(f"[AI서버] ✅ 자체 머신러닝 모델 로드 완료: {MODEL_PATH}")
    else:
        logger.error(f"[AI서버] ❌ 모델을 찾을 수 없습니다: {MODEL_PATH}")
    
    if not _DCU_API_KEY:
        logger.warning("[AI서버] ⚠️ DCU_LLM_API_KEY가 설정되지 않았습니다.")
    else:
        logger.info(f"[AI서버] ✅ DCU LLM 연결 준비 완료 (model={_DCU_MODEL})")

# ── 3. Pydantic 데이터 검증 모델 ──────────────────────────────────────────
class TextRequest(BaseModel):
    text: str

# ── 4. 헬스 체크 엔드포인트 ───────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "ml_model_loaded": emotion_model is not None,
        "llm_api_key_set": bool(_DCU_API_KEY),
        "llm_model": _DCU_MODEL
    }

# ── 5. [핵심] 하이브리드 감정 분석 엔드포인트 ──────────────────────────────
@app.post("/api/analyze")
async def analyze(request: TextRequest):
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="텍스트가 비어 있습니다.")

    if emotion_model is None:
        raise HTTPException(status_code=500, detail="머신러닝 모델이 준비되지 않았습니다.")

    # [STEP 1] 자체 머신러닝 모델로 감정 및 확신도(확률) 추출
    # predict_proba를 사용해 모델의 확신도 점수를 가져옵니다.
    probabilities = emotion_model.predict_proba([text])[0]
    predicted_class_idx = probabilities.argmax()
    predicted_emotion = emotion_model.classes_[predicted_class_idx]
    sentiment_score = float(probabilities[predicted_class_idx])

    logger.info(f"[ML예측] 텍스트: {text[:20]}... => 감정: {predicted_emotion} (점수: {sentiment_score:.2f})")

    # [STEP 2] 분류된 감정을 바탕으로 LLM에게 맞춤형 위로 코멘트 요청
    ai_comment = await _generate_comfort_comment(text, predicted_emotion)

    # [STEP 3] 최종 결과 반환
    return {
        "success": True,
        "emotion": predicted_emotion,       # ML이 분류한 정확한 감정
        "sentimentScore": round(sentiment_score, 4), # ML의 확신도
        "aiComment": ai_comment             # LLM이 생성한 맞춤형 위로
    }

# ── 6. 채팅 엔드포인트 (기존 로직 유지, 비동기로 최적화) ──────────────────
@app.post("/api/chat")
async def chat(request: TextRequest):
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="텍스트가 비어 있습니다.")

    reply = await _generate_chat_response(text)
    return {
        "success": True,
        "reply": reply
    }

# ── 7. 내부 비동기 LLM 호출 함수들 ─────────────────────────────────────────

async def _generate_comfort_comment(text: str, predicted_emotion: str) -> str:
    """
    미리 분석된 감정을 프롬프트에 넣어 LLM이 헛소리를 하지 않고 정확하게 위로하도록 통제합니다.
    """
    if not _DCU_API_KEY:
        return "지금은 위로를 전해드릴 수 없네요. (API 키 오류)"

    system_prompt = (
        "너는 다정하고 공감 능력이 뛰어난 심리 상담사야. "
        f"사용자의 일기를 읽었는데, 현재 사용자의 핵심 감정은 **[{predicted_emotion}]** 상태야. "
        "이 감정에 완벽하게 공감하고 위로가 되는 1~2줄의 다정한 한국어 코멘트를 작성해줘. "
        "결과는 반드시 순수한 JSON 형식으로만 반환해. 예시: {\"aiComment\": \"오늘 많이 힘드셨죠...\"}"
    )

    payload = {
        "model": _DCU_MODEL,
        "stream": False,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text},
        ],
    }
    
    headers = {
        "Authorization": f"Bearer {_DCU_API_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient() as client:
        for attempt in range(_MAX_RETRIES):
            try:
                response = await client.post(_DCU_API_URL, json=payload, headers=headers, timeout=_TIMEOUT_SEC)
                response.raise_for_status()
                
                content = response.json()["choices"][0]["message"]["content"].strip()
                
                # 정규식으로 JSON 부분만 안전하게 파싱
                brace_match = re.search(r'\{.*\}', content, re.DOTALL)
                if brace_match:
                    data = json.loads(brace_match.group())
                    return data.get("aiComment", "오늘 하루도 정말 고생 많으셨어요.")
                else:
                    return content # JSON 형식이 아니면 텍스트 그대로 반환
                    
            except Exception as e:
                logger.warning(f"[AI서버] 코멘트 생성 실패 (시도 {attempt+1}/{_MAX_RETRIES}): {e}")
                await asyncio.sleep(2 ** attempt)

    return "오늘 하루도 정말 고생 많으셨어요. 다 잘 될 거예요!"

async def _generate_chat_response(user_message: str) -> str:
    if not _DCU_API_KEY:
        return "죄송해요, 지금 연결이 안 되고 있어요. 😢"

    system_prompt = (
        "너는 다정하고 공감 능력이 뛰어난 다이어리 봇 '프리지아'야. "
        "반말로 친근하게 대답해 줘. 사용자의 말에 공감하고 자연스러운 대화체를 써줘."
    )

    payload = {
        "model": _DCU_MODEL,
        "stream": False,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
    }
    headers = {"Authorization": f"Bearer {_DCU_API_KEY}", "Content-Type": "application/json"}

    async with httpx.AsyncClient() as client:
        for attempt in range(_MAX_RETRIES):
            try:
                response = await client.post(_DCU_API_URL, json=payload, headers=headers, timeout=_TIMEOUT_SEC)
                response.raise_for_status()
                return response.json()["choices"][0]["message"]["content"].strip()
            except Exception as e:
                logger.warning(f"[채팅] 응답 생성 실패 (시도 {attempt+1}/{_MAX_RETRIES}): {e}")
                await asyncio.sleep(2 ** attempt)

    return "죄송해요, 지금 연결이 안 되고 있어요. 😢"