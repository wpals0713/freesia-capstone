package com.freesia.backend.recommendation.service;

import com.freesia.backend.recommendation.dto.RecommendationResponse;
import com.freesia.backend.recommendation.entity.Recommendation;
import com.freesia.backend.recommendation.repository.RecommendationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final RecommendationRepository recommendationRepository;
    private final MusicCrawlingService musicCrawlingService;
    private final BookCrawlingService bookCrawlingService;
    private final MovieCrawlingService movieCrawlingService;
    private final ActivityCrawlingService activityCrawlingService;
    private final Random random = new Random();

    /**
     * 특정 감정에 맞는 추천 콘텐츠를 조회합니다.
     * 각 카테고리 (MUSIC, MOVIE, BOOK, ACTIVITY, HOBBY) 마다 1 개씩 랜덤으로 선택합니다.
     *
     * @param emotion 감정 카테고리 (예: "기쁨", "슬픔", "분노" 등)
     * @return 추천 콘텐츠 리스트 (카테고리별 1 개씩)
     */
    public List<RecommendationResponse> getRecommendationsByEmotion(String emotion) {
        // 1. 해당 감정의 모든 데이터를 조회
        List<Recommendation> allRecommendations = recommendationRepository.findByEmotion(emotion);

        // 2. 카테고리별로 그룹화
        Map<String, List<Recommendation>> groupedByCategory = allRecommendations.stream()
                .collect(Collectors.groupingBy(Recommendation::getCategory));

        // 3. 각 카테고리에서 랜덤으로 1 개 선택
        List<RecommendationResponse> randomRecommendations = new ArrayList<>();
        for (List<Recommendation> categoryList : groupedByCategory.values()) {
            if (!categoryList.isEmpty()) {
                int randomIndex = random.nextInt(categoryList.size());
                Recommendation randomRecommendation = categoryList.get(randomIndex);
                randomRecommendations.add(RecommendationResponse.from(randomRecommendation));
            }
        }

        return randomRecommendations;
    }

    /**
     * 매일 새벽 3 시에 모든 추천 데이터를 자동으로 수집합니다.
     * - YouTube 음악
     * - 교보문고 도서
     * - 다음 영화
     * - 네이버 포스트 활동
     * 각 Service 에서 deleteByCategory 를 호출하여 기존 데이터를 정리한 후 새로 수집합니다.
     */
    @Scheduled(cron = "0 0 3 * * MON-FRI") // 평일 매일 새벽 3 시
    public void scheduledCollectAllRecommendations() {
        log.info("=== 자동 추천 데이터 수집 시작 (매일 새벽 3 시) ===");

        try {
            // 1. 음악 수집
            log.info("음악 수집 시작...");
            musicCrawlingService.collectYouTubeRecommendations();

            // 2. 교보문고 도서 수집
            log.info("교보문고 도서 수집 시작...");
            bookCrawlingService.crawlKyoboBooks();

            // 3. 넷플릭스/왓챠 영화 수집
            log.info("넷플릭스/왓챠 영화 수집 시작...");
            movieCrawlingService.crawlNetflixWatchaMovies();

            // 4. 모바일 네이버 블로그 활동 수집
            log.info("모바일 네이버 블로그 활동 수집 시작...");
            activityCrawlingService.crawlNaverBlogs();

            log.info("=== 자동 추천 데이터 수집 완료 ===");
        } catch (Exception e) {
            log.error("자동 추천 데이터 수집 중 오류 발생: {}", e.getMessage(), e);
        }
    }
}
