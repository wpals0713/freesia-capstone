package com.freesia.backend.diary.dto;

import lombok.Builder;
import lombok.Data;

/**
 * 오늘 일기 감정 조회 응답 DTO
 */
@Data
@Builder
public class TodayDiaryResponse {
    private boolean hasDiary;
    private String emotion;
    private String date;
}