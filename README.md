🌼 Freesia (프리지아): 내 마음을 알아주는 AI 감정 일기장
"당신의 하루에 피어나는 따뜻한 위로, AI 기반 감정 분석 및 다이어리 서비스"
개발 기간: 2026.03 ~ 2026.06 (캡스톤 프로젝트 진행 중)
역할: Full-Stack 개발 및 AI 아키텍처 설계 (프론트엔드 UI/UX 구현, 백엔드 API 연동)

1. 💡 프로젝트 기획 배경 및 목표
기획 의도: 바쁘고 지친 현대인들이 일기를 쓰며 하루를 돌아볼 때, 프리지아 꽃의 꽃말인 '당신의 시작을 응원합니다'처럼 따뜻한 색감과 AI의 객관적이면서도 다정한 감정 분석을 통해 심리적 안정감을 제공하고자 기획했습니다.

핵심 목표: 1. 맞춤형 AI 모델 연동: Qwen 3.5 모델을 활용한 텍스트 감정 추출 및 공감 피드백 생성
2. 직관적인 감정 시각화: 사용자의 감정 변화(😊, 😢, 😡, 😰, 😐)를 한눈에 볼 수 있는 인터랙티브 감정 달력(Emotion Calendar) 구현
3. 효율적인 마이크로서비스(MSA) 지향 구조: 비즈니스 로직(Spring Boot)과 AI 추론 로직(Python Flask)의 서버 분리

2. 🛠 기술 스택 (Tech Stack)
Frontend: React, TypeScript, Vite, Tailwind CSS

Backend: Java, Spring Boot

AI Server: Python, Flask

Database: [사용 중인 DB 입력, 예: MySQL / PostgreSQL]

AI Model: Qwen/Qwen3.5-35B-A3B-FP8 (LLM API 연동)

Tools / AI-Assisted Dev: Git, GitHub, VS Code, LLM 기반 바이브 코딩(Vibe Coding) 방법론 적용

3. 🏗 시스템 아키텍처 및 DB 설계
(여기에 draw.io나 ERDCloud로 그린 이미지 링크를 삽입하세요)

System Architecture: Client(React) ↔ Main API Server(Spring Boot: 8080) ↔ AI Server(Flask: 5000) ↔ LLM (Qwen 3.5 API)

ERD (Entity-Relationship Diagram):

Member (사용자 계정 및 닉네임 정보)

Diary (작성 날짜, 일기 원문 텍스트)

Emotion (일기와 매핑된 AI 분석 감정 데이터 및 사용자가 캘린더에서 직접 선택한 감정)

💡 프론트엔드와 백엔드 간 JWT(JSON Web Token)를 활용하여 안전하게 내 정보(Profile)를 관리하도록 설계했습니다.

4. ✨ 핵심 기능 (Key Features)
인터랙티브 감정 달력 (Emotion Calendar): Tailwind CSS의 애니메이션(scale-105, 페이드인)을 적용하여, 날짜 클릭 시 부드러운 모달창과 함께 5가지 감정 이모지를 선택하고 시각화할 수 있는 UI 구현.

AI 감정 분석 일기장: 일기 작성 시 AI가 문맥을 파악하여 주요 감정을 도출하고 위로의 메시지를 반환.

사용자 친화적 감성 UI/UX: '노란색 프리지아' 테마를 일관되게 적용하여 긍정적이고 따뜻한 사용자 경험(UX) 제공 및 사이드바(Sidebar) 기반의 매끄러운 SPA(Single Page Application) 라우팅 처리.

5. 🔥 트러블 슈팅 (Troubleshooting) - AI 보조 개발 과정의 한계 돌파
(단순한 코드 에러가 아닌, 최신 AI 개발 도구를 활용하며 겪은 아키텍처적 고민을 담았습니다)

[Issue 1] LLM 컨텍스트 윈도우(Token Limit) 초과로 인한 AI 에이전트 400 Bad Request 발생

문제 상황: 프론트엔드 자동화 개발 도구(Cline)가 프로젝트의 전체 코드 베이스를 읽고 구조를 파악하는 과정에서, 학교에서 제공하는 Qwen 모델의 단기 기억력 한계(8,192 Token)를 초과하여 서버가 요청을 거부(400 Error)하는 병목 현상 발생.

원인 분석: 에이전트가 코드를 직접 수정하기 위해 Act 모드로 진입할 때 너무 많은 컨텍스트(파일 정보)를 한 번에 API로 전송하려 한 것이 원인.

해결 방안 및 결과: - 개발 방법론을 **'바이브 코딩(Vibe Coding)'**으로 전환.

거시적인 UI 뼈대(감정 달력, 내 정보 화면) 생성은 더 큰 컨텍스트 윈도우를 가진 LLM을 활용하여 텍스트로 코드를 산출받아 수동 적용.

로컬 AI 에이전트(Cline)에게는 App.tsx 라우팅 수정 등 '단일 파일 단위의 명확하고 좁은 범위의 프롬프트'만 제공하도록 역할을 분리하여 토큰 한계를 극복하고 개발 속도를 300% 이상 향상시킴.

[Issue 2] SPA 라우팅 간 레이아웃 렌더링 누락 및 포트 충돌(Port Collision) 문제

문제 상황: 기존 5173 포트가 점유된 상태에서 새 서버를 열어 5174 포트로 밀려나는 현상 및, /calendar나 /profile 경로 이동 시 사이드바 네비게이션이 사라지거나 하얀 빈 화면(White Screen)이 렌더링되는 문제 발생.

해결 방안:

React Router의 <Routes> 구조를 재설계. 각 페이지 컴포넌트(HomePage.tsx, EmotionCalendar.tsx 등) 최상단에 <Sidebar />를 포함하는 공통 Flex 레이아웃 래퍼(Wrapper)를 구축하여 컴포넌트 재사용성을 높임.

로그인된 사용자만 접근할 수 있도록 <PrivateRoute> 로직을 달력 컴포넌트에 적용하여 보안성과 데이터 무결성을 확보함.

6. 🚀 향후 개선 목표 (Future Works)
현재 프론트엔드 단에 구현된 감정 달력(Mock Data 기반)을 Spring Boot 백엔드 DB와 연동하여 실제 데이터 영속성(Persistence) 확보

GitHub의 feature 단위 브랜치 전략을 통해 팀원들과의 비동기적 협업 파이프라인(CI/CD) 구축 고도화 예정
