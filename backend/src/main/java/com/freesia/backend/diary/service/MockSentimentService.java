package com.freesia.backend.diary.service;

import java.util.List;
import java.util.Random;

/**
 * 키워드 기반 Mock 감정 분석 서비스.
 * AiSentimentService 로 교체됨 — Bean 등록 제거.
 * AI 서버 없이 로컬 테스트가 필요할 경우 @Service 를 다시 추가하세요.
 */
public class MockSentimentService implements SentimentService {

    private static final List<String> POSITIVE_KEYWORDS = List.of("좋아", "행복", "맑아");
    private static final List<String> NEGATIVE_KEYWORDS = List.of("슬퍼", "화나", "짜증");

    private final Random random = new Random();

    @Override
    public SentimentResult analyze(String content) {
        String emotion;

        if (POSITIVE_KEYWORDS.stream().anyMatch(content::contains)) {
            emotion = "기쁨";
        } else if (NEGATIVE_KEYWORDS.stream().anyMatch(content::contains)) {
            emotion = "슬픔";
        } else {
            emotion = "중립";
        }

        double score = 0.7 + random.nextDouble() * 0.2; // 0.7 ~ 0.9
        return new SentimentResult(emotion, Math.round(score * 100.0) / 100.0, null);
    }
}
