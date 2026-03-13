# 프리지아(Freesia) - AI 감정 일기 분석 웹 서비스 개발 가이드

## 1. 프로젝트 개요
- **목적:** 사용자가 작성한 일기를 LLM과 RAG 기술로 분석하여 심리 피드백과 맞춤형 콘텐츠를 제공하는 지능형 멘탈 케어 웹 서비스
- **팀명:** 컴공네버다이

## 2. 시스템 아키텍처 및 기술 스택
이 프로젝트는 3개의 주요 계층으로 분리되어 동작합니다.
- **Client Layer (프론트엔드):** React, TypeScript, SPA 기반
- **Main Server (백엔드 WAS):** Java 17+, Spring Boot, JPA (사용자 인증, 일기/게시판 CRUD 관리)
- **AI Server (AI 워커):** Python, FastAPI, LangChain (RAG 구동, 텍스트 임베딩, LLM 통신)
- **Data Layer:** MySQL (정형 데이터), ChromaDB (벡터 데이터)

## 3. 핵심 컴포넌트 구조
- **Auth/Member:** JWT 기반 로그인, 간편 로그인, 내 정보 관리
- **Diary:** 일기 작성/수정/삭제, 날짜별 캘린더 조회
- **Chat:** AI 챗봇과의 채팅방 생성 및 메시지 관리
- **Analysis/Support:** 일기 분석 기반 감정 통계 그래프 제공 및 사용자 문의 관리
- **RAG/Rec:** 감정 기반 콘텐츠(음악, 글귀) 추천 및 피드백(Re-Retrieval) 처리

## 4. 코딩 컨벤션 및 룰
- **Spring Boot:** - Controller, Service, Repository, Entity, DTO 계층을 엄격히 분리한다.
  - API 응답은 일관된 형식(예: ApiResponse 객체)으로 래핑하여 반환한다.
- **FastAPI:**
  - 코드는 PEP 8(snake_case) 스타일을 따른다.
  - Spring Boot WAS의 요청(HTTP/JSON)을 받아 AI 분석 결과를 JSON으로 반환하는 역할에 집중한다.
- **React:**
  - 컴포넌트는 함수형 컴포넌트와 React Hooks를 사용한다.
