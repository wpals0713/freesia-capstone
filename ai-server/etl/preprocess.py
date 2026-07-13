"""
PySpark 기반 데이터 전처리 파이프라인

감성대화말뭉치 Training.json 파일을 읽어와서
- 사용자 문장과 시스템 응답을 분리
- 감정 코드를 5 대 감정으로 변환
- 데이터 정제
- Parquet 형식으로 저장

사용법:
    python ai-server/etl/preprocess.py
"""

from pyspark.sql import SparkSession
from pyspark.sql.functions import (
    col,
    concat_ws,
    udf,
    lit,
    when,
    trim,
    size,
    explode
)
from pyspark.sql.types import StringType
import os


def create_spark_session(app_name: str = "EmotionDataPreprocessing") -> SparkSession:
    """
    PySpark SparkSession 을 생성합니다.
    
    Args:
        app_name: Spark 애플리케이션 이름
        
    Returns:
        구성된 SparkSession 객체
    """
    # SparkSession.builder 를 사용하여 SparkSession 생성
    spark = SparkSession.builder \
        .appName(app_name) \
        .config("spark.driver.memory", "4g") \
        .config("spark.executor.memory", "2g") \
        .config("spark.sql.shuffle.partitions", "4") \
        .getOrCreate()
    
    return spark


def convert_emotion_code(emotion_code: str) -> str:
    """
    감정 코드를 5 대 감정 (분노, 불안, 슬픔, 기쁨, 중립) 으로 변환하는 UDF 함수입니다.
    
    감정 코드 분류:
        - E10~E14: 슬픔 (우울, 걱정, 좌절 등)
        - E15~E19: 분노 (화남, 짜증, 배신감 등)
        - E20~E29: 슬픔 (실망, 좌절, 절망 등)
        - E30~E35: 불안 (두려움, 초조, 걱정 등)
        - E36~E39: 슬픔 (혼란, 방황, 외로움 등)
        - E40~E49: 슬픔 (우울, 질투, 부러움 등)
        - E50~E59: 불안 (당황, 죄책감, 걱정 등)
        - E60~E61: 기쁨 (행복, 기쁨, 만족 등)
        - E62~E69: 중립/기쁨 (평온, 기대, 신남 등)
    
    Args:
        emotion_code: 감정 코드 (예: 'E18', 'E35' 등)
        
    Returns:
        5 대 감정 중 하나 (분노, 불안, 슬픔, 기쁨, 중립)
    """
    # 감정 코드 매핑 딕셔너리
    # 데이터 분석 결과에 기반한 매핑
    emotion_mapping = {
        # === 분노 (Anger) ===
        'E15': '분노',    # "날 면접에서 떨어뜨린 회사에서 만드는 물건은 사지도 않을 거야. 정말 화가 나."
        'E17': '분노',    # "여자친구가 다른 남자와 키스하는 장면을 목격했어. 배신감 느껴."
        'E18': '분노',    # "이번 달에 또 급여가 깎였어! 물가는 오르는데 월급만 자꾸 깎이니까 너무 화가 나."
        'E19': '분노',    # "요즘 직장에서 너무 성가신 일이 많아서 스트레스를 많이 받고 있어."
        'E46': '분노',    # "사이가 나빠진 친구들이 있어서 화해를 중재했어..."
        'E47': '분노',    # "나는 상사가 하라고 해서 했는데 인제 와서 나보고 한 게 뭐냐고 그러는 거야."
        
        # === 불안 (Anxiety) ===
        'E16': '불안',    # "취업하고 싶은 회사가 있는데 사원모집 공고가 빨리 안 나네. 마음이 너무 조급해."
        'E30': '불안',    # "이제 주변 친구들은 하나둘씩 다 취업에 성공하는데 아직 나만 못해서 불안해."
        'E31': '불안',    # "나를 괴롭혔던 친구에게서 연락이 와서 너무 두려워."
        'E32': '불안',    # "난 정말이지 언제쯤 든든한 직장을 가질 수가 있을까."
        'E33': '불안',    # "나는 너무 긴장을 잘하는 것 같아. 이번 면접에서도 떨었어."
        'E35': '불안',    # "면접에서 부모님 직업에 대한 질문이 들어왔어."
        'E36': '불안',    # "계속해서 이 직장에 다니는 게 맞는지 잘 모르겠어."
        'E37': '불안',    # "졸업반이라서 취업을 생각해야 하는데 지금 너무 느긋해서 이래도 되나 싶어."
        'E38': '불안',    # "졸업이 얼마 남지 않았는데 어떤 일을 해야 할지 모르겠어."
        'E50': '불안',    # "길을 가다가 우연히 마주친 동네 아주머니께서 취업했냐고 물어보셔서 당황했어."
        'E52': '불안',    # "결혼할 예식장이 근사하지 않은 것 같아서 걱정이야."
        'E57': '불안',    # "결혼이 코앞인데 아직 확신이 들지 않아."
        
        # === 슬픔 (Sadness) ===
        'E10': '슬픔',    # "요즘 청년 실업률이 너무 심각한 거 같아..."
        'E11': '슬픔',    # "결혼한 지 얼마 안 된 신혼이야. 그런데 아내가 내 배만 보면 한숨만 푹푹 쉬어."
        'E12': '슬픔',    # "걱정이야. 이러다가는 평생 연애만 하고 결혼은 못 할 거 같아."
        'E13': '슬픔',    # "내 주위에는 왜 도움이 안되는 사람들만 잔뜩 있지?"
        'E14': '슬픔',    # "나는 항상 왜 이러지?"
        'E20': '슬픔',    # "취업해야 하는데 요즘 구직 자리가 많이 없어서 너무 슬퍼."
        'E21': '슬픔',    # "얼마 전에 봤던 면접에서 떨어져서 너무 실망스러운 마음이 들어."
        'E22': '슬픔',    # "직장 생활 육 개월 차인데 아직도 적응하기가 힘들어."
        'E23': '슬픔',    # "결혼 삼 년 차인데 아내가 매일같이 잔소리만 해."
        'E24': '슬픔',    # "간절한 마음으로 열심히 취업에 준비 중인데 갑자기 힘이 빠지네."
        'E25': '슬픔',    # "코로나 때문에 뭘 할 수가 없어..."
        'E26': '슬픔',    # "대학 졸업 후 공무원 시험 준비만 오 년이야."
        'E27': '슬픔',    # "나에게 춤을 가르쳐 주던 선생님이 이제 새로운 출발을 하겠다며 학원을 떠났어."
        'E28': '슬픔',    # "내가 주도했던 프로젝트가 채택이 안 되었어."
        'E29': '슬픔',    # "또 떨어졌어. 취업이 너무 힘들어."
        'E34': '슬픔',    # "오 년 동안 공무원 준비를 하고 마지막이라고 생각하고 시험을 봤는데 떨어졌어."
        'E39': '슬픔',    # "군대를 다녀오고 복학하니 대학교에 아는 사람이 없어."
        'E40': '슬픔',    # "나 너무 우울해. 회사에서 큰 실수를 했어."
        'E41': '슬픔',    # "나랑 이십년지기 친구가 나보다 다른 친구를 더 좋아하는 것 같아 질투나."
        'E43': '슬픔',    # "나 빼고 전부 결혼했어. 모임에 나갔더니 나만 혼자야."
        'E44': '슬픔',    # "기업 열 군데에 원서를 넣었는데 모두 불합격이래. 충격적이야"
        'E45': '슬픔',    # "나는 학자금 대출을 갚기 위해 일하고 있는데..."
        'E48': '슬픔',    # "여자친구가 선물로 너무 큰 선물을 원해."
        'E49': '슬픔',    # "우리 부모님은 나를 버린 거나 다름없어."
        'E51': '슬픔',    # "같이 일하던 사람이 나 때문에 혼났는데 사과를 못 해서 어색한 사이가 됐어."
        'E53': '슬픔',    # "요새 회사 끝나고 오면 피곤해서 친구도 보기 귀찮고..."
        'E54': '슬픔',    # "내 친구가 이번에 나보다 먼저 회사에 취직했어..."
        'E55': '슬픔',    # "공무원 시험 준비를 너무 오래 하고 있어."
        'E56': '슬픔',    # "이번에 중소기업에 취업하게 되었어. 친구들에게 말하기가 조금 부끄러워."
        'E58': '슬픔',    # "결혼하고 아이가 생기면 좋을 줄 알았는데 그런 건 아무것도 없었어."
        'E59': '슬픔',    # "교회 친구가 갑자기 절을 가자고 해."
        
        # === 기쁨 (Joy) ===
        'E60': '기쁨',    # "결혼한 지 삼 년 만에 아이를 낳았어. 진짜 기뻐."
        'E61': '기쁨',    # "아내가 출산을 무사히 해줘서 기분이 좋아."
        'E67': '기쁨',    # "나 드디어 원하는 회사에 취업했어!"
        'E68': '기쁨',    # "직장 상사로부터 칭찬을 받았는데 너무 신이 나!"
        
        # === 중립 (Neutral) ===
        'E62': '중립',    # "오늘 입사 면접을 봤어."
        'E63': '중립',    # "나는 요즘 대인관계가 편안해."
        'E64': '중립',    # "우리 회사는 정말 사내 분위기가 좋아."
        'E65': '중립',    # "그녀가 나에게 사귀자고 고백했어. 나도 원하고 있었는데 지금 기분이 너무 좋아."
        'E66': '중립',    # "퇴사한 지 얼마 안 됐지만 천천히 직장을 구해보려고."
        'E69': '중립',    # "나 오늘 네이버 인턴 면접 봤는데 내가 봐도 잘 본 것 같아."
    }
    
    # 매핑된 값이 있으면 반환, 없으면 '기타' 반환
    return emotion_mapping.get(emotion_code, '기타')


def create_emotion_udf() -> udf:
    """
    감정 코드 변환 UDF 를 생성합니다.
    
    Returns:
        PySpark UDF 객체
    """
    emotion_udf = udf(convert_emotion_code, StringType())
    return emotion_udf


def load_json_data(spark: SparkSession, file_path: str):
    """
    JSON 파일을 Spark DataFrame 으로 로드합니다.
    
    Args:
        spark: SparkSession 객체
        file_path: JSON 파일 경로
        
    Returns:
        로드된 Spark DataFrame
    """
    # Spark 의 read.json() 메서드를 사용하여 JSON 파일 로드
    df = spark.read.json(file_path)
    return df


def extract_user_text(df):
    """
    사람의 문장 (talk.content.HS01, HS02, HS03) 을 합쳐서 user_text 컬럼을 생성합니다.
    
    Args:
        df: 입력 Spark DataFrame
        
    Returns:
        user_text 컬럼이 추가된 DataFrame
    """
    # talk.content.HS01, HS02, HS03 필드를 추출
    hs01 = col("talk.content.HS01")
    hs02 = col("talk.content.HS02")
    hs03 = col("talk.content.HS03")
    
    # concat_ws 를 사용하여 세 필드를 공백으로 연결
    # null 값은 자동으로 무시됨
    user_text = concat_ws(" ", hs01, hs02, hs03)
    
    # 새 컬럼 추가
    df = df.withColumn("user_text", user_text)
    
    return df


def extract_system_reply(df):
    """
    시스템 응답 문장 (SS01, SS02, SS03) 을 합쳐서 system_reply 컬럼을 생성합니다.
    
    Args:
        df: 입력 Spark DataFrame
        
    Returns:
        system_reply 컬럼이 추가된 DataFrame
    """
    # talk.content.SS01, SS02, SS03 필드를 추출
    ss01 = col("talk.content.SS01")
    ss02 = col("talk.content.SS02")
    ss03 = col("talk.content.SS03")
    
    # concat_ws 를 사용하여 세 필드를 공백으로 연결
    system_reply = concat_ws(" ", ss01, ss02, ss03)
    
    # 새 컬럼 추가
    df = df.withColumn("system_reply", system_reply)
    
    return df


def add_emotion_column(df, emotion_udf):
    """
    감정 코드 (profile.emotion.type) 를 5 대 감정으로 변환하여 emotion 컬럼을 생성합니다.
    
    Args:
        df: 입력 Spark DataFrame
        emotion_udf: 감정 코드 변환 UDF
        
    Returns:
        emotion 컬럼이 추가된 DataFrame
    """
    # profile.emotion.type 필드를 emotion_code 로 추출
    emotion_code = col("profile.emotion.type")
    
    # UDF 를 적용하여 5 대 감정으로 변환
    emotion = emotion_udf(emotion_code)
    
    # 새 컬럼 추가
    df = df.withColumn("emotion", emotion)
    
    return df


def clean_data(df):
    """
    null 값과 빈 문자열을 제거하는 데이터 정제 로직을 적용합니다.
    
    Args:
        df: 입력 Spark DataFrame
        
    Returns:
        정제된 DataFrame
    """
    # 1. user_text 컬럼의 null 값과 빈 문자열 제거
    # trim() 으로 공백 제거 후, null 이 아니고 빈 문자열도 아닌 행만 필터링
    df = df.filter(
        (col("user_text").isNotNull()) & 
        (trim(col("user_text")) != "")
    )
    
    # 2. system_reply 컬럼의 null 값과 빈 문자열 제거
    df = df.filter(
        (col("system_reply").isNotNull()) & 
        (trim(col("system_reply")) != "")
    )
    
    # 3. emotion 컬럼의 null 값 제거
    df = df.filter(col("emotion").isNotNull())
    
    return df


def save_to_parquet(df, output_path: str):
    """
    DataFrame 을 Parquet 형식으로 저장합니다.
    
    Args:
        df: 저장할 Spark DataFrame
        output_path: 저장할 Parquet 파일 경로
    """
    # Parquet 형식으로 저장
    # mode("overwrite") 는 기존 파일이 있으면 덮어씀
    df.write.mode("overwrite").parquet(output_path)
    
    print(f"데이터가 {output_path} 경로에 Parquet 형식으로 저장되었습니다.")


def main():
    """
    메인 함수: 전체 ETL 파이프라인을 실행합니다.
    """
    # 1. SparkSession 생성
    print("SparkSession 을 생성합니다...")
    spark = create_spark_session()
    
    try:
        # 2. 파일 경로 설정
        # 현재 디렉토리 기준 data/raw/감성대화말뭉치 (최종데이터)_Training.json 경로
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        input_path = os.path.join(base_dir, "data", "raw", "감성대화말뭉치(최종데이터)_Training.json")
        output_path = os.path.join(base_dir, "data", "processed", "training_data.parquet")
        
        print(f"입력 파일 경로: {input_path}")
        print(f"출력 파일 경로: {output_path}")
        
        # 3. JSON 파일 로드
        print("JSON 파일을 로드합니다...")
        df = load_json_data(spark, input_path)
        print(f"로드된 레코드 수: {df.count()}")
        
        # 4. 사용자 텍스트 추출 (HS01, HS02, HS03)
        print("사용자 텍스트를 추출합니다...")
        df = extract_user_text(df)
        
        # 5. 시스템 응답 추출 (SS01, SS02, SS03)
        print("시스템 응답을 추출합니다...")
        df = extract_system_reply(df)
        
        # 6. 감정 UDF 생성 및 적용
        print("감정 코드를 변환합니다...")
        emotion_udf = create_emotion_udf()
        df = add_emotion_column(df, emotion_udf)
        
        # 7. 데이터 정제 (null 및 빈 문자열 제거)
        print("데이터를 정제합니다...")
        df = clean_data(df)
        print(f"정제 후 레코드 수: {df.count()}")
        
        # 8. processed 디렉토리 생성 (없을 경우)
        processed_dir = os.path.dirname(output_path)
        if not os.path.exists(processed_dir):
            os.makedirs(processed_dir)
            print(f"디렉토리를 생성했습니다: {processed_dir}")
        
        # 9. Parquet 형식으로 저장
        print("Parquet 형식으로 저장합니다...")
        save_to_parquet(df, output_path)
        
        # 10. 결과 확인 (첫 5 행 표시)
        print("\n저장된 데이터의 첫 5 행:")
        df.show(5, truncate=False)
        
    finally:
        # SparkSession 종료
        spark.stop()
        print("\nSparkSession 을 종료합니다.")


if __name__ == "__main__":
    main()