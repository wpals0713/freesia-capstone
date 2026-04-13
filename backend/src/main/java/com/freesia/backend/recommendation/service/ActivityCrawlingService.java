package com.freesia.backend.recommendation.service;

import com.freesia.backend.recommendation.entity.Recommendation;
import com.freesia.backend.recommendation.repository.RecommendationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ActivityCrawlingService {

    private final RecommendationRepository recommendationRepository;

    // 감정별 모바일 네이버 블로그 검색어 매핑
    private static final Map<String, String> EMOTION_SEARCH_QUERIES = new HashMap<>();

    static {
        EMOTION_SEARCH_QUERIES.put("기쁨", "친구와 즐기기 좋은 야외 활동");
        EMOTION_SEARCH_QUERIES.put("슬픔", "혼자 사색하기 좋은 산책 코스");
        EMOTION_SEARCH_QUERIES.put("분노", "스트레스 풀리는 고강도 운동");
        EMOTION_SEARCH_QUERIES.put("불안", "마음 안정을 돕는 명상과 요가");
        EMOTION_SEARCH_QUERIES.put("무기력", "성취감을 주는 작은 취미 활동");
    }

    /**
     * 모바일 네이버 블로그에서 감정별 추천 활동을 크롤링하여 DB 에 저장합니다.
     * 기존 데이터를 삭제하지 않고, 중복 체크만 해서 새 데이터만 추가합니다.
     */
    public void crawlNaverBlogs() {
        log.info("=== 모바일 네이버 블로그 활동 크롤링 시작 ===");

        int savedCount = 0;
        int skippedCount = 0;

        for (Map.Entry<String, String> entry : EMOTION_SEARCH_QUERIES.entrySet()) {
            String emotion = entry.getKey();
            String searchQuery = entry.getValue();

            log.info("감정: {} - 검색어: {}", emotion, searchQuery);

            try {
                List<ActivityInfo> activities = searchNaverBlogs(searchQuery);
                log.info("감정 {} 검색어 '{}'로 {}개의 활동을 찾았습니다.", emotion, searchQuery, activities.size());

                if (activities.isEmpty()) {
                    log.info("검색 결과가 없습니다. 기존 데이터를 유지합니다.");
                    continue;
                }

                savedCount += saveActivitiesToDatabase(activities, emotion);
                skippedCount += activities.size();
            } catch (IOException e) {
                log.error("모바일 네이버 블로그 검색 실패 (감정: {}, 검색어: {}): {}", emotion, searchQuery, e.getMessage(), e);
            }
        }

        log.info("=== 모바일 네이버 블로그 활동 크롤링 완료 ===");
        log.info("저장된 데이터 수: {}, 중복 스킵된 데이터 수: {}", savedCount, skippedCount);
    }

    /**
     * 다음 (Daum) 검색 결과 페이지를 크롤링합니다.
     * 영화 135 개를 낚았던 '다음'의 기운을 빌려와서 활동도 무조건 터지게!
     * 타겟 URL: https://search.daum.net/search?w=tot&q={검색어}
     */
    private List<ActivityInfo> searchNaverBlogs(String query) throws IOException {
        String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8);
        // 다음 통합검색 주소 사용 (영화 135 개를 낚았던 곳!)
        String url = "https://search.daum.net/search?w=tot&q=" + encodedQuery;

        log.debug("다음 통합검색 API 호출: {}", url);

        // 실제 브라우저 User-Agent 설정
        String userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 Edg/132.0.0.0";

        Document doc = Jsoup.connect(url)
                .userAgent(userAgent)
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
                .header("Accept-Language", "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7")
                .header("Referer", "https://www.google.com/")
                .referrer("https://www.google.com/")
                .timeout(10000)
                .followRedirects(true)
                .ignoreHttpErrors(true)
                .get();

        log.info("페이지 제목: {}", doc.title());
        log.info("페이지 상태: {}", doc.location());

        List<ActivityInfo> activities = new ArrayList<>();

        // 다음 통합검색 리스트: div.coll_cont li, div.wrap_cont (영화 135 개를 낚았던 그물!)
        Elements postElements = doc.select("div.coll_cont li, div.wrap_cont");

        log.info("검색 결과 다음 리스트 항목 수: {}", postElements.size());

        for (int i = 0; i < postElements.size(); i++) {
            Element postElement = postElements.get(i);
            try {
                ActivityInfo activity = new ActivityInfo();

                // === 제목 추출: a.link_txt, a.f_link_b (영화 135 개를 낚았던 선택자!) ===
                Element titleElement = postElement.selectFirst("a.link_txt, a.f_link_b");
                String title = null;
                if (titleElement != null) {
                    title = titleElement.text().trim();
                }

                // === 상세 페이지 URL 추출 ===
                String detailUrl = null;
                if (titleElement != null) {
                    detailUrl = titleElement.attr("abs:href").trim();
                }

                // === 이미지 추출 ===
                Element imageElement = postElement.selectFirst("img");
                String imageUrl = null;
                if (imageElement != null) {
                    imageUrl = imageElement.attr("abs:data-src").trim();
                    if (imageUrl.isEmpty()) {
                        imageUrl = imageElement.attr("abs:src").trim();
                    }
                }

                // === 설명 추출 ===
                Element descElement = postElement.selectFirst("p.desc, div.desc");
                String description = null;
                if (descElement != null) {
                    description = descElement.text().trim();
                    if (description.length() > 80) {
                        description = description.substring(0, 80) + "...";
                    }
                }

                // === 쓰레기 필터링: 제목이 너무 짧으면 스킵 ===
                if (title != null && title.length() <= 5) {
                    log.debug("쓰레기 필터링 스킵 ({}): {}", i, title);
                    continue;
                }

                // 추출된 데이터 로그 출력
                log.info("추출 시도 ({}): 제목: {}, 이미지: {}, 설명: {}, URL: {}",
                        i, title, imageUrl, description, detailUrl);

                // 유효한 데이터만 추가 (제목과 URL 은 필수)
                if (title != null && !title.isEmpty() && detailUrl != null && !detailUrl.isEmpty()) {
                    activity.setTitle(title);
                    activity.setDescription(description != null ? description : "설명 정보 없음");
                    activity.setImageUrl(imageUrl != null ? imageUrl : "");
                    activity.setDetailUrl(detailUrl);
                    activities.add(activity);
                }

            } catch (Exception e) {
                log.debug("활동 파싱 실패 ({}): {}", i, e.getMessage());
            }
        }

        log.info("다음 통합검색에서 {}개의 활동을 찾았습니다.", activities.size());
        return activities;
    }

    /**
     * 파싱한 활동 데이터를 DB 에 저장합니다.
     * 중복 저장을 방지합니다 (content_url 기준).
     * content_url 이 null 인 경우 절대 저장하지 않습니다.
     */
    private int saveActivitiesToDatabase(List<ActivityInfo> activities, String emotion) {
        int savedCount = 0;

        for (ActivityInfo activity : activities) {
            // URL 이 비어있으면 저장하지 않음 (필수 검증)
            if (activity.getDetailUrl() == null || activity.getDetailUrl().isEmpty()) {
                log.debug("URL 이 비어있어 저장 스킵: {}", activity.getTitle());
                continue;
            }

            // 이미 동일한 상세 페이지 URL 이 있는지 확인
            boolean existsByUrl = recommendationRepository.findByContentUrl(activity.getDetailUrl()).isPresent();
            if (existsByUrl) {
                log.debug("중복 데이터 스킵 (URL): {}", activity.getDetailUrl());
                continue;
            }

            // 제목 기반 중복 체크 (유사한 제목이 이미 있는지 확인)
            String cleanTitle = activity.getTitle().trim().toLowerCase();
            boolean existsByTitle = recommendationRepository.findByEmotion(emotion).stream()
                    .anyMatch(rec -> rec.getTitle().trim().toLowerCase().equals(cleanTitle));
            if (existsByTitle) {
                log.debug("중복 데이터 스킵 (제목): {}", activity.getTitle());
                continue;
            }

            // 제목 길이 제한 (최대 200 자)
            String title = activity.getTitle().trim();
            if (title.length() > 200) {
                title = title.substring(0, 200);
                log.debug("제목 길이가 200 자를 초과하여 잘림: {}", activity.getTitle());
            }

            // 설명: 제목 + 설명 조합
            String description = String.format("%s | %s", title, activity.getDescription().trim());
            // 설명 길이 제한 (최대 1000 자)
            if (description.length() > 1000) {
                description = description.substring(0, 1000);
                log.debug("설명 길이가 1000 자를 초과하여 잘림");
            }

            // 이미지 URL 정리
            String imageUrl = activity.getImageUrl() != null ? activity.getImageUrl().trim() : "";

            // 카테고리 고정: 무조건 'ACTIVITY'
            Recommendation recommendation = Recommendation.builder()
                    .emotion(emotion)
                    .category("ACTIVITY")
                    .title(title)
                    .description(description)
                    .imageUrl(imageUrl)
                    .contentUrl(activity.getDetailUrl().trim())
                    .build();

            recommendationRepository.save(recommendation);
            savedCount++;
            log.info("DB 저장 완료: {} (감정: {})", title, emotion);
        }

        return savedCount;
    }

    /**
     * 활동 정보 DTO
     */
    public static class ActivityInfo {
        private String title;
        private String description;
        private String imageUrl;
        private String detailUrl;

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

        public String getImageUrl() {
            return imageUrl;
        }

        public void setImageUrl(String imageUrl) {
            this.imageUrl = imageUrl;
        }

        public String getDetailUrl() {
            return detailUrl;
        }

        public void setDetailUrl(String detailUrl) {
            this.detailUrl = detailUrl;
        }
    }
}