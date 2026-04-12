package com.freesia.backend.recommendation.service;

import com.freesia.backend.recommendation.entity.Recommendation;
import com.freesia.backend.recommendation.repository.RecommendationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class YouTubeDataService {

    private final RecommendationRepository recommendationRepository;
    private final RestTemplate restTemplate;

    @Value("${youtube.api.key}")
    private String youtubeApiKey;

    @Value("${youtube.api.base-url}")
    private String youtubeBaseUrl;

    @Value("${youtube.api.max-results:50}")
    private int maxResults;

    // 감정별 YouTube 검색어 매핑
    private static final Map<String, List<String>> EMOTION_SEARCH_QUERIES = new HashMap<>();

    static {
        EMOTION_SEARCH_QUERIES.put("기쁨", List.of(
                "기분 좋아지는 신나는 노래",
                "happy kpop playlist",
                "upbeat pop songs 2024",
                "dance party music",
                "cheerful songs to lift your mood"));
        EMOTION_SEARCH_QUERIES.put("슬픔", List.of(
                "우울할 때 듣는 잔잔한 노래",
                "sad ballads to cry to",
                "healing acoustic music",
                "감성 발라드 모음",
                "calm piano music for sadness"));
        EMOTION_SEARCH_QUERIES.put("분노", List.of(
                "분노 해소 록 음악",
                "heavy metal workout music",
                "rage rock songs",
                "aggressive music to release anger",
                "hardcore punk playlist"));
        EMOTION_SEARCH_QUERIES.put("불안", List.of(
                "불안할 때 듣는 차분한 음악",
                "calming meditation music",
                "relaxing ambient sounds",
                "stress relief music",
                "peaceful nature sounds"));
        EMOTION_SEARCH_QUERIES.put("무기력", List.of(
                "기분 전환에 좋은 가벼운 음악",
                "light jazz for relaxation",
                "easy listening music",
                "부드러운 재즈 플레이리스트",
                "chill lofi beats to study to"));
    }

    /**
     * YouTube API 를 통해 추천 데이터를 수집하고 DB 에 저장합니다.
     */
    public void collectYouTubeRecommendations() {
        log.info("=== YouTube 추천 데이터 수집 시작 ===");

        int savedCount = 0;
        int skippedCount = 0;

        for (Map.Entry<String, List<String>> entry : EMOTION_SEARCH_QUERIES.entrySet()) {
            String emotion = entry.getKey();
            List<String> searchQueries = entry.getValue();

            log.info("감정: {} - 검색어 {} 개 조회", emotion, searchQueries.size());

            for (String query : searchQueries) {
                try {
                    List<YouTubeVideo> videos = searchYouTubeVideos(query, emotion);
                    savedCount += saveVideosToDatabase(videos, emotion);
                    skippedCount += videos.size(); // 중복으로 스킵된 경우
                } catch (Exception e) {
                    log.error("YouTube 검색 실패 (감정: {}, 검색어: {}): {}", emotion, query, e.getMessage());
                }
            }
        }

        log.info("=== YouTube 추천 데이터 수집 완료 ===");
        log.info("저장된 데이터 수: {}, 중복 스킵된 데이터 수: {}", savedCount, skippedCount);
    }

    /**
     * YouTube Search API 를 호출하여 비디오 목록을 가져옵니다.
     */
    private List<YouTubeVideo> searchYouTubeVideos(String query, String emotion) {
        String url = String.format("%s/search?part=snippet&maxResults=%d&q=%s&type=video&key=%s",
                youtubeBaseUrl, maxResults, encodeQuery(query), youtubeApiKey);

        log.debug("YouTube API 호출: {}", url);

        YouTubeSearchResponse response = restTemplate.getForObject(url, YouTubeSearchResponse.class);

        if (response == null || response.getItems() == null) {
            return new ArrayList<>();
        }

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

        return videos;
    }

    /**
     * 파싱한 비디오 데이터를 DB 에 저장합니다.
     * 중복 저장을 방지합니다.
     */
    private int saveVideosToDatabase(List<YouTubeVideo> videos, String emotion) {
        int savedCount = 0;

        for (YouTubeVideo video : videos) {
            String contentUrl = "https://www.youtube.com/watch?v=" + video.getVideoId();

            // 이미 동일한 URL 이 있는지 확인
            boolean exists = recommendationRepository.findByContentUrl(contentUrl).isPresent();
            if (exists) {
                log.debug("중복 데이터 스킵: {}", contentUrl);
                continue;
            }

            Recommendation recommendation = Recommendation.builder()
                    .emotion(emotion)
                    .category("MUSIC")
                    .title(video.getTitle())
                    .description(video.getDescription())
                    .imageUrl(video.getThumbnailUrl())
                    .contentUrl(contentUrl)
                    .build();

            recommendationRepository.save(recommendation);
            savedCount++;
            log.debug("저장 완료: {}", video.getTitle());
        }

        return savedCount;
    }

    /**
     * 매일 새벽 3 시에 자동 실행되는 스케줄러 메서드
     */
    @Scheduled(cron = "0 0 3 * * *")
    public void scheduledCollectYouTubeRecommendations() {
        log.info("=== 스케줄러: YouTube 추천 데이터 수집 자동 실행 ===");
        collectYouTubeRecommendations();
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