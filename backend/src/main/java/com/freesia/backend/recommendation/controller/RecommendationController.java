package com.freesia.backend.recommendation.controller;

import com.freesia.backend.recommendation.dto.RecommendationResponse;
import com.freesia.backend.recommendation.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    /**
     * 특정 감정에 맞는 추천 콘텐츠를 조회합니다.
     *
     * @param emotion 감정 카테고리 (예: "기쁨", "슬픔", "분노" 등)
     * @return 추천 콘텐츠 리스트
     */
    @GetMapping
    public ResponseEntity<List<RecommendationResponse>> getRecommendationsByEmotion(@RequestParam String emotion) {
        List<RecommendationResponse> recommendations = recommendationService.getRecommendationsByEmotion(emotion);
        return ResponseEntity.ok(recommendations);
    }
}