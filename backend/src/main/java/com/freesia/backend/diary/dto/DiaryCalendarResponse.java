package com.freesia.backend.diary.dto;

import java.time.LocalDate;

public record DiaryCalendarResponse(
        Long diaryId,
        LocalDate createdAt,
        String emotion) {
}