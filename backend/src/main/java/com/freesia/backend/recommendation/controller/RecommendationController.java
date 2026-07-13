package com.freesia.backend.recommendation.controller;

import com.freesia.backend.global.ApiResponse;
import com.freesia.backend.global.exception.BusinessException;
import com.freesia.backend.global.security.JwtProvider;
import com.freesia.backend.member.entity.Member;
import com.freesia.backend.member.repository.MemberRepository;
import com.freesia.backend.recommendation.dto.RecommendationResponse;
import com.freesia.backend.recommendation.entity.Recommendation;
import com.freesia.backend.recommendation.entity.RecommendationFeedback;
import com.freesia.backend.recommendation.repository.RecommendationFeedbackRepository;
import com.freesia.backend.recommendation.repository.RecommendationRepository;
import com.freesia.backend.recommendation.service.ActivityCrawlingService;
import com.freesia.backend.recommendation.service.BookCrawlingService;
import com.freesia.backend.recommendation.service.RecommendationService;
import com.freesia.backend.recommendation.service.MusicCrawlingService;
import com.freesia.backend.recommendation.service.MovieCrawlingService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
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
    private final MemberRepository memberRepository;
    private final RecommendationFeedbackRepository feedbackRepository;
    private final RecommendationRepository recommendationRepository;
    private final JwtProvider jwtProvider;

    /**
     * 현재 로그인한 사용자의 정보를 가져옵니다.
     */
    private Member getCurrentMember() {
        var authentication = org.springframework.security.core.context.SecurityContextHolder.getContext()
                .getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new BusinessException("인증 정보가 없습니다.", HttpStatus.UNAUTHORIZED);
        }

        Object principal = authentication.getPrincipal();
        Long memberId;

        if (principal instanceof String) {
            // UsernamePasswordAuthenticationToken 의 경우 principal 이 UserDetails
            memberId = Long.parseLong((String) authentication.getPrincipal());
        } else if (principal instanceof com.freesia.backend.global.security.CustomUserDetails) {
            // CustomUserDetails 의 경우 memberId 필드 사용
            memberId = ((com.freesia.backend.global.security.CustomUserDetails) principal).getMemberId();
        } else if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
            // 기타 UserDetails 의 경우 email 로 조회
            String email = ((org.springframework.security.core.userdetails.UserDetails) principal).getUsername();
            return memberRepository.findByEmail(email)
                    .orElseThrow(() -> new BusinessException("존재하지 않는 회원입니다.", HttpStatus.NOT_FOUND));
        } else {
            throw new BusinessException("인증 정보를 추출할 수 없습니다.", HttpStatus.UNAUTHORIZED);
        }

        return memberRepository.findById(memberId)
                .orElseThrow(() -> new BusinessException("존재하지 않는 회원입니다.", HttpStatus.NOT_FOUND));
    }

    /**
     * 특정 감정에 맞는 추천 콘텐츠를 조회합니다.
     *
     * @param emotion 감정 카테고리 (예: "기쁨", "슬픔", "분노" 등)
     * @return 추천 콘텐츠 리스트
     */
    @GetMapping
    public ResponseEntity<List<RecommendationResponse>> getRecommendationsByEmotion(
            @RequestParam(value = "emotion", required = false) String emotion) {
        List<RecommendationResponse> recommendations = recommendationService.getRecommendationsByEmotion(emotion);
        return ResponseEntity.ok(recommendations);
    }

    /**
     * [실시간 크롤링] 유튜브 API 를 통해 음악 데이터를 수집합니다.
     * URL 호출 시 자동으로 유튜브 API 를 통해 데이터를 수집하고 저장합니다.
     * 예: http://localhost:8080/api/recommendations/crawl/music
     *
     * @return 수집 결과 메시지
     */
    @GetMapping("/crawl/music")
    public ResponseEntity<Map<String, String>> crawlMusic() {
        log.info("=== 유튜브 API 기반 음악 데이터 크롤링 시작 ===");
        try {
            musicCrawlingService.collectYouTubeRecommendations();
            Map<String, String> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "유튜브 API 를 통한 음악 데이터 수집이 완료되었습니다.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("유튜브 API 음악 데이터 수집 실패: {}", e.getMessage(), e);
            Map<String, String> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "유튜브 API 음악 데이터 수집 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
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

    /**
     * 추천 콘텐츠에 대한 사용자 피드백을 저장합니다.
     *
     * @param recommendationId 추천 콘텐츠 ID
     * @param request          피드백 요청 (isDisliked: true=싫어요, false=좋아요)
     * @return 저장 결과
     */
    @PostMapping("/{recommendationId}/feedback")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> saveFeedback(
            @PathVariable Long recommendationId,
            @RequestBody FeedbackRequest request) {
        try {
            Member member = getCurrentMember();
            Recommendation recommendation = recommendationRepository.findById(recommendationId)
                    .orElseThrow(() -> new IllegalArgumentException("추천 콘텐츠를 찾을 수 없습니다: " + recommendationId));

            // 이미 같은 사용자가 같은 콘텐츠에 피드백을 남겼는지 확인
            boolean exists = feedbackRepository.existsByMemberAndRecommendationIdAndIsDisliked(member,
                    recommendationId);
            if (exists) {
                // 이미 싫어요를 누른 상태이므로 무시 (중복 방지)
                log.info("이미 피드백이 존재합니다: member={}, recommendationId={}", member.getId(), recommendationId);
                return ResponseEntity.ok(ApiResponse.success("이미 피드백이 존재합니다."));
            }

            // 피드백 저장
            RecommendationFeedback feedback = RecommendationFeedback.builder()
                    .member(member)
                    .recommendation(recommendation)
                    .isDisliked(request.isDisliked())
                    .build();
            feedbackRepository.save(feedback);

            log.info("피드백 저장 완료: member={}, recommendationId={}, isDisliked={}",
                    member.getId(), recommendationId, request.isDisliked());
            return ResponseEntity.ok(ApiResponse.success("피드백이 저장되었습니다."));
        } catch (Exception e) {
            log.error("피드백 저장 실패: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.failure("피드백 저장 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    /**
     * 피드백 요청 DTO
     */
    public static class FeedbackRequest {
        private boolean isDisliked;

        public boolean isDisliked() {
            return isDisliked;
        }

        public void setIsDisliked(boolean isDisliked) {
            this.isDisliked = isDisliked;
        }
    }
}
