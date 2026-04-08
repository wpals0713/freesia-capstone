package com.freesia.backend.recommendation.service;

import com.freesia.backend.recommendation.dto.RecommendationResponse;
import com.freesia.backend.recommendation.entity.Recommendation;
import com.freesia.backend.recommendation.repository.RecommendationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final RecommendationRepository recommendationRepository;

    /**
     * 특정 감정에 맞는 추천 콘텐츠를 조회합니다.
     *
     * @param emotion 감정 카테고리 (예: "기쁨", "슬픔", "분노" 등)
     * @return 추천 콘텐츠 리스트
     */
    public List<RecommendationResponse> getRecommendationsByEmotion(String emotion) {
        return recommendationRepository.findByEmotion(emotion)
                .stream()
                .map(RecommendationResponse::from)
                .toList();
    }
}