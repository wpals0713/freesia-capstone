import requests
import json

# 1. API 설정
api_key = "dcu_llm_5dzomyyp8smxxrufjc9h8aqfbopik47yw2q9ww2cvvwxyjfc" # 예: dcu_llm_... [cite: 14, 15]
url = "https://code.cu.ac.kr/llm/v1/chat/completions" # [cite: 20]

headers = {
    "Authorization": f"Bearer {api_key}", # [cite: 21]
    "Content-Type": "application/json" # [cite: 22]
}

# 2. 전송할 데이터 세팅
data = {
    "model": "Qwen/Qwen3.5-35B-A3B-FP8", # [cite: 23]
    "messages": [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "안녕하세요. 오늘 날씨에 어울리는 일기 주제 하나 추천해줘."}
    ],
    "temperature": 0.7,
    "stream": False # 한 번에 완성된 답변을 받을 때는 False [cite: 23]
}

# 3. API 요청 보내기
response = requests.post(url, headers=headers, json=data)

# 4. 결과 출력
if response.status_code == 200:
    result = response.json()
    # 응답에서 실제 텍스트 내용만 추출
    print(result["choices"][0]["message"]["content"])
else:
    print(f"Error: {response.status_code}", response.text)