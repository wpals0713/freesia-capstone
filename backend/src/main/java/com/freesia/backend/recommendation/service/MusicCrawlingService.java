package com.freesia.backend.recommendation.service;

import com.freesia.backend.recommendation.entity.Recommendation;
import com.freesia.backend.recommendation.repository.RecommendationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class MusicCrawlingService {

    private final RecommendationRepository recommendationRepository;
    private final RestTemplate restTemplate;

    @Value("${youtube.api.key}")
    private String youtubeApiKey;

    @Value("${youtube.api.base-url}")
    private String youtubeBaseUrl;

    @Value("${youtube.api.max-results:30}")
    private int maxResults;

    // 중복 실행 방지 플래그
    private boolean isCrawling = false;

    // 감정별 YouTube 검색어 매핑 - 5 가지 감정, 유튜브에서 가장 조회수가 높고 대중적인 키워드 3 개씩!
    private static final Map<String, List<String>> EMOTION_SEARCH_QUERIES = new HashMap<>();

    static {
        EMOTION_SEARCH_QUERIES.put("기쁨", List.of("신나는 아이돌 노래", "2024 인기 가요", "기분 좋아지는 팝송"));
        EMOTION_SEARCH_QUERIES.put("슬픔", List.of("슬픈 발라드 명곡", "눈물나는 감성 노래", "이별 노래방"));
        EMOTION_SEARCH_QUERIES.put("분노", List.of("비트 강한 힙합", "파워풀한 락 음악", "스트레스 풀리는 노래"));
        EMOTION_SEARCH_QUERIES.put("불안", List.of("차분한 카페 인디", "편안한 어쿠스틱", "Lofi Beats"));
        EMOTION_SEARCH_QUERIES.put("무기력", List.of("에너지 충전 댄스곡", "동기부여 명곡", "파이팅 넘치는 노래"));
    }

    /**
     * DB 의 MUSIC 카테고리 데이터를 초기화합니다.
     * 새로 크롤링하기 전에 기존 데이터를 삭제합니다.
     */
    public void initializeMusicData() {
        log.info("=== MUSIC 카테고리 데이터 초기화 시작 ===");
        int deletedCount = recommendationRepository.deleteByCategory("MUSIC");
        log.info("MUSIC 카테고리 데이터 {}개 삭제 완료", deletedCount);
        log.info("=== MUSIC 카테고리 데이터 초기화 완료 ===");
    }

    /**
     * YouTube API 를 통해 추천 데이터를 수집하고 DB 에 저장합니다.
     * 중복 실행을 방지합니다.
     */
    public void collectYouTubeRecommendations() {
        // 중복 실행 방지
        if (isCrawling) {
            log.warn("이미 크롤링 중입니다. 새로운 요청을 무시합니다.");
            return;
        }

        isCrawling = true;
        log.info("=== YouTube 추천 데이터 수집 시작 ===");
        log.info("YouTube API 키 설정 여부: {}", youtubeApiKey != null && !youtubeApiKey.isEmpty() ? "설정됨" : "미설정");
        log.info("YouTube API Base URL: {}", youtubeBaseUrl);
        log.info("최대 결과 수: {}", maxResults);
        log.info("총 감정 종류 수: {}", EMOTION_SEARCH_QUERIES.size());

        int totalQueries = EMOTION_SEARCH_QUERIES.values().stream().mapToInt(List::size).sum();
        log.info("총 검색어 수: {}", totalQueries);

        int savedCount = 0;

        try {
            for (Map.Entry<String, List<String>> entry : EMOTION_SEARCH_QUERIES.entrySet()) {
                String emotion = entry.getKey();
                List<String> searchQueries = entry.getValue();

                log.info("감정: {} - 검색어 {} 개 조회", emotion, searchQueries.size());
                log.debug("감정 {} 검색어 목록: {}", emotion, searchQueries);

                for (String query : searchQueries) {
                    try {
                        List<YouTubeVideo> videos = searchYouTubeVideos(query, emotion);

                        // YouTube API 호출 후 10 초 대기 (429 에러 방지 - 1 분당 10 회 제한 안전 장치)
                        try {
                            Thread.sleep(10000);
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                            log.warn("API 호출 대기 중 인터럽트 발생: {}", e.getMessage());
                        }

                        log.info("감정 {} 검색어 '{}'로 {}개의 비디오를 찾았습니다.", emotion, query, videos.size());

                        if (videos.isEmpty()) {
                            log.info("검색 결과가 없습니다. 기존 데이터를 유지합니다.");
                            continue;
                        }

                        savedCount += saveVideosToDatabase(videos, emotion);
                    } catch (Exception e) {
                        log.error("YouTube 검색 실패 (감정: {}, 검색어: {}): {}", emotion, query, e.getMessage());
                    }
                }
            }

            log.info("=== YouTube 추천 데이터 수집 완료 ===");
            log.info("저장된 데이터 수: {}", savedCount);
        } finally {
            isCrawling = false;
            log.info("크롤링 플래그를 false 로 변경했습니다.");
        }
    }

    /**
     * YouTube Search API 를 호출하여 비디오 목록을 가져옵니다.
     * - type=video: 재생목록이나 채널 배제
     * - videoCategoryId=10: YouTube 카테고리 10 번 = Music
     */
    private List<YouTubeVideo> searchYouTubeVideos(String query, String emotion) {
        String url = String.format("%s/search?part=snippet&maxResults=%d&q=%s&type=video&videoCategoryId=10&key=%s",
                youtubeBaseUrl, maxResults, encodeQuery(query), youtubeApiKey);

        log.info("YouTube API 호출 시작 (감정: {}, 검색어: {})", emotion, query);
        log.debug("YouTube API 호출 URL: {}", url);

        YouTubeSearchResponse response;
        try {
            response = restTemplate.getForObject(url, YouTubeSearchResponse.class);
        } catch (Exception e) {
            log.error("유튜브 API 호출 에러 상세: ", e);
            return new ArrayList<>();
        }

        // 유튜브 응답 Raw 데이터 확인
        log.info("유튜브 응답 Raw 데이터: {}", response);

        if (response == null || response.getItems() == null) {
            log.warn("YouTube API 응답이 null 이거나 items 가 없습니다. 검색어: {}", query);
            return new ArrayList<>();
        }

        log.info("YouTube API 응답에서 {}개의 항목을 찾았습니다.", response.getItems().size());

        List<YouTubeVideo> videos = new ArrayList<>();
        for (YouTubeSearchResponse.Item item : response.getItems()) {
            YouTubeVideo video = new YouTubeVideo();
            video.setVideoId(item.getId().getVideoId());
            video.setTitle(item.getSnippet().getTitle());
            video.setDescription(item.getSnippet().getDescription());
            video.setThumbnailUrl(item.getSnippet().getThumbnails().getHigh().getUrl());
            video.setEmotion(emotion);
            video.setCategory("MUSIC");
            videos.add(video);
        }

        // 필터링 없이 모든 데이터 반환
        return videos;
    }

    /**
     * 파싱한 비디오 데이터를 DB 에 저장합니다.
     * 중복 저장을 방지합니다 (content_url 기준).
     * 이제 어떤 비디오든 중복만 아니면 무조건 저장합니다.
     */
    private int saveVideosToDatabase(List<YouTubeVideo> videos, String emotion) {
        int savedCount = 0;

        for (YouTubeVideo video : videos) {
            String contentUrl = "https://www.youtube.com/watch?v=" + video.getVideoId();

            // 이미 동일한 URL 이 있는지 확인 (중복 방지)
            boolean exists = recommendationRepository.findByContentUrl(contentUrl).isPresent();
            if (exists) {
                log.debug("중복 데이터 스킵: {}", contentUrl);
                continue;
            }

            // 제목과 설명 정리
            String title = video.getTitle().trim();
            String description = video.getDescription() != null ? video.getDescription().trim() : "";

            // 제목 길이 제한 (최대 200 자)
            if (title.length() > 200) {
                title = title.substring(0, 200);
            }

            // 설명 길이 제한 (최대 1000 자)
            if (description.length() > 1000) {
                description = description.substring(0, 1000);
            }

            // 이미지 URL 정리
            String imageUrl = video.getThumbnailUrl() != null ? video.getThumbnailUrl().trim() : "";

            Recommendation recommendation = Recommendation.builder()
                    .emotion(emotion)
                    .category("MUSIC")
                    .title(title)
                    .description(description)
                    .imageUrl(imageUrl)
                    .contentUrl(contentUrl)
                    .build();

            recommendationRepository.save(recommendation);
            savedCount++;
            log.debug("저장 완료: {}", title);
        }

        log.info("MUSIC 데이터 저장 완료: {}개 저장", savedCount);
        return savedCount;
    }

    /**
     * URL 인코딩
     */
    private String encodeQuery(String query) {
        try {
            return java.net.URLEncoder.encode(query, "UTF-8").replace("+", "%20");
        } catch (Exception e) {
            return query;
        }
    }

    // ==================== DTO 클래스 ====================

    /**
     * YouTube Search API 응답 DTO
     */
    public static class YouTubeSearchResponse {
        private List<Item> items;

        public List<Item> getItems() {
            return items;
        }

        public void setItems(List<Item> items) {
            this.items = items;
        }

        public static class Item {
            private ItemId id;
            private ItemSnippet snippet;

            public ItemId getId() {
                return id;
            }

            public void setId(ItemId id) {
                this.id = id;
            }

            public ItemSnippet getSnippet() {
                return snippet;
            }

            public void setSnippet(ItemSnippet snippet) {
                this.snippet = snippet;
            }
        }

        public static class ItemId {
            private String videoId;

            public String getVideoId() {
                return videoId;
            }

            public void setVideoId(String videoId) {
                this.videoId = videoId;
            }
        }

        public static class ItemSnippet {
            private String title;
            private String description;
            private ThumbnailDetails thumbnails;

            public String getTitle() {
                return title;
            }

            public void setTitle(String title) {
                this.title = title;
            }

            public String getDescription() {
                return description;
            }

            public void setDescription(String description) {
                this.description = description;
            }

            public ThumbnailDetails getThumbnails() {
                return thumbnails;
            }

            public void setThumbnails(ThumbnailDetails thumbnails) {
                this.thumbnails = thumbnails;
            }
        }

        public static class ThumbnailDetails {
            private Thumbnail high;

            public Thumbnail getHigh() {
                return high;
            }

            public void setHigh(Thumbnail high) {
                this.high = high;
            }
        }

        public static class Thumbnail {
            private String url;

            public String getUrl() {
                return url;
            }

            public void setUrl(String url) {
                this.url = url;
            }
        }
    }

    /**
     * YouTube 비디오 정보 DTO
     */
    public static class YouTubeVideo {
        private String videoId;
        private String title;
        private String description;
        private String thumbnailUrl;
        private String emotion;
        private String category;

        public String getVideoId() {
            return videoId;
        }

        public void setVideoId(String videoId) {
            this.videoId = videoId;
        }

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public String getThumbnailUrl() {
            return thumbnailUrl;
        }

        public void setThumbnailUrl(String thumbnailUrl) {
            this.thumbnailUrl = thumbnailUrl;
        }

        public String getEmotion() {
            return emotion;
        }

        public void setEmotion(String emotion) {
            this.emotion = emotion;
        }

        public String getCategory() {
            return category;
        }

        public void setCategory(String category) {
            this.category = category;
        }
    }
}