# --- 1단계: 빌더(Builder) 스테이지 ---
FROM eclipse-temurin:17-jdk AS builder
WORKDIR /build

COPY gradlew .
COPY gradle gradle
COPY build.gradle .
COPY settings.gradle .

RUN chmod +x ./gradlew
RUN ./gradlew dependencies --no-daemon

COPY src src
RUN ./gradlew bootJar -x test --no-daemon

# --- 2단계: 실행(Runtime) 스테이지 ---
FROM eclipse-temurin:17-jre
WORKDIR /app

COPY --from=builder /build/build/libs/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]