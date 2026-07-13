package com.freesia.backend.recommendation.scheduler;

import com.freesia.backend.recommendation.service.ActivityCrawlingService;
import com.freesia.backend.recommendation.service.BookCrawlingService;
import com.freesia.backend.recommendation.service.MovieCrawlingService;
import com.freesia.backend.recommendation.service.MusicCrawlingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class CrawlingScheduler {

    private final MovieCrawlingService movieCrawlingService;
    private final BookCrawlingService bookCrawlingService;
    private final ActivityCrawlingService activityCrawlingService;
    private final MusicCrawlingService musicCrawlingService;

    /**
     * 매일 새벽 4 시에 추천 데이터 크롤링 실행
     * 실행 순서: 영화 -> 도서 -> 활동
     */
    @Scheduled(cron = "0 0 4 * * *")
    public void dailyCrawling() {
        log.info("=== 매일 새벽 4 시 크롤링 시작 ===");

        try {
            // 1. 영화 크롤링
            log.info("1. 영화 크롤링 시작...");
            movieCrawlingService.crawlNetflixWatchaMovies();
            log.info("1. 영화 크롤링 완료");

            // 2. 도서 크롤링
            log.info("2. 도서 크롤링 시작...");
            bookCrawlingService.crawlKyoboBooks();
            log.info("2. 도서 크롤링 완료");

            // 3. 활동 크롤링
            log.info("3. 활동 크롤링 시작...");
            activityCrawlingService.crawlNaverBlogs();
            log.info("3. 활동 크롤링 완료");

            log.info("=== 매일 새벽 4 시 크롤링 완료 ===");
        } catch (Exception e) {
            log.error("매일 새벽 4 시 크롤링 실패: {}", e.getMessage(), e);
        }
    }

    /**
     * 매주 월요일 새벽 5 시에 음악 크롤링 실행 (할당량 문제)
     * DB 초기화 후 새로운 데이터 수집
     */
    @Scheduled(cron = "0 0 5 * * MON")
    public void weeklyMusicCrawling() {
        log.info("=== 매주 월요일 새벽 5 시 음악 크롤링 시작 ===");
        log.info("MusicCrawlingService 빈 주입 여부: {}", musicCrawlingService != null ? "정상" : "실패");

        try {
            // 1. DB 초기화 (MUSIC 카테고리 데이터 삭제)
            log.info("DB 초기화 시작...");
            musicCrawlingService.initializeMusicData();
            log.info("DB 초기화 완료");

            // 2. 음악 크롤링
            log.info("음악 크롤링 시작...");
            musicCrawlingService.collectYouTubeRecommendations();
            log.info("음악 크롤링 완료");

            log.info("=== 매주 월요일 새벽 5 시 음악 크롤링 완료 ===");
        } catch (Exception e) {
            log.error("매주 월요일 새벽 5 시 음악 크롤링 실패: {}", e.getMessage(), e);
        }
    }
}