import os
import json
import logging
import asyncio
import joblib
import httpx
import re
import pandas as pd
import uuid
from datetime import datetime
import rag_service
from fastapi import FastAPI, HTTPException, BackgroundTasks
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

# ── 1. 자체 머신러닝 모델 & DCU LLM & 데이터셋 설정 ───────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "training", "emotion_model.pkl")
# JSON 원본 데이터셋 경로 (Flattening용)
DATASET_JSON_PATH = os.path.join(BASE_DIR, "data", "raw", "감성대화말뭉치(최종데이터)_Training.json")

# 전역 변수
emotion_model = None
chat_dataset_dict = {}

_DCU_API_URL  = "https://code.cu.ac.kr/llm/v1/chat/completions"
_DCU_MODEL    = "Qwen/Qwen3.5-35B-A3B-FP8"
_DCU_API_KEY  = os.getenv("DCU_LLM_API_KEY", "")
_TIMEOUT_SEC  = 90.0
_MAX_RETRIES  = 3

# ── 2. 서버 시작 시 머신러닝 모델 & 데이터셋 단 1회 로딩 ──────────────────
@app.on_event("startup")
async def startup_event():
    global emotion_model, chat_dataset_df
    
    # 감정 분석 모델 로드
    if os.path.exists(MODEL_PATH):
        emotion_model = joblib.load(MODEL_PATH)
        logger.info(f"[AI서버] ✅ 자체 머신러닝 모델 로드 완료: {MODEL_PATH}")
    else:
        logger.error(f"[AI서버] ❌ 모델을 찾을 수 없습니다: {MODEL_PATH}")
        
    # JSON 데이터셋 로드 (Flattening: 모든 HS -> SS 추출)
    try:
        if os.path.exists(DATASET_JSON_PATH):
            with open(DATASET_JSON_PATH, "r", encoding="utf-8") as f:
                raw_data = json.load(f)
            
            for item in raw_data:
                content = item.get("talk", {}).get("content", {})
                for key, value in content.items():
                    if key.startswith("HS") and isinstance(value, str):
                        ss_key = key.replace("HS", "SS")
                        ss_value = content.get(ss_key, "")
                        if isinstance(ss_value, str):
                            q = value.strip()
                            a = ss_value.strip()
                            if q and a:
                                chat_dataset_dict[_normalize_text(q)] = a
                                
            logger.info(f"[AI서버] ✅ 채팅 데이터셋(JSON) 딕셔너리 로드 완료: {len(chat_dataset_dict)} items")
        else:
            logger.error(f"[AI서버] ❌ 데이터셋을 찾을 수 없습니다: {DATASET_JSON_PATH}")
    except Exception as e:
        logger.error(f"[AI서버] ❌ JSON 데이터셋 로드 실패: {e}")
    
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

# 시계열 RAG 분석을 위한 감정별 고정 가중치 가이드라인
EMOTION_WEIGHTS = {
    "기쁨": 0.8,
    "중립": 0.0,
    "기타": 0.0,
    "불안": -0.5,
    "슬픔": -0.8,
    "분노": -0.9
}

@app.post("/api/analyze")
async def analyze(request: TextRequest, background_tasks: BackgroundTasks):
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="텍스트가 비어 있습니다.")

    if emotion_model is None:
        raise HTTPException(status_code=500, detail="머신러닝 모델이 준비되지 않았습니다.")

    # [STEP 1] 자체 머신러닝 모델로 감정 및 확신도(확률) 추출
    probabilities = emotion_model.predict_proba([text])[0]
    classes = emotion_model.classes_
    
    # [중립 편향 완화 및 민감도 향상]
    for idx, cls_name in enumerate(classes):
        if "중립" in cls_name:
            probabilities[idx] *= 0.3 # 중립 가중치 대폭 삭감 (다른 감정이 더 민감하게 반응하도록 유도)
            
    predicted_class_idx = probabilities.argmax()
    predicted_emotion = classes[predicted_class_idx]
    sentiment_score = float(probabilities[predicted_class_idx])

    # [STEP 1-1] 최종 감정 점수 계산 (가중치 * 확신도), 소수점 둘째 자리 반올림
    weight = EMOTION_WEIGHTS.get(predicted_emotion, 0.0)
    emotion_score = round(weight * sentiment_score, 2)

    logger.info(f"[ML예측] 텍스트: {text[:20]}... => 감정: {predicted_emotion} (확신도: {sentiment_score:.2f}, 점수: {emotion_score})")

    # [STEP 1-2] RAG 벡터 DB 저장을 백그라운드 작업으로 비동기 실행 (속도 최적화)
    diary_id = str(uuid.uuid4())
    current_date = datetime.now().strftime("%Y-%m-%d")
    background_tasks.add_task(rag_service.save_diary_to_vector_db, diary_id, text, current_date, emotion_score)

    # [STEP 2] 분류된 감정을 바탕으로 LLM에게 맞춤형 위로 코멘트 요청 (RAG 적용)
    ai_comment = await _generate_comfort_comment(text, predicted_emotion, emotion_score)

    # [STEP 3] 최종 결과 반환
    return {
        "success": True,
        "emotion": predicted_emotion,       # ML이 분류한 정확한 감정
        "sentimentScore": round(sentiment_score, 4), # ML의 확신도
        "emotion_score": emotion_score,     # 시계열 RAG 분석용 최종 감정 점수
        "aiComment": ai_comment             # LLM이 생성한 맞춤형 위로
    }

# ── 6. 데이터셋(AI Hub 감성대화말뭉치) 검색 로직 (Rule-based) ────────────

def _normalize_text(text: str) -> str:
    if not isinstance(text, str):
        return ""
    return re.sub(r'[^a-zA-Z0-9가-힣]', '', text).lower()

async def _search_from_dataset(user_message: str) -> tuple[str, str]:
    """
    메모리에 평탄화된 딕셔너리에서 질문을 검색합니다.
    반환값: (답변, 매칭여부_로그용사유)
    """
    global chat_dataset_dict
    if not chat_dataset_dict:
        return "", "데이터셋 딕셔너리가 비어있거나 로드되지 않았음"

    normalized_user = _normalize_text(user_message)
    if not normalized_user:
        return "", "유효한 텍스트 문자가 없음 (기호/공백만 존재)"

    if normalized_user in chat_dataset_dict:
        return chat_dataset_dict[normalized_user], "SUCCESS"
        
    return "", f"데이터셋에 정확히 일치하는 질문이 없음 (정규화: '{normalized_user[:15]}...')"

# ── 7. 채팅 엔드포인트 (하이브리드 구조: Rule-based + LLM Fallback) ──────
@app.post("/api/chat")
async def chat(request: TextRequest):
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="텍스트가 비어 있습니다.")

    # [STEP 1] 사전 정제된 데이터셋(규칙 기반)에서 먼저 답변을 검색합니다.
    dataset_reply, match_reason = await _search_from_dataset(text)
    
    if dataset_reply and match_reason == "SUCCESS":
        logger.info(f"[채팅] 데이터셋 매칭 성공: '{text[:15]}...'")
        return {
            "success": True,
            "reply": dataset_reply
        }

    # [STEP 2] 데이터셋에 일치하는 답변이 없다면, 기존처럼 LLM에게 생성을 요청합니다 (Fallback).
    logger.info(f"[채팅] 데이터셋 매칭 실패 사유: {match_reason} -> LLM Fallback 호출")
    llm_reply = await _generate_chat_response(text)
    
    return {
        "success": True,
        "reply": llm_reply
    }

# ── 8. 내부 비동기 LLM 호출 함수들 ─────────────────────────────────────────

async def _generate_comfort_comment(text: str, predicted_emotion: str, emotion_score: float) -> str:
    """
    미리 분석된 감정과 RAG 검색 결과를 프롬프트에 넣어 LLM이 헛소리를 하지 않고 정확하게 위로하도록 통제합니다.
    """
    if not _DCU_API_KEY:
        return "지금은 위로를 전해드릴 수 없네요. (API 키 오류)"

    # [RAG 적용] 과거 유사한 일기 검색
    past_diaries = rag_service.search_similar_diaries(text, top_k=3)
    
    context_str = ""
    if past_diaries:
        context_str = "\n\n[과거 유사한 일기 기록 (Context)]\n"
        for i, d in enumerate(past_diaries):
            context_str += f"{i+1}. 날짜: {d['date']}, 감정 점수: {d['emotion_score']}\n내용: {d['text']}\n"
    else:
        context_str = "\n\n[과거 유사한 일기 기록 (Context)]\n과거 기록이 없습니다.\n"

    system_prompt = (
        "너는 사용자의 마음을 깊이 이해하는 다정한 AI 친구 '프리지아'야. "
        "제공된 과거의 비슷한 경험과 감정 기록을 자연스럽게 언급하면서, 현재의 감정에 공감하고 앞으로 나아갈 수 있도록 따뜻하게 위로해 줘. "
        f"현재 사용자의 핵심 감정은 **[{predicted_emotion}]** 상태이고, 감정 점수는 {emotion_score}점이야. "
        f"{context_str}\n"
        "결과는 반드시 순수한 JSON 형식으로만 반환해. 예시: {\"aiComment\": \"예전에도 비슷한 일로 힘드셨네요. 오늘 하루도 정말 고생 많으셨어요...\"}"
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
        "반말로 친근하게 대답해 줘. 사용자의 말에 공감하고 자연스러운 대화체를 써줘.\n"
        "[절대 규칙] 사용자의 대화 횟수, 일기 작성 횟수를 알고 있더라도 대화 중에 절대 언급하지 마. '벌써 2번째', '몇 번째'라는 단어는 시스템에서 금지어 처리되었어. 위반 시 감점."
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