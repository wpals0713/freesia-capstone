package com.freesia.backend.recommendation.controller;

import com.freesia.backend.recommendation.dto.RecommendationResponse;
import com.freesia.backend.recommendation.service.ActivityCrawlingService;
import com.freesia.backend.recommendation.service.BookCrawlingService;
import com.freesia.backend.recommendation.service.RecommendationService;
import com.freesia.backend.recommendation.service.MusicCrawlingService;
import com.freesia.backend.recommendation.service.MovieCrawlingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;
    private final MusicCrawlingService musicCrawlingService;
    private final BookCrawlingService bookCrawlingService;
    private final MovieCrawlingService movieCrawlingService;
    private final ActivityCrawlingService activityCrawlingService;

    /**
     * 특정 감정에 맞는 추천 콘텐츠를 조회합니다.
     *
     * @param emotion 감정 카테고리 (예: "기쁨", "슬픔", "분노" 등)
     * @return 추천 콘텐츠 리스트
     */
    @GetMapping
    public ResponseEntity<List<RecommendationResponse>> getRecommendationsByEmotion(@RequestParam String emotion) {
        List<RecommendationResponse> recommendations = recommendationService.getRecommendationsByEmotion(emotion);
        return ResponseEntity.ok(recommendations);
    }

    /**
     * [테스트용] 음악 데이터를 수집합니다.
     * 개발 환경에서 브라우저 주소창으로 직접 접근하여 테스트할 수 있습니다.
     * 예: http://localhost:8080/api/recommendations/test/crawl-music
     *
     * @return 수집 결과 메시지
     */
    @GetMapping("/test/crawl-music")
    public ResponseEntity<Map<String, String>> crawlMusicForTest() {
        log.info("=== 수동 음악 데이터 수집 트리거됨 ===");
        try {
            musicCrawlingService.collectYouTubeRecommendations();
            Map<String, String> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "음악 데이터 수집이 완료되었습니다.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("음악 데이터 수집 실패: {}", e.getMessage(), e);
            Map<String, String> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "음악 데이터 수집 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * [테스트용] 교보문고에서 추천 도서를 크롤링합니다.
     * 개발 환경에서 브라우저 주소창으로 직접 접근하여 테스트할 수 있습니다.
     * 예: http://localhost:8080/api/recommendations/test/crawl-books
     *
     * @return 수집 결과 메시지
     */
    @GetMapping("/test/crawl-books")
    public ResponseEntity<Map<String, String>> crawlBooksForTest() {
        log.info("=== 수동 교보문고 도서 크롤링 트리거됨 ===");
        try {
            bookCrawlingService.crawlKyoboBooks();
            Map<String, String> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "교보문고 도서 크롤링이 완료되었습니다.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("교보문고 도서 크롤링 실패: {}", e.getMessage(), e);
            Map<String, String> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "교보문고 도서 크롤링 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * [테스트용] 넷플릭스/왓챠에서 추천 영화를 크롤링합니다.
     * 개발 환경에서 브라우저 주소창으로 직접 접근하여 테스트할 수 있습니다.
     * 예: http://localhost:8080/api/recommendations/test/crawl-movies
     *
     * @return 수집 결과 메시지
     */
    @GetMapping("/test/crawl-movies")
    public ResponseEntity<Map<String, String>> crawlMoviesForTest() {
        log.info("=== 수동 넷플릭스/왓챠 영화 크롤링 트리거됨 ===");
        try {
            movieCrawlingService.crawlNetflixWatchaMovies();
            Map<String, String> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "넷플릭스/왓챠 영화 크롤링이 완료되었습니다.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("넷플릭스/왓챠 영화 크롤링 실패: {}", e.getMessage(), e);
            Map<String, String> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "넷플릭스/왓챠 영화 크롤링 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * [테스트용] 모바일 네이버 블로그에서 추천 활동을 크롤링합니다.
     * 개발 환경에서 브라우저 주소창으로 직접 접근하여 테스트할 수 있습니다.
     * 예: http://localhost:8080/api/recommendations/test/crawl-activities
     *
     * @return 수집 결과 메시지
     */
    @GetMapping("/test/crawl-activities")
    public ResponseEntity<Map<String, String>> crawlActivitiesForTest() {
        log.info("=== 수동 모바일 네이버 블로그 활동 크롤링 트리거됨 ===");
        try {
            activityCrawlingService.crawlNaverBlogs();
            Map<String, String> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "모바일 네이버 블로그 활동 크롤링이 완료되었습니다.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("모바일 네이버 블로그 활동 크롤링 실패: {}", e.getMessage(), e);
            Map<String, String> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "모바일 네이버 블로그 활동 크롤링 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}
