package com.freesia.backend.recommendation.service;

import com.freesia.backend.recommendation.dto.RecommendationResponse;
import com.freesia.backend.recommendation.entity.Recommendation;
import com.freesia.backend.recommendation.repository.RecommendationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final RecommendationRepository recommendationRepository;
    private final Random random = new Random();

    /**
     * 특정 감정에 맞는 추천 콘텐츠를 조회합니다.
     * 각 카테고리 (MUSIC, MOVIE, BOOK, ACTIVITY, HOBBY) 마다 1 개씩 랜덤으로 선택합니다.
     *
     * @param emotion 감정 카테고리 (예: "기쁨", "슬픔", "분노" 등)
     * @return 추천 콘텐츠 리스트 (카테고리별 1 개씩)
     */
    public List<RecommendationResponse> getRecommendationsByEmotion(String emotion) {
        // 1. 해당 감정의 모든 데이터를 조회
        List<Recommendation> allRecommendations = recommendationRepository.findByEmotion(emotion);

        // 2. 카테고리별로 그룹화
        Map<String, List<Recommendation>> groupedByCategory = allRecommendations.stream()
                .collect(Collectors.groupingBy(Recommendation::getCategory));

        // 3. 각 카테고리에서 랜덤으로 1 개 선택
        List<RecommendationResponse> randomRecommendations = new ArrayList<>();
        for (List<Recommendation> categoryList : groupedByCategory.values()) {
            if (!categoryList.isEmpty()) {
                int randomIndex = random.nextInt(categoryList.size());
                Recommendation randomRecommendation = categoryList.get(randomIndex);
                randomRecommendations.add(RecommendationResponse.from(randomRecommendation));
            }
        }

        return randomRecommendations;
    }
}
