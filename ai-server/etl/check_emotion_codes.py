"""
감정 코드 목록과 샘플 문장을 확인하는 스크립트
"""

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, regexp_extract, first, lit

# SparkSession 생성
spark = SparkSession.builder \
    .appName("EmotionCodeChecker") \
    .getOrCreate()

# JSON 파일 로드
input_path = "data/raw/감성대화말뭉치(최종데이터)_Training.json"
df = spark.read.json(input_path)

# profile.emotion.type 에서 감정 코드 추출 (문자열에서 E 로 시작하는 코드)
# 예: "E18" -> "E18"
emotion_codes_df = df.select(
    regexp_extract(col("profile.emotion.type"), r'E\d+', 0).alias("emotion_code"),
    col("talk.content.HS01").alias("hs01")
).filter(col("emotion_code") != "")

# 고유한 감정 코드 목록
unique_codes = emotion_codes_df.select("emotion_code").distinct().orderBy("emotion_code").collect()

print("="*100)
print("감정 코드 목록 (총 {}개):".format(len(unique_codes)))
print("="*100)

# 각 감정 코드에 대한 샘플 문장
for row in unique_codes:
    code = row["emotion_code"]
    if code:
        # 해당 감정 코드를 가진 첫 번째 문장 샘플
        sample = emotion_codes_df.filter(col("emotion_code") == code) \
                   .select(col("hs01")) \
                   .first()
        
        hs01_text = sample["hs01"] if sample and sample["hs01"] else "없음"
        
        # 문장이 길면 잘라서 표시
        if len(hs01_text) > 60:
            hs01_text = hs01_text[:60] + "..."
        
        print(f"[{code}] - {hs01_text}")

spark.stop()