package com.freesia.backend.chat.controller;

import com.freesia.backend.chat.service.ChatService;
import com.freesia.backend.global.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 채팅 관련 API 를 제공하는 컨트롤러.
 */
@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    /**
     * 사용자의 채팅 메시지에 대한 AI 응답을 반환합니다.
     *
     * @param request 사용자 메시지
     * @return AI 의 응답 메시지
     */
    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<Map<String, String>>> chat(@RequestBody Map<String, String> request) {
        String userMessage = request.get("message");

        if (userMessage == null || userMessage.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.failure("메시지를 입력해주세요."));
        }

        log.info("[채팅] 사용자 메시지: {}", userMessage);

        String aiResponse = chatService.chat(userMessage);

        log.info("[채팅] AI 응답: {}", aiResponse);

        Map<String, String> response = new HashMap<>();
        response.put("reply", aiResponse);

        return ResponseEntity.ok(ApiResponse.success(response));
    }
}