package com.freesia.backend.diary.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Getter
@NoArgsConstructor
public class DiaryRequestDTO {

    @NotBlank(message = "일기 내용을 입력해 주세요.")
    private String content;

    private String emoji;

    @NotNull(message = "일기 날짜를 입력해 주세요.")
    private LocalDate date;
}
