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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class MovieCrawlingService {

    private final RecommendationRepository recommendationRepository;

    // 감정별 검색어 매핑
    private static final Map<String, String> EMOTION_SEARCH_QUERIES = new HashMap<>();

    static {
        EMOTION_SEARCH_QUERIES.put("기쁨", "코미디");
        EMOTION_SEARCH_QUERIES.put("슬픔", "감동");
        EMOTION_SEARCH_QUERIES.put("분노", "액션");
        EMOTION_SEARCH_QUERIES.put("불안", "힐링");
        EMOTION_SEARCH_QUERIES.put("무기력", "인생");
    }

    /**
     * 다음 통합검색에서 영화 데이터를 크롤링하여 DB 에 저장합니다.
     * 기존 데이터를 삭제하지 않고, 중복 체크만 해서 새 데이터만 추가합니다.
     */
    public void crawlNetflixWatchaMovies() {
        log.info("=== 다음 통합검색 영화 크롤링 시작 ===");

        int savedCount = 0;
        int skippedCount = 0;

        for (Map.Entry<String, String> entry : EMOTION_SEARCH_QUERIES.entrySet()) {
            String emotion = entry.getKey();
            String searchQuery = entry.getValue();

            log.info("감정: {} - 검색어: {}", emotion, searchQuery);

            try {
                List<MovieInfo> movies = crawlDaumSearch(searchQuery);
                log.info("감정 {} 검색어 '{}'로 {}개의 영화를 찾았습니다.", emotion, searchQuery, movies.size());

                if (movies.isEmpty()) {
                    log.info("검색 결과가 없습니다. 기존 데이터를 유지합니다.");
                    continue;
                }

                savedCount += saveMoviesToDatabase(movies, emotion);
                skippedCount += movies.size();
            } catch (IOException e) {
                log.error("다음 통합검색 크롤링 실패 (감정: {}, 검색어: {}): {}", emotion, searchQuery, e.getMessage(), e);
            }
        }

        log.info("=== 다음 통합검색 영화 크롤링 완료 ===");
        log.info("저장된 데이터 수: {}, 중복 스킵된 데이터 수: {}", savedCount, skippedCount);
    }

    /**
     * 다음 통합검색 페이지를 크롤링합니다.
     * URL: https://search.daum.net/search?w=tot&q={검색어}+영화
     */
    private List<MovieInfo> crawlDaumSearch(String query) throws IOException {
        String encodedQuery = java.net.URLEncoder.encode(query, java.nio.charset.StandardCharsets.UTF_8);
        String url = "https://search.daum.net/search?w=tot&q=" + encodedQuery + "+영화";

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

        List<MovieInfo> movies = new ArrayList<>();

        // 다음 통합검색 영화 항목: div.coll_cont li a.link_txt, div.info_tit a
        Elements titleElements = doc.select("div.coll_cont li a.link_txt, div.info_tit a");

        log.info("다음 통합검색 영화 제목 요소 수: {}", titleElements.size());

        for (int i = 0; i < titleElements.size(); i++) {
            Element titleElement = titleElements.get(i);
            try {
                MovieInfo movie = new MovieInfo();

                // === 제목 추출: a.link_txt, div.info_tit a ===
                String title = titleElement.text().trim();

                // === 상세 페이지 URL 추출 ===
                String detailUrl = titleElement.attr("abs:href").trim();

                // === 이미지 추출: 해당 li 또는 div.info_tit 의 img ===
                Element parentElement = titleElement.parent();
                Element imageElement = null;
                if (parentElement != null) {
                    imageElement = parentElement.selectFirst("img");
                }
                String imageUrl = null;
                if (imageElement != null) {
                    imageUrl = imageElement.attr("abs:data-src").trim();
                    if (imageUrl.isEmpty()) {
                        imageUrl = imageElement.attr("abs:src").trim();
                    }
                }

                // === 줄거리 추출: p.desc ===
                Element synopsisElement = parentElement.selectFirst("p.desc");
                String synopsis = null;
                if (synopsisElement != null) {
                    synopsis = synopsisElement.text().trim();
                    if (synopsis.length() > 100) {
                        synopsis = synopsis.substring(0, 100) + "...";
                    }
                }

                // 추출된 데이터 로그 출력
                log.info("추출 시도 ({}): 제목: {}, 포스터: {}, 줄거리: {}, URL: {}",
                        i, title, imageUrl, synopsis, detailUrl);

                // 유효한 데이터만 추가 (제목은 필수)
                if (title != null && !title.isEmpty()) {
                    movie.setTitle(title);
                    movie.setSynopsis(synopsis != null ? synopsis : "줄거리 정보 없음");
                    movie.setImageUrl(imageUrl != null ? imageUrl : "");
                    movie.setDetailUrl(detailUrl != null ? detailUrl : "");
                    movies.add(movie);
                }

            } catch (Exception e) {
                log.debug("영화 파싱 실패 ({}): {}", i, e.getMessage());
            }
        }

        log.info("다음 통합검색에서 {}개의 영화를 찾았습니다.", movies.size());
        return movies;
    }

    /**
     * 파싱한 영화 데이터를 DB 에 저장합니다.
     * 중복 저장을 방지합니다 (content_url 기준).
     * content_url 이 null 인 경우 절대 저장하지 않습니다.
     */
    private int saveMoviesToDatabase(List<MovieInfo> movies, String emotion) {
        int savedCount = 0;

        for (MovieInfo movie : movies) {
            // 제목 길이 제한 (최대 200 자)
            String title = movie.getTitle().trim();
            if (title.length() > 200) {
                title = title.substring(0, 200);
                log.debug("제목 길이가 200 자를 초과하여 잘림: {}", movie.getTitle());
            }

            // 설명: 제목 + 줄거리 조합
            String description = String.format("%s | %s", title, movie.getSynopsis().trim());
            // 설명 길이 제한 (TEXT 이지만 너무 길면 잘라냄 - 최대 1000 자)
            if (description.length() > 1000) {
                description = description.substring(0, 1000);
                log.debug("설명 길이가 1000 자를 초과하여 잘림");
            }

            // 이미지 URL 정리
            String imageUrl = movie.getImageUrl() != null ? movie.getImageUrl().trim() : "";

            // URL 이 있으면 contentUrl 로 사용, 없으면 제목 기반 URL 생성
            String contentUrl = movie.getDetailUrl() != null && !movie.getDetailUrl().isEmpty()
                    ? movie.getDetailUrl().trim()
                    : "https://search.daum.net/search?w=tot&q="
                            + java.net.URLEncoder.encode(title, java.nio.charset.StandardCharsets.UTF_8) + "+영화";

            // 중복 체크 (URL 기준)
            boolean exists = recommendationRepository.findByContentUrl(contentUrl).isPresent();
            if (exists) {
                log.debug("중복 데이터 스킵: {}", contentUrl);
                continue;
            }

            // 카테고리 고정: 무조건 'MOVIE'
            Recommendation recommendation = Recommendation.builder()
                    .emotion(emotion)
                    .category("MOVIE")
                    .title(title)
                    .description(description)
                    .imageUrl(imageUrl)
                    .contentUrl(contentUrl)
                    .build();

            recommendationRepository.save(recommendation);
            savedCount++;
            log.info("DB 저장 완료: {} (감정: {})", title, emotion);
        }

        return savedCount;
    }

    /**
     * 영화 정보 DTO
     */
    public static class MovieInfo {
        private String title;
        private String synopsis;
        private String imageUrl;
        private String detailUrl;

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public String getSynopsis() {
            return synopsis;
        }

        public void setSynopsis(String synopsis) {
            this.synopsis = synopsis;
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