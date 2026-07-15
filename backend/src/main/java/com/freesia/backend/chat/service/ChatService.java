package com.freesia.backend.chat.service;

import com.freesia.backend.chat.dto.ChatRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * Python AI 서버를 호출하여 채팅 응답을 생성하는 서비스.
 * 사용자의 감정 (emotion) 에 따라 동적으로 프롬프트를 생성합니다.
 */
@Slf4j
@Service
public class ChatService {

    private static final String DEFAULT_RESPONSE = "죄송해요, 아직 답변을 준비 중이에요. 😊";

    // 감정별 시스템 프롬프트
    private static final Map<String, String> EMOTION_PROMPTS = new HashMap<>();

    static {
        EMOTION_PROMPTS.put("기쁨", "현재 사용자의 기분은 '기쁨' 상태야. 기쁜 감정을 함께 공유하며, 더 행복해질 수 있는 긍정적인 대화를 나눠줘.");
        EMOTION_PROMPTS.put("즐거움", "현재 사용자의 기분은 '즐거움' 상태야. 즐거운 감정을 함께 나누며, 즐거운 순간을 더 풍성하게 만들어주는 대화를 나눠줘.");
        EMOTION_PROMPTS.put("슬픔", "현재 사용자의 기분은 '슬픔' 상태야. 사용자의 슬픔을 깊이 공감하고, 위로와 지지를 보내주는 따뜻하고 부드러운 말투로 대화해줘.");
        EMOTION_PROMPTS.put("분노", "현재 사용자의 기분은 '분노' 상태야. 사용자의 분노를 인정하고 수용해주며, 감정을 건강하게 표출하고 해소할 수 있도록 도와주는 대화를 나눠줘.");
        EMOTION_PROMPTS.put("중립", "현재 사용자의 기분은 '중립' 상태야. 평온하고 균형 잡힌 대화를 나눠줘.");
        EMOTION_PROMPTS.put("불안", "현재 사용자의 기분은 '불안' 상태야. 사용자의 불안을 이해하고 안심시켜주며, 차분하고 안정적인 대화를 나눠줘.");
    }

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
     * 감정 데이터가 있다면 해당 감정에 맞춘 프롬프트를 적용합니다.
     *
     * @param userMessage 사용자의 메시지
     * @param emotion     사용자의 감정 (선택적)
     * @return AI 의 응답 메시지
     */
    public String chat(String userMessage, String emotion) {
        try {
            // 시스템 프롬프트 생성
            String systemPrompt = buildSystemPrompt(emotion);

            // Python AI 서버의 /api/chat 엔드포인트로 요청
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("text", userMessage);
            requestBody.put("system_prompt", systemPrompt);

            ChatResponse response = webClient.post()
                    .uri("/api/chat")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(ChatResponse.class)
                    .timeout(timeout)
                    .onErrorResume(ex -> {
                        log.error("[AI 서버] 채팅 호출 실패 (기본값 사용). 원인 상세:", ex);
                        return Mono.empty();
                    })
                    .block();

            if (response != null && response.isSuccess() && response.getReply() != null) {
                log.debug("[AI 서버] 채팅 응답 — {}",
                        response.getReply().substring(0, Math.min(30, response.getReply().length())));
                return response.getReply();
            }

        } catch (Exception ex) {
            log.error("[AI 서버] 채팅 예외 발생 (기본값 사용). 원인 상세:", ex);
        }

        return DEFAULT_RESPONSE;
    }

    /**
     * 감정별 시스템 프롬프트를 생성합니다.
     */
    private String buildSystemPrompt(String emotion) {
        String basePrompt = "너는 친절한 다이어리 봇 프리지아야. 사용자와 다정하게 대화해 줘.";

        if (emotion == null || emotion.trim().isEmpty()) {
            return basePrompt;
        }

        String emotionPrompt = EMOTION_PROMPTS.get(emotion);
        if (emotionPrompt != null) {
            return basePrompt + " " + emotionPrompt;
        }

        // 알 수 없는 감정의 경우 기본 프롬프트 사용
        return basePrompt;
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
