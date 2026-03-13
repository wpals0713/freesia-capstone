# 🌸 프리지아 (Freesia) : AI 기반 감정 분석 다이어리

> **"당신의 하루를 읽고, 마음을 알아주는 단 하나의 일기장"**
> 대구가톨릭대학교 캡스톤 디자인 프로젝트

## 📢 프로젝트 소개
**프리지아(Freesia)**는 사용자가 작성한 일기의 문맥을 AI가 분석하여 5가지 감정(기쁨, 슬픔, 분노, 불안, 중립)으로 분류하고, 이를 시각적인 통계와 달력으로 제공하는 **마이크로서비스 아키텍처(MSA) 기반 웹 애플리케이션**입니다. 더 나아가 교내 LLM(대규모 언어 모델)을 활용하여 사용자의 감정에 공감하고 일기 주제를 추천하는 상호작용 기능을 제공합니다.

## 🛠 기술 스택 (Tech Stack)
### Frontend
* **React (TypeScript)** / Vite / Tailwind CSS
* 상태 관리 및 UI 컴포넌트 최적화 (`date-fns` 활용한 커스텀 캘린더)

### Backend (API Server)
* **Spring Boot 3.x** (Java) / Spring WebFlux (비동기 통신)
* JPA / MySQL (또는 H2)

### AI Server & LLM
* **Python / Flask**
* **Qwen3.5-35B (대구가톨릭대 교내 LLM API)**: 자연어 텍스트 생성 및 감정 분석 전담

## ⚙️ 시스템 아키텍처 (Architecture)
* 프론트엔드, 백엔드, AI 분석 서버를 완전히 분리하여 **확장성(Scalability)**과 **유지보수성**을 극대화했습니다.
* Spring Boot의 `WebClient`를 활용하여 Python AI 서버 및 외부 LLM API와 비동기 통신을 수행하며, 서버 장애 시 서비스가 중단되지 않도록 **Fallback(기본값 반환) 예외 처리**를 구현했습니다.

## 💡 주요 기능 (Core Features)
1. **AI 감정 분석 (Emotion Analysis):** 일기 작성 시 문맥을 파악하여 감정 배지 및 확신도 점수 부여.
2. **AI 위로 답장:** 일기 내용에 공감하고 위로를 건네는 따뜻한 코멘트 제공.
3. **감정 달력 (Emotion Calendar):** 한 달 치 감정 흐름을 직관적으로 보여주는 커스텀 달력 뷰.
4. **통계 대시보드:** 누적된 감정 데이터를 시각화.
