package com.freesia.backend.diary.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Map;

/**
 * Python AI 서버(http://localhost:5000)를 호출하여 감정을 분석하는 서비스.
 * 서버가 응답하지 않거나 오류가 발생하면 기본값(중립 / 0.0)을 반환합니다.
 */
@Slf4j
@Service
public class AiSentimentService implements SentimentService {

    private static final String DEFAULT_EMOTION = "중립";
    private static final double DEFAULT_SCORE   = 0.0;

    private final WebClient webClient;
    private final Duration  timeout;

    public AiSentimentService(
            @Value("${ai.server.url}") String aiServerUrl,
            @Value("${ai.server.timeout-ms:5000}") long timeoutMs) {

        this.webClient = WebClient.builder()
                .baseUrl(aiServerUrl)
                .build();
        this.timeout = Duration.ofMillis(timeoutMs);
    }

    @Override
    public SentimentResult analyze(String content) {
        try {
            AiAnalyzeResponse response = webClient.post()
                    .uri("/api/analyze")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(Map.of("text", content))
                    .retrieve()
                    .bodyToMono(AiAnalyzeResponse.class)
                    .timeout(timeout)
                    .onErrorResume(ex -> {
                        log.warn("[AI서버] 호출 실패 (기본값 사용): {}", ex.getMessage());
                        return Mono.empty();
                    })
                    .block();

            if (response != null && response.isSuccess()
                    && response.getEmotion() != null
                    && response.getSentimentScore() != null) {
                log.debug("[AI서버] 분석 결과 — emotion={}, score={}, comment={}",
                        response.getEmotion(), response.getSentimentScore(),
                        response.getAiComment() != null ? response.getAiComment().substring(0, Math.min(20, response.getAiComment().length())) : "");
                return new SentimentResult(
                        response.getEmotion(),
                        response.getSentimentScore(),
                        response.getAiComment()
                );
            }

        } catch (Exception ex) {
            log.warn("[AI서버] 감정 분석 예외 (기본값 사용): {}", ex.getMessage());
        }

        return new SentimentResult(DEFAULT_EMOTION, DEFAULT_SCORE, null);
    }

    // ── AI 서버 응답 DTO ───────────────────────────────────────────────────────

    @Getter
    @Setter
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class AiAnalyzeResponse {
        private boolean success;
        private String  emotion;
        private Double  sentimentScore;
        private String  aiComment;
    }
}
