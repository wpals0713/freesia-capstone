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

    // 감정별 YouTube 검색어 매핑 - K-POP, POP, J-POP 장르가 명확히 드러나는 트렌디 키워드
    private static final Map<String, List<String>> EMOTION_SEARCH_QUERIES = new HashMap<>();

    static {
        // 기쁨: 신나고 청량한 K-POP/POP/J-POP
        EMOTION_SEARCH_QUERIES.put("기쁨", List.of(
                "신나는 KPOP", "청량한 KPOP 아이돌", "Upbeat Pop", "신나는 JPOP",
                "Happy KPOP 2024", "Bright Pop Songs", "KPOP 댄스곡", "JPOP 업템포",
                "Fun Pop Music", "KPOP 아이돌 신나는 곡"));

        // 슬픔: 감성적인 K-POP 발라드/POP 발라드
        EMOTION_SEARCH_QUERIES.put("슬픔", List.of(
                "감성적인 KPOP 발라드", "Sad Pop", "이별 JPOP",
                "KPOP 슬픈 발라드", "Emotional Pop Ballad", "JPOP 감성 발라드",
                "KPOP 눈물 발라드", "Sad Korean Pop", "JPOP 이별송", "KPOP 발라드 모음"));

        // 분노: 강렬한 K-POP 댄스/록 팝
        EMOTION_SEARCH_QUERIES.put("분노", List.of(
                "강렬한 KPOP 댄스", "Rock Pop", "비트 빠른 JPOP",
                "KPOP 강렬한 댄스곡", "Aggressive Pop", "JPOP 빠른 비트",
                "KPOP 힙합 팝", "Powerful KPOP", "JPOP 록 팝", "KPOP 퍼포먼스 곡"));

        // 불안: 차분한 K-POP/POP 어쿠스틱
        EMOTION_SEARCH_QUERIES.put("불안", List.of(
                "차분한 KPOP 어쿠스틱", "Calm Pop", "잔잔한 JPOP",
                "KPOP 잔잔한 곡", "Relaxing Pop Music", "JPOP 차분한 발라드",
                "KPOP 어쿠스틱 커버", "Peaceful Pop", "JPOP 잔잔한 곡", "KPOP 트로트 발라드"));

        // 무기력: 에너지 충전 K-POP/POP 업템포
        EMOTION_SEARCH_QUERIES.put("무기력", List.of(
                "에너지 충전 KPOP", "Energetic Pop", "Upbeat JPOP",
                "KPOP 댄스 팝", "Motivational Pop", "JPOP 신나는 곡",
                "KPOP 활동곡", "High Energy Pop", "JPOP 댄스곡", "KPOP 템포 빠른 곡"));

        // 행복: 밝고 경쾌한 K-POP/POP
        EMOTION_SEARCH_QUERIES.put("행복", List.of(
                "밝은 KPOP 곡", "Cheerful Pop", "경쾌한 JPOP",
                "KPOP 해피송", "Happy Vibes Pop", "JPOP 밝은 곡",
                "KPOP 경쾌한 댄스곡", "Positive Pop", "JPOP 해피 팝", "KPOP 기분 좋은 곡"));

        // 설렘: 로맨틱한 K-POP 발라드/POP 발라드
        EMOTION_SEARCH_QUERIES.put("설렘", List.of(
                "로맨틱한 KPOP", "Romantic Pop", "설렘 JPOP",
                "KPOP 커플곡", "Love Pop Songs", "JPOP 로맨틱 발라드",
                "KPOP 사랑송", "Sweet Pop", "JPOP 연애송", "KPOP 감성 러브송"));

        // 외로움: 쓸쓸한 K-POP 발라드/인디 팝
        EMOTION_SEARCH_QUERIES.put("외로움", List.of(
                "쓸쓸한 KPOP 발라드", "Lonely Pop", "외로운 JPOP",
                "KPOP 쓸쓸한 곡", "Melancholy Pop", "JPOP 외로움 발라드",
                "KPOP 감성 곡", "Sad Korean Ballad", "JPOP 쓸쓸한 노래", "KPOP 인디 팝"));

        // 안정: 편안한 K-POP/POP 어쿠스틱
        EMOTION_SEARCH_QUERIES.put("안정", List.of(
                "편안한 KPOP 어쿠스틱", "Peaceful Pop", "차분한 JPOP",
                "KPOP 힐링곡", "Calm Down Pop", "JPOP 편안한 곡",
                "KPOP 잔잔한 어쿠스틱", "Soothing Pop", "JPOP 힐링 발라드", "KPOP 라운지 팝"));

        // 희망: 긍정적인 K-POP/POP 업템포
        EMOTION_SEARCH_QUERIES.put("희망", List.of(
                "힘이 되는 KPOP", "Hopeful Pop", "Positive JPOP",
                "KPOP 동기부여 곡", "Inspiring Pop", "JPOP 희망찬 곡",
                "KPOP 응원가", "Uplifting Pop", "JPOP 긍정적인 곡", "KPOP 에너지 곡"));
    }

    /**
     * YouTube API 를 통해 추천 데이터를 수집하고 DB 에 저장합니다.
     * 기존 데이터를 삭제하지 않고, 중복 체크만 해서 새 데이터만 추가합니다.
     */
    public void collectYouTubeRecommendations() {
        log.info("=== YouTube 추천 데이터 수집 시작 ===");
        log.info("YouTube API 키 설정 여부: {}", youtubeApiKey != null && !youtubeApiKey.isEmpty() ? "설정됨" : "미설정");
        log.info("YouTube API Base URL: {}", youtubeBaseUrl);
        log.info("최대 결과 수: {}", maxResults);
        log.info("총 감정 종류 수: {}", EMOTION_SEARCH_QUERIES.size());

        int totalQueries = EMOTION_SEARCH_QUERIES.values().stream().mapToInt(List::size).sum();
        log.info("총 검색어 수: {}", totalQueries);

        int savedCount = 0;
        int skippedCount = 0;

        for (Map.Entry<String, List<String>> entry : EMOTION_SEARCH_QUERIES.entrySet()) {
            String emotion = entry.getKey();
            List<String> searchQueries = entry.getValue();

            log.info("감정: {} - 검색어 {} 개 조회", emotion, searchQueries.size());
            log.debug("감정 {} 검색어 목록: {}", emotion, searchQueries);

            for (String query : searchQueries) {
                try {
                    List<YouTubeVideo> videos = searchYouTubeVideos(query, emotion);
                    log.info("감정 {} 검색어 '{}'로 {}개의 비디오를 찾았습니다.", emotion, query, videos.size());

                    if (videos.isEmpty()) {
                        log.info("검색 결과가 없습니다. 기존 데이터를 유지합니다.");
                        continue;
                    }

                    // 제목 필터링 적용 (1 시간 반복, cover, playlist 등 제외)
                    videos = filterVideosByTitle(videos);
                    log.info("감정 {} 검색어 '{}'로 {}개의 비디오를 찾았습니다. (제목 필터링 후)", emotion, query, videos.size());

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
    // 종교 음악 (CCM, 찬양, 예배 등) 을 강력하게 배제하기 위한 키워드 추가
    private static final String NEGATIVE_KEYWORDS = " -\"브이로그\" -\"룩북\" -\"vlog\" -\"lookbook\" -\"playlist\" -\"teaser\" -\"티저\" -\"cover\" -\"커버\" -\"모음\" -\"1 시간\" -\"1 hour\" -\"loop\" -\"반복\" -\"CCM\" -\"찬양\" -\"예배\" -\"교회\" -\"worship\" -\"hymn\" -\"종교\" -\"찬송\" -\"가스펠\" -\"은혜\"";

    // 공식 뮤직비디오만 검색하기 위한 접미사
    private static final String OFFICIAL_MV_SUFFIX = " Official MV";

    // 필터링할 키워드들 (공식 MV 가 아닌 영상 제외)
    private static final List<String> FILTER_KEYWORDS = List.of(
            "1 시간", "1 시간반", "1 hour", "1-hour", "1hour",
            "loop", "looping", "반복", "무한반복",
            "playlist", "플레이리스트", "모음", "모음집",
            "cover", "커버", "acoustic cover", "piano cover",
            "vlog", "브이로그", "룩북", "lookbook",
            "reaction", "리액션", "listening", "감상",
            "lyrics", "가사", "lyric video", "lyric",
            "live", "라이브", "concert", "콘서트",
            "performance", "퍼포먼스", "stage", "무대");

    /**
     * YouTube Search API 를 호출하여 비디오 목록을 가져옵니다.
     * - type=video: 재생목록이나 채널 배제
     * - videoCategoryId=10: YouTube 카테고리 10 번 = Music
     * - 검색어에 "Official MV" 접미사 추가하여 공식 뮤직비디오만 검색
     * - 마이너스 키워드: 브이로그, 룩북 등 관련 없는 콘텐츠 필터링
     */
    private List<YouTubeVideo> searchYouTubeVideos(String query, String emotion) {
        // 검색어에 "Official MV" 접미사와 마이너스 키워드 추가
        String optimizedQuery = query + OFFICIAL_MV_SUFFIX + NEGATIVE_KEYWORDS;

        String url = String.format("%s/search?part=snippet&maxResults=%d&q=%s&type=video&videoCategoryId=10&key=%s",
                youtubeBaseUrl, maxResults, encodeQuery(optimizedQuery), youtubeApiKey);

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

        // 영상 길이 필터링: 1 분 미만 영상 제외
        return filterVideosByDuration(videos);
    }

    /**
     * 영상 길이를 필터링합니다.
     * - YouTube Data API v3 는 검색 시 duration 파라미터를 지원하지 않으므로,
     * 비디오 상세 정보를 조회하여 길이를 확인합니다.
     * - 1 분 (60 초) 미만의 짧은 영상은 제외합니다.
     */
    private List<YouTubeVideo> filterVideosByDuration(List<YouTubeVideo> videos) {
        List<YouTubeVideo> filteredVideos = new ArrayList<>();
        int skippedCount = 0;

        for (YouTubeVideo video : videos) {
            try {
                // 비디오 상세 정보를 조회하여 길이 확인
                YouTubeVideoDetails details = getVideoDetails(video.getVideoId());

                if (details != null && details.getDurationSeconds() >= 60) {
                    filteredVideos.add(video);
                } else {
                    skippedCount++;
                }
            } catch (Exception e) {
                log.debug("비디오 상세 정보 조회 실패 (스킵): {}", video.getVideoId());
                // 오류 발생 시에도 영상은 포함 (필터링 실패 시에는 포함)
                filteredVideos.add(video);
            }
        }

        log.debug("영상 길이 필터링 완료: {}개 중 {}개 제외", videos.size(), skippedCount);
        return filteredVideos;
    }

    /**
     * 영상 제목을 필터링합니다.
     * - "1 시간", "loop", "cover", "playlist" 등 공식 MV 가 아닌 영상은 제외합니다.
     */
    private List<YouTubeVideo> filterVideosByTitle(List<YouTubeVideo> videos) {
        List<YouTubeVideo> filteredVideos = new ArrayList<>();
        int skippedCount = 0;

        for (YouTubeVideo video : videos) {
            String title = video.getTitle().toLowerCase();
            boolean shouldSkip = false;

            for (String keyword : FILTER_KEYWORDS) {
                if (title.contains(keyword.toLowerCase())) {
                    shouldSkip = true;
                    log.debug("제목 필터링으로 스킵: {} (키워드: {})", video.getTitle(), keyword);
                    break;
                }
            }

            if (!shouldSkip) {
                filteredVideos.add(video);
            } else {
                skippedCount++;
            }
        }

        log.info("제목 필터링 완료: {}개 중 {}개 제외", videos.size(), skippedCount);
        return filteredVideos;
    }

    /**
     * YouTube Video API 를 호출하여 비디오 상세 정보를 가져옵니다.
     */
    private YouTubeVideoDetails getVideoDetails(String videoId) {
        String url = String.format("%s/videos?part=contentDetails&id=%s&key=%s",
                youtubeBaseUrl, videoId, youtubeApiKey);

        try {
            YouTubeVideoDetailsResponse response = restTemplate.getForObject(url, YouTubeVideoDetailsResponse.class);

            if (response == null || response.getItems() == null || response.getItems().isEmpty()) {
                return null;
            }

            YouTubeVideoDetails details = new YouTubeVideoDetails();
            String duration = response.getItems().get(0).getContentDetails().getDuration();
            details.setDurationSeconds(parseDuration(duration));
            return details;
        } catch (Exception e) {
            log.debug("비디오 상세 정보 조회 실패: {}", e.getMessage());
            return null;
        }
    }

    /**
     * ISO 8601 형식 지속 시간을 초 단위로 변환합니다.
     * 예: PT1M30S -> 90 초, PT2M -> 120 초
     */
    private int parseDuration(String duration) {
        try {
            if (duration == null || !duration.startsWith("PT")) {
                return 0;
            }

            int seconds = 0;
            String timePart = duration.substring(2); // "PT" 제거

            // 시간 (H)
            int hoursIndex = timePart.indexOf('H');
            if (hoursIndex != -1) {
                seconds += Integer.parseInt(timePart.substring(0, hoursIndex)) * 3600;
                timePart = timePart.substring(hoursIndex + 1);
            }

            // 분 (M)
            int minutesIndex = timePart.indexOf('M');
            if (minutesIndex != -1) {
                seconds += Integer.parseInt(timePart.substring(0, minutesIndex)) * 60;
                timePart = timePart.substring(minutesIndex + 1);
            }

            // 초 (S)
            if (!timePart.isEmpty()) {
                seconds += Integer.parseInt(timePart.substring(0, timePart.indexOf('S')));
            }

            return seconds;
        } catch (Exception e) {
            return 0;
        }
    }

    // ==================== DTO 클래스 ====================

    /**
     * YouTube Video API 응답 DTO
     */
    public static class YouTubeVideoDetailsResponse {
        private List<Item> items;

        public List<Item> getItems() {
            return items;
        }

        public void setItems(List<Item> items) {
            this.items = items;
        }

        public static class Item {
            private ContentDetails contentDetails;

            public ContentDetails getContentDetails() {
                return contentDetails;
            }

            public void setContentDetails(ContentDetails contentDetails) {
                this.contentDetails = contentDetails;
            }
        }

        public static class ContentDetails {
            private String duration;

            public String getDuration() {
                return duration;
            }

            public void setDuration(String duration) {
                this.duration = duration;
            }
        }
    }

    /**
     * YouTube 비디오 상세 정보 DTO
     */
    public static class YouTubeVideoDetails {
        private int durationSeconds;

        public int getDurationSeconds() {
            return durationSeconds;
        }

        public void setDurationSeconds(int durationSeconds) {
            this.durationSeconds = durationSeconds;
        }
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