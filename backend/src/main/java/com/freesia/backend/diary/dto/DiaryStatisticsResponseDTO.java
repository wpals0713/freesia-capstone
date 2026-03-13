package com.freesia.backend.diary.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.Map;

@Getter
@Builder
public class DiaryStatisticsResponseDTO {

    private int year;
    private int month;
    private int totalCount;
    private Map<String, Long> emotionCounts;
    private Double averageSentimentScore;
}
