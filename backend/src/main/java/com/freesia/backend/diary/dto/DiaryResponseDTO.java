package com.freesia.backend.diary.dto;

import com.freesia.backend.diary.entity.Diary;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Builder
public class DiaryResponseDTO {

    private Long id;
    private Long memberId;
    private String content;
    private String emoji;
    private String emotion;
    private Double sentimentScore;
    private String aiComment;
    private LocalDate date;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static DiaryResponseDTO from(Diary diary) {
        return DiaryResponseDTO.builder()
                .id(diary.getId())
                .memberId(diary.getMember().getId())
                .content(diary.getContent())
                .emoji(diary.getEmoji())
                .emotion(diary.getEmotion())
                .sentimentScore(diary.getSentimentScore())
                .aiComment(diary.getAiComment())
                .date(diary.getDate())
                .status(diary.getStatus().name())
                .createdAt(diary.getCreatedAt())
                .updatedAt(diary.getUpdatedAt())
                .build();
    }
}
