package com.freesia.backend.diary.service;

public interface SentimentService {
    SentimentResult analyze(String content);
}
