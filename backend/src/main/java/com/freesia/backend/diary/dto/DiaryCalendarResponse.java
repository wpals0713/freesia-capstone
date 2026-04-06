package com.freesia.backend.diary.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor // 🌟 핵심 1: DB에서 꺼낸 데이터를 담을 수 있게 생성자를 자동 생성합니다.
public class DiaryCalendarResponse {

    private Long diaryId;

    // 🌟 핵심 2: 에러 로그에서 뱉은 타입(LocalDateTime)과 똑같이 맞춰줍니다.
    // 🌟 핵심 3: 프론트엔드가 '2026-04-04' 형태로 쉽게 비교할 수 있도록 변환(Format)해서 보내줍니다!
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd", timezone = "Asia/Seoul")
    private LocalDateTime createdAt;

    private String emotion;
}