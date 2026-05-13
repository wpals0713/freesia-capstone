package com.freesia.backend.diary.dto;

import com.freesia.backend.recommendation.dto.RecommendationResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.Collections;
import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DiaryAnalysisResponse {
    private DiaryResponseDTO diary;
    private List<RecommendationResponse> recommendations;

    public static DiaryAnalysisResponse of(DiaryResponseDTO diary, List<RecommendationResponse> recommendations) {
        return DiaryAnalysisResponse.builder()
                .diary(diary)
                .recommendations(recommendations != null ? recommendations : Collections.emptyList())
                .build();
    }
}