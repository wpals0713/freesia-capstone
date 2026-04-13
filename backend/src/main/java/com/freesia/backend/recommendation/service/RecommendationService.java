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
import java.util.Collections;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final RecommendationRepository recommendationRepository;
    private final MusicCrawlingService musicCrawlingService;
    private final BookCrawlingService bookCrawlingService;
    private final MovieCrawlingService movieCrawlingService;
    private final ActivityCrawlingService activityCrawlingService;

    /**
     * 특정 감정에 맞는 추천 콘텐츠를 조회합니다.
     * 각 카테고리 (MUSIC, MOVIE, BOOK, ACTIVITY) 마다 1 개씩만 랜덤하게 선택하여 반환합니다.
     *
     * @param emotion 감정 카테고리 (예: "기쁨", "슬픔", "분노" 등)
     * @return 추천 콘텐츠 리스트 (각 카테고리별 1 개씩, 총 4 개)
     */
    public List<RecommendationResponse> getRecommendationsByEmotion(String emotion) {
        // 1. 해당 감정의 모든 데이터를 조회
        List<Recommendation> allRecommendations = recommendationRepository.findByEmotion(emotion);

        log.info("=== 추천 데이터 조회 시작 ===");
        log.info("감정: {}, 총 조회된 데이터 수: {}", emotion, allRecommendations.size());

        // 2. 전체 리스트를 나노초 시드로 완전히 셔플 (무작위성 보장)
        Collections.shuffle(allRecommendations, new Random(System.nanoTime()));
        log.info("전체 리스트 셔플 완료 (나노초 시드 사용)");

        // 3. 카테고리별로 그룹화
        Map<String, List<Recommendation>> groupedByCategory = allRecommendations.stream()
                .collect(Collectors.groupingBy(Recommendation::getCategory));

        // 4. 각 카테고리에서 1 개씩 랜덤 선택
        List<Recommendation> selectedRecommendations = new ArrayList<>();
        for (Map.Entry<String, List<Recommendation>> entry : groupedByCategory.entrySet()) {
            String category = entry.getKey();
            List<Recommendation> categoryList = entry.getValue();
            if (!categoryList.isEmpty()) {
                int randomIndex = new Random(System.nanoTime()).nextInt(categoryList.size());
                Recommendation selected = categoryList.get(randomIndex);
                selectedRecommendations.add(selected);
                // 디버깅 로그: 선택된 아이템의 ID 와 제목 출력
                log.info("[{}] 선택됨 - ID: {}, Title: {}", category, selected.getId(), selected.getTitle());
            } else {
                log.warn("[{}] 카테고리 데이터가 없습니다", category);
            }
        }

        log.info("=== 추천 데이터 조회 완료 (총 {}개 선택) ===", selectedRecommendations.size());

        // 5. DTO 로 변환하여 반환
        return selectedRecommendations.stream()
                .map(RecommendationResponse::from)
                .collect(Collectors.toList());
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
