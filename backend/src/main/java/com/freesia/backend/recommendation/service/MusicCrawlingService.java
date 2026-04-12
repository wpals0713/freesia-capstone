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

    @Value("${youtube.api.max-results:100}")
    private int maxResults;

    // 감정별 YouTube 검색어 매핑 - 20 개씩 100 개 검색어
    private static final Map<String, List<String>> EMOTION_SEARCH_QUERIES = new HashMap<>();

    static {
        EMOTION_SEARCH_QUERIES.put("기쁨", List.of(
                "기분 좋아지는 노래 플레이리스트", "기분 좋아지는 노래 공식 음원", "신나는 노래 플레이리스트",
                "행복한 노래 모음", "기분 전환 좋은 노래", "웃음 나는 노래 모음", "댄스 파티 음악",
                "업템포 노래 모음", "기분 좋은 아침 음악", "즐거운 여행 음악", "취향저격 노래",
                "힙한 노래 모음", "팝송 플레이리스트", "K-pop 히트곡", "트렌디한 노래",
                "댄스곡 모음", "파티 음악", "춤추고 싶은 노래", "신나는 팝송", "기분 좋은 팝"));
        EMOTION_SEARCH_QUERIES.put("슬픔", List.of(
                "울고 싶은 노래 플레이리스트", "감성 발라드 모음", "슬픈 노래 공식 음원",
                "마음이 차분해지는 음악", "한숨 나오는 노래 모음", "잔잔한 피아노 음악", "우울할 때 듣는 노래",
                "마음 위로 되는 노래", "감성적인 노래 모음", "눈물 나는 노래 플레이리스트", "슬픈 발라드",
                "가사 좋은 노래", "마음이 찡한 노래", "한곡만 듣고 싶은 노래", "감성 음악",
                "아픈 노래 모음", "이별 노래", "추억 노래", "노래방 슬픈 곡", "마음 위로 곡"));
        EMOTION_SEARCH_QUERIES.put("분노", List.of(
                "분노 해소 음악 플레이리스트", "록 음악 모음", "메탈 음악 공식 음원",
                "스트레스 풀리는 노래", "고음질 록 음악", "에너지 넘치는 노래", "힘나는 노래 모음",
                "격렬한 음악 플레이리스트", "노래방 추천 곡", "힘내는 노래 모음", "록 발라드",
                "메탈 곡 모음", "히트곡 모음", "강렬한 노래", "에너지 충전 음악",
                "노래방 록곡", "힘내는 발라드", "격렬한 팝송", "록 앤롤", "하드록 곡"));
        EMOTION_SEARCH_QUERIES.put("불안", List.of(
                "불안할 때 듣는 음악", "차분한 음악 플레이리스트", "명상 음악 공식 음원",
                "마음 안정되는 노래", "집중력 향상 음악", "스스로 진정되는 노래", "평온한 음악 모음",
                "힐링 음악 플레이리스트", "잔잔한 자연 소리", "마음 챙김 음악", "클래식 음악",
                "피아노 곡 모음", "재즈 플레이리스트", "아코디언 음악", "어쿠스틱 곡",
                "잔잔한 팝송", "차분한 발라드", "명상용 음악", "요가 음악", "수면 음악"));
        EMOTION_SEARCH_QUERIES.put("무기력", List.of(
                "기분 전환에 좋은 가벼운 음악", "부드러운 재즈 플레이리스트", "Lo-fi 음악 모음",
                "취미 생활 추천 음악", "작은 성취감 주는 노래", "일상 속 작은 행복", "가벼운 팝 음악",
                "여유로운 오후 음악", "집중력 도움 음악", "작은 목표 달성 음악", "인디 음악",
                "포크 곡 모음", "어쿠스틱 팝", "가벼운 발라드", "일상 음악",
                "작은 행복 노래", "평온한 곡", "일상 속 음악", "취미 음악", "집중 음악"));
    }

    /**
     * YouTube API 를 통해 추천 데이터를 수집하고 DB 에 저장합니다.
     * 기존 데이터를 삭제하지 않고, 중복 체크만 해서 새 데이터만 추가합니다.
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
                    log.info("감정 {} 검색어 '{}'로 {}개의 비디오를 찾았습니다.", emotion, query, videos.size());

                    if (videos.isEmpty()) {
                        log.info("검색 결과가 없습니다. 기존 데이터를 유지합니다.");
                        continue;
                    }

                    savedCount += saveVideosToDatabase(videos, emotion);
                    skippedCount += videos.size();
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
     * 중복 저장을 방지합니다 (content_url 기준).
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

            // 제목 길이 제한 (최대 200 자)
            String title = video.getTitle().trim();
            if (title.length() > 200) {
                title = title.substring(0, 200);
            }

            // 설명: 기본 설명 사용
            String description = video.getDescription() != null ? video.getDescription().trim() : "YouTube 공식 음원";
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