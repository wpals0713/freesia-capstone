import joblib
import os
import mlflow
import mlflow.sklearn
from data_loader import load_data
from model import train_model

def main():
    print("1. Loading data...")
    df = load_data()
    
    # 실제 데이터프레임의 컬럼 이름 출력하여 확인
    print("\n[Data Columns]")
    print(df.columns.tolist())
    
    # 텍스트 데이터와 감정 레이블 컬럼 명확하게 지정
    text_col = 'user_text'
    label_col = 'emotion'
    
    # 결측치(None/NaN) 데이터 정제 안전장치
    initial_len = len(df)
    df = df.dropna(subset=[text_col, label_col])
    dropped_len = initial_len - len(df)
    if dropped_len > 0:
        print(f" - [Data Cleaning] Dropped {dropped_len} rows with missing values.")
    
    print(f"\n2. Starting model training...")
    print(f" - Text column: '{text_col}'")
    print(f" - Label column: '{label_col}'")
    
    # MLflow scikit-learn 자동 로깅 활성화
    mlflow.sklearn.autolog()
    
    # MLflow 실행(run) 시작
    with mlflow.start_run():
        # 정제된 데이터프레임과 컬럼명을 train_model에 파라미터로 정확하게 넘겨서 학습 시작
        pipeline = train_model(df=df, text_col=text_col, label_col=label_col)
        
        # 저장할 경로를 현재 파일(main.py) 위치 기준으로 동적 절대 경로 지정
        current_dir = os.path.dirname(os.path.abspath(__file__))
        save_path = os.path.join(current_dir, "emotion_model.pkl")
        
        # 상위 디렉토리가 존재하지 않을 경우를 대비해 생성 보장
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        
        print(f"\n3. Saving model to {save_path}...")
        # joblib을 이용해 학습된 모델 파이프라인 저장
        joblib.dump(pipeline, save_path)
        
        # MLflow 아티팩트로 모델 저장 추가
        print("Saving model to MLflow tracking server...")
        mlflow.sklearn.log_model(pipeline, "emotion_model")
        
        print("\n✅ All processes completed successfully!")

if __name__ == "__main__":
    main()
