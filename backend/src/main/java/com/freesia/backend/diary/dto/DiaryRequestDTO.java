package com.freesia.backend.diary.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Getter
@NoArgsConstructor
public class DiaryRequestDTO {

    @NotBlank(message = "일기 내용을 입력해 주세요.")
    private String content;

    private String emoji;

    // 선택적 필드 - 프론트엔드에서 전송하지 않으면 백엔드가 서버 시간으로 자동 설정
    private LocalDate date;
}
