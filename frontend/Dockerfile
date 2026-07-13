# 1단계: 빌더(Builder) 스테이지
FROM node:20-alpine AS builder

WORKDIR /app

# 패키지 의존성 파일 복사 (캐시 활용을 위해 먼저 복사)
COPY package*.json ./

# 의존성 설치
RUN npm install

# 소스 코드 전체 복사
COPY . .

# 프로덕션 빌드 (dist 폴더 생성)
RUN npm run build

# 2단계: 실행(Runtime) 스테이지
FROM nginx:alpine

# 1단계에서 빌드된 결과물(dist)을 Nginx의 기본 웹 서빙 경로로 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA 라우팅을 위한 커스텀 Nginx 설정 파일 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 80 포트 개방
EXPOSE 80

# Nginx 포그라운드 실행
CMD ["nginx", "-g", "daemon off;"]
