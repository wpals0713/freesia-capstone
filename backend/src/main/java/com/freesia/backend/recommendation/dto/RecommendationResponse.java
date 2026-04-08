package com.freesia.backend.recommendation.dto;

import com.freesia.backend.recommendation.entity.Recommendation;
import lombok.Getter;

@Getter
public class RecommendationResponse {

    private final Long id;
    private final String category;
    private final String title;
    private final String description;
    private final String imageUrl;
    private final String contentUrl;

    public RecommendationResponse(Long id, String category, String title, String description, String imageUrl,
            String contentUrl) {
        this.id = id;
        this.category = category;
        this.title = title;
        this.description = description;
        this.imageUrl = imageUrl;
        this.contentUrl = contentUrl;
    }

    /** 엔티티를 DTO 로 변환 */
    public static RecommendationResponse from(Recommendation recommendation) {
        return new RecommendationResponse(
                recommendation.getId(),
                recommendation.getCategory(),
                recommendation.getTitle(),
                recommendation.getDescription(),
                recommendation.getImageUrl(),
                recommendation.getContentUrl());
    }
}