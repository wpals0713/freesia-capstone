package com.freesia.backend.diary.dto;

public record ChatContextResponseDTO(
        int todayDiaryCount,
        Double latestEmotionScore,
        String latestEmotionCategory
) {
}
