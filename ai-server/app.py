import os
import json
import logging
import asyncio
import joblib
import httpx
import re
import pandas as pd
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

# ── 1. 자체 머신러닝 모델 & DCU LLM & 데이터셋 설정 ───────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "training", "emotion_model.pkl")
# Parquet 원본 데이터셋 경로
DATASET_PATH = os.path.join(BASE_DIR, "data", "processed", "training_data.parquet")

# 전역 변수
emotion_model = None
chat_dataset_df = None

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
        
    # Parquet 데이터셋 로드 (Pandas DataFrame)
    try:
        if os.path.exists(DATASET_PATH):
            # 엔진을 pyarrow로 지정하여 로드
            chat_dataset_df = pd.read_parquet(DATASET_PATH, engine="pyarrow")
            logger.info(f"[AI서버] ✅ 채팅 데이터셋 로드 완료: {len(chat_dataset_df)} rows")
        else:
            logger.error(f"[AI서버] ❌ 데이터셋을 찾을 수 없습니다: {DATASET_PATH}")
    except Exception as e:
        logger.error(f"[AI서버] ❌ Parquet 데이터셋 로드 실패 (pyarrow/fastparquet 패키지 확인 필요): {e}")
    
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

# ── 6. 데이터셋(AI Hub 감성대화말뭉치) 검색 로직 (Rule-based) ────────────

async def _search_from_dataset(user_message: str) -> str:
    """
    메모리에 로드된 Parquet DataFrame에서 사용자의 메시지와 매칭되는 답변을 찾습니다.
    사용자 입력(user_message)의 키워드를 기반으로 유사한 질문(user_text)을 찾거나, 
    일치하는 감정 상태(emotion)의 답변(system_reply)을 반환합니다.
    """
    global chat_dataset_df, emotion_model
    if chat_dataset_df is None or chat_dataset_df.empty:
        return ""

    # 1. 감정 추출 (기존 emotion_model 활용)
    predicted_emotion = None
    if emotion_model is not None:
        try:
            probabilities = emotion_model.predict_proba([user_message])[0]
            predicted_class_idx = probabilities.argmax()
            predicted_emotion = emotion_model.classes_[predicted_class_idx]
        except Exception:
            pass

    # 2. DataFrame 검색 최적화
    # 먼저 감정이 일치하는 데이터로 필터링하여 검색 공간을 줄입니다.
    df_search = chat_dataset_df
    if predicted_emotion:
        df_emotion = chat_dataset_df[chat_dataset_df['emotion'] == predicted_emotion]
        if not df_emotion.empty:
            df_search = df_emotion

    # 3. Jaccard 유사도를 통한 엄격한 키워드 매칭 계산
    # 띄어쓰기 기준으로 토큰화하여 단어 집합(Set) 생성
    user_words = set(user_message.split())
    if not user_words:
        return ""
        
    best_score = 0.0
    best_reply = ""
    
    # 유사도 기준점 (Threshold) - 오탐지를 막기 위해 문맥이 확실히 일치할 때만 통과
    # (예: Jaccard 유사도 0.25 이상이면 상당히 많은 핵심 키워드가 일치함을 의미)
    SIMILARITY_THRESHOLD = 0.25
    
    for text, reply in zip(df_search['user_text'], df_search['system_reply']):
        if not isinstance(text, str):
            continue
            
        text_words = set(text.split())
        if not text_words:
            continue
            
        # 교집합과 합집합을 통한 Jaccard 유사도 계산
        intersection = user_words.intersection(text_words)
        union = user_words.union(text_words)
        jaccard_score = len(intersection) / len(union)
        
        # 임계값을 넘는 데이터 중 가장 점수가 높은 답변 갱신
        if jaccard_score > best_score and jaccard_score >= SIMILARITY_THRESHOLD:
            best_score = jaccard_score
            best_reply = str(reply)
            
            # 확신도가 매우 높은 경우(예: 0.7 이상) 불필요한 연산 방지를 위해 즉시 반환
            if best_score >= 0.7:
                break
                
    # 4. 기준점(Threshold)을 넘는 확실한 답변이 없으면 빈 문자열 반환
    # -> 빈 문자열을 반환하면 메인 라우팅 로직에 의해 즉시 LLM으로 넘어가게 됨
    return best_reply

# ── 7. 채팅 엔드포인트 (하이브리드 구조: Rule-based + LLM Fallback) ──────
@app.post("/api/chat")
async def chat(request: TextRequest):
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="텍스트가 비어 있습니다.")

    # [STEP 1] 사전 정제된 데이터셋(규칙 기반)에서 먼저 답변을 검색합니다.
    dataset_reply = await _search_from_dataset(text)
    
    if dataset_reply:
        logger.info(f"[채팅] 데이터셋 매칭 성공: '{text[:15]}...'")
        return {
            "success": True,
            "reply": dataset_reply
        }

    # [STEP 2] 데이터셋에 일치하는 답변이 없다면, 기존처럼 LLM에게 생성을 요청합니다 (Fallback).
    logger.info(f"[채팅] 데이터셋 매칭 실패. LLM을 호출합니다: '{text[:15]}...'")
    llm_reply = await _generate_chat_response(text)
    
    return {
        "success": True,
        "reply": llm_reply
    }

# ── 8. 내부 비동기 LLM 호출 함수들 ─────────────────────────────────────────

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