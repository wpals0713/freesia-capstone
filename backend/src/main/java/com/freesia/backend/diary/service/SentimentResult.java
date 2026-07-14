package com.freesia.backend.diary.service;

public record SentimentResult(String emotion, Double score, Double emotionScore, String aiComment) {
}
