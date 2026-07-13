import joblib
import os

def test_model():
    # 1. 모델 경로를 현재 파일(__file__) 기준으로 안전하게 동적 절대 경로 계산
    current_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(current_dir, "emotion_model.pkl")
    
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found at: {model_path}\nPlease run main.py first to train and save the model.")
        
    # 2. 저장된 파이프라인 모델 로드
    print(f"Loading model from {model_path}...\n")
    pipeline = joblib.load(model_path)
    
    # 3. 테스트할 한글 문장 리스트 정의
    test_sentences = [
        "오늘 날씨도 좋고 기분이 너무 상쾌하다!",
        "아... 프로젝트 에러 때문에 짜증 나고 답답해.",
        "잔잔한 음악 들으면서 조용히 쉬고 싶어."
    ]
    
    # 4. predict() 함수를 사용한 감정 예측
    predictions = pipeline.predict(test_sentences)
    
    # 5. 예측 결과 예쁘게 출력
    print("========== 🧠 모델 감정 예측 테스트 ==========")
    for sentence, prediction in zip(test_sentences, predictions):
        print(f"\"{sentence}\"  ➔  [{prediction}]")
    print("==============================================")

if __name__ == "__main__":
    test_model()
