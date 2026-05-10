package com.freesia.backend.chat.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Map;

/**
 * Python AI 서버를 호출하여 채팅 응답을 생성하는 서비스.
 */
@Slf4j
@Service
public class ChatService {

    private static final String DEFAULT_RESPONSE = "죄송해요, 아직 답변을 준비 중이에요. 😊";

    private final WebClient webClient;
    private final Duration timeout;

    public ChatService(
            @Value("${ai.server.url}") String aiServerUrl,
            @Value("${ai.server.timeout-ms:5000}") long timeoutMs) {

        this.webClient = WebClient.builder()
                .baseUrl(aiServerUrl)
                .build();
        this.timeout = Duration.ofMillis(timeoutMs);
    }

    /**
     * 사용자의 채팅 메시지에 대한 AI 응답을 생성합니다.
     * 프리지아 다이어리 봇 페르소나를 적용하여 친근하게 답변합니다.
     *
     * @param userMessage 사용자의 메시지
     * @return AI 의 응답 메시지
     */
    public String chat(String userMessage) {
        try {
            // Python AI 서버의 /api/chat 엔드포인트로 요청
            // Python 서버에서 프리지아 페르소나가 적용된 프롬프트를 처리합니다.
            ChatResponse response = webClient.post()
                    .uri("/api/chat")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(Map.of("text", userMessage))
                    .retrieve()
                    .bodyToMono(ChatResponse.class)
                    .timeout(timeout)
                    .onErrorResume(ex -> {
                        log.warn("[AI 서버] 채팅 호출 실패 (기본값 사용): {}", ex.getMessage());
                        return Mono.empty();
                    })
                    .block();

            if (response != null && response.isSuccess() && response.getReply() != null) {
                log.debug("[AI 서버] 채팅 응답 — {}",
                        response.getReply().substring(0, Math.min(30, response.getReply().length())));
                return response.getReply();
            }

        } catch (Exception ex) {
            log.warn("[AI 서버] 채팅 예외 (기본값 사용): {}", ex.getMessage());
        }

        return DEFAULT_RESPONSE;
    }

    // ── AI 서버 응답 DTO ───────────────────────────────────────────────────────

    private static class ChatResponse {
        private boolean success;
        private String reply;

        public boolean isSuccess() {
            return success;
        }

        public String getReply() {
            return reply;
        }
    }
}