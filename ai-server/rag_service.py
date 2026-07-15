import os
import logging
from datetime import datetime, timedelta
from sentence_transformers import SentenceTransformer
import chromadb

logger = logging.getLogger(__name__)

# ── 1. 벡터 DB(ChromaDB) 초기화 ───────────────────────────────────────────
# 컨테이너 내에서 /app/chroma_data 위치에 데이터를 영구 저장
CHROMA_DATA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chroma_data")
chroma_client = chromadb.PersistentClient(path=CHROMA_DATA_PATH)

# 컬렉션 가져오기 또는 생성 (시계열 일기 저장용)
collection_name = "diary_collection"
diary_collection = chroma_client.get_or_create_collection(name=collection_name)
logger.info(f"[ChromaDB] '{collection_name}' 컬렉션 초기화 완료 (저장 경로: {CHROMA_DATA_PATH})")

# ── 2. 임베딩 모델(Sentence-Transformers) 초기화 ─────────────────────────
# 한국어 의미역 기반 최상위 성능 모델 중 하나인 snunlp SBERT 모델 사용
EMBEDDING_MODEL_NAME = 'snunlp/KR-SBERT-V40K-klueNLI-augSTS'
logger.info(f"[Embedding] 임베딩 모델 로드 중... (최초 실행 시 다운로드 필요): {EMBEDDING_MODEL_NAME}")
try:
    embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
    logger.info("[Embedding] 임베딩 모델 로드 성공!")
except Exception as e:
    logger.error(f"[Embedding] 모델 로드 실패: {e}")
    embedding_model = None

# ── 3. DB 저장 함수 ───────────────────────────────────────────────────────

def save_diary_to_vector_db(diary_id: str, text: str, date: str, emotion_score: float) -> bool:
    """
    일기 텍스트를 벡터로 임베딩한 뒤 ChromaDB에 메타데이터(날짜, 감정점수)와 함께 저장합니다.
    """
    if embedding_model is None:
        logger.error("[RAG] 임베딩 모델이 로드되지 않아 일기를 벡터 DB에 저장할 수 없습니다.")
        return False

    if not text or not str(text).strip():
        logger.warning("[RAG] 빈 텍스트이므로 저장을 생략합니다.")
        return False

    try:
        # 1. 텍스트 임베딩 (벡터 추출)
        vector = embedding_model.encode(text).tolist()

        # 2. ChromaDB 저장
        diary_collection.add(
            documents=[text],
            embeddings=[vector],
            metadatas=[{
                "date": date,
                "emotion_score": float(emotion_score)
            }],
            ids=[str(diary_id)] # 고유 식별자로 diary_id 사용
        )
        
        logger.info(f"[RAG] 일기 벡터 DB 저장 완료! (ID: {diary_id}, 날짜: {date}, 점수: {emotion_score})")
        return True

    except Exception as e:
        logger.error(f"[RAG] 벡터 DB 저장 중 오류 발생: {e}")
        return False

# ── 4. DB 검색 함수 (RAG) ───────────────────────────────────────────────────

def _extract_date_filter(query_text: str) -> str:
    now = datetime.now()
    if "오늘" in query_text:
        return now.strftime("%Y-%m-%d")
    if "어제" in query_text or "엊그제" in query_text:
        return (now - timedelta(days=1)).strftime("%Y-%m-%d")
    if "그저께" in query_text:
        return (now - timedelta(days=2)).strftime("%Y-%m-%d")
    return None

def search_similar_diaries(query_text: str, top_k: int = 3) -> list:
    """
    주어진 텍스트와 유사한 과거 일기를 검색하여 반환합니다.
    """
    if embedding_model is None:
        logger.error("[RAG] 임베딩 모델이 로드되지 않아 검색을 수행할 수 없습니다.")
        return []

    if not query_text or not str(query_text).strip():
        return []

    try:
        # 1. 날짜 메타데이터 필터 분석
        target_date = _extract_date_filter(query_text)
        where_clause = {"date": target_date} if target_date else None

        # 2. 쿼리 텍스트 임베딩
        query_vector = embedding_model.encode(query_text).tolist()

        # 3. ChromaDB 유사도 검색
        if where_clause:
            results = diary_collection.query(
                query_embeddings=[query_vector],
                n_results=top_k,
                where=where_clause
            )
        else:
            results = diary_collection.query(
                query_embeddings=[query_vector],
                n_results=top_k
            )
        
        # 4. 결과 매핑
        similar_diaries = []
        if results and results.get("documents") and len(results["documents"]) > 0:
            docs = results["documents"][0]
            metadatas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(docs)
            
            for doc, meta in zip(docs, metadatas):
                similar_diaries.append({
                    "text": doc,
                    "date": meta.get("date", "Unknown"),
                    "emotion_score": meta.get("emotion_score", 0.0)
                })
                
        # 5. 최신 날짜 우선순위 정렬 (내림차순 정렬)
        similar_diaries.sort(key=lambda x: x["date"], reverse=True)
                
        return similar_diaries

    except Exception as e:
        logger.error(f"[RAG] 벡터 DB 검색 중 오류 발생: {e}")
        return []
