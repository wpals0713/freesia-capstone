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

    // 감정별 YouTube 검색어 매핑 - 힐링 앱 목적에 맞는 위로 및 기분전환 키워드
    private static final Map<String, List<String>> EMOTION_SEARCH_QUERIES = new HashMap<>();

    static {
        // 슬픔: 따뜻하게 위로가 되는 노래들
        EMOTION_SEARCH_QUERIES.put("슬픔", List.of(
                "따뜻하게 위로가 되는 노래", "힘들 때 듣는 힐링 플레이리스트", "토닥토닥 위로해주는 잔잔한 음악",
                "우울할 때 기분 좋아지는 따뜻한 노래", "마음이 편안해지는 어쿠스틱",
                "위로가 되는 발라드 모음", "마음 치유되는 음악", "슬플 때 듣는 따뜻한 노래",
                "차분한 위로 음악", "마음이 포근해지는 노래"));

        // 분노: 스트레스 해소 및 진정 음악
        EMOTION_SEARCH_QUERIES.put("분노", List.of(
                "스트레스가 확 풀리는 시원한 팝송", "답답할 때 듣는 청량한 노래", "마음이 차분해지는 진정 음악",
                "드라이브 갈 때 듣는 신나는 노래", "복잡한 생각을 비워주는 피아노곡",
                "스트레스 해소 음악", "마음 정화되는 노래", "청량한 여름 노래",
                "차분해지는 재즈", "마음이 맑아지는 음악"));

        // 불안: 안정감과 편안함을 주는 음악
        EMOTION_SEARCH_QUERIES.put("불안", List.of(
                "마음이 편안해지는 수면 음악", "불안감을 낮춰주는 힐링 주파수", "안정감을 주는 잔잔한 지브리 OST",
                "차분하게 릴랙스되는 재즈", "따뜻한 차 한 잔과 어울리는 노래",
                "마음 안정되는 클래식", "불안할 때 듣는 잔잔한 음악", "편안한 수면 음악",
                "차분한 피아노 곡", "마음이 편안해지는 자연 소리"));

        // 무기력: 에너지 충전 및 동기부여 음악
        EMOTION_SEARCH_QUERIES.put("무기력", List.of(
                "에너지가 뿜뿜하는 신나는 노동요", "동기부여가 되는 벅찬 팝송", "아침을 상쾌하게 깨우는 노래",
                "텐션 올리기 좋은 아이돌 노래", "무기력 탈출 신나는 플레이리스트",
                "에너지 충전 음악", "활기찬 아침 노래", "운동할 때 듣는 신나는 노래",
                "기분 전환 좋은 업템포", "동기부여 되는 팝송"));

        // 기쁨: 행복과 즐거움을 증폭시키는 노래들
        EMOTION_SEARCH_QUERIES.put("기쁨", List.of(
                "너무 행복해서 날아갈 것 같은 노래", "기분 째지는 신나는 노래", "햇살 좋은 날 듣기 좋은 플레이리스트",
                "청량하고 밝은 K-pop", "내적 댄스 유발하는 팝송",
                "행복한 기분이 되는 노래", "웃음 나는 신나는 노래", "기분 좋은 여름 노래",
                "밝은 에너지의 노래", "기분 전환 좋은 팝송"));
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

    // 브이로그, 룩북 등 관련 없는 콘텐츠 필터링을 위한 마이너스 키워드
    private static final String NEGATIVE_KEYWORDS = " -\"브이로그\" -\"룩북\" -\"vlog\" -\"lookbook\" -\"playlist\"";

    /**
     * YouTube Search API 를 호출하여 비디오 목록을 가져옵니다.
     * - type=video: 재생목록이나 채널 배제
     * - videoCategoryId=10: YouTube 카테고리 10 번 = Music
     * - 마이너스 키워드: 브이로그, 룩북 등 관련 없는 콘텐츠 필터링
     */
    private List<YouTubeVideo> searchYouTubeVideos(String query, String emotion) {
        // 검색어에 마이너스 키워드 추가하여 브이로그/룩북 필터링
        String filteredQuery = query + NEGATIVE_KEYWORDS;

        String url = String.format("%s/search?part=snippet&maxResults=%d&q=%s&type=video&videoCategoryId=10&key=%s",
                youtubeBaseUrl, maxResults, encodeQuery(filteredQuery), youtubeApiKey);

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