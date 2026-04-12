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
public class BookCrawlingService {

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
     * 교보문고 PC 버전에서 추천 도서를 크롤링하여 DB 에 저장합니다.
     * 기존 데이터를 삭제하지 않고, 중복 체크만 해서 새 데이터만 추가합니다.
     */
    public void crawlKyoboBooks() {
        log.info("=== 교보문고 PC 버전 도서 크롤링 시작 ===");

        int savedCount = 0;
        int skippedCount = 0;

        for (Map.Entry<String, String> entry : EMOTION_SEARCH_QUERIES.entrySet()) {
            String emotion = entry.getKey();
            String searchQuery = entry.getValue();

            log.info("감정: {} - 검색어: {}", emotion, searchQuery);

            try {
                List<BookInfo> books = crawlKyoboSearch(searchQuery);
                log.info("감정 {} 검색어 '{}'로 {}개의 도서를 찾았습니다.", emotion, searchQuery, books.size());

                if (books.isEmpty()) {
                    log.info("검색 결과가 없습니다. 기존 데이터를 유지합니다.");
                    continue;
                }

                savedCount += saveBooksToDatabase(books, emotion);
                skippedCount += books.size();
            } catch (IOException e) {
                log.error("교보문고 검색 크롤링 실패 (감정: {}, 검색어: {}): {}", emotion, searchQuery, e.getMessage(), e);
            }
        }

        log.info("=== 교보문고 PC 버전 도서 크롤링 완료 ===");
        log.info("저장된 데이터 수: {}, 중복 스킵된 데이터 수: {}", savedCount, skippedCount);
    }

    /**
     * 교보문고 PC 버전 검색 페이지를 크롤링합니다.
     * URL: https://search.kyobobook.co.kr/search?keyword={검색어}
     */
    private List<BookInfo> crawlKyoboSearch(String query) throws IOException {
        String encodedQuery = java.net.URLEncoder.encode(query, java.nio.charset.StandardCharsets.UTF_8);
        String url = "https://search.kyobobook.co.kr/search?keyword=" + encodedQuery;

        log.debug("교보문고 PC 버전 검색 API 호출: {}", url);

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

        List<BookInfo> books = new ArrayList<>();

        // 교보문고 검색 항목: div.prod_area
        Elements bookElements = doc.select("div.prod_area");

        log.info("교보문고 검색 항목 수: {}", bookElements.size());

        for (int i = 0; i < bookElements.size(); i++) {
            Element bookElement = bookElements.get(i);
            try {
                BookInfo book = new BookInfo();

                // === 제목 추출: a.prod_info 내부의 span:not(.prod_category) 또는 span[id^=cmdtName] ===
                Element titleElement = bookElement
                        .selectFirst("a.prod_info span:not(.prod_category), a.prod_info span[id^=cmdtName]");
                String title = null;
                if (titleElement != null) {
                    title = titleElement.text().trim();
                }

                // === 구매 링크 추출: a.prod_info 의 href 속성 ===
                Element prodInfoLink = bookElement.selectFirst("a.prod_info");
                String purchaseUrl = null;
                if (prodInfoLink != null) {
                    purchaseUrl = prodInfoLink.attr("abs:href").trim();
                }

                // === 저자 추출: span.author ===
                Element authorElement = bookElement.selectFirst("span.author, .author");
                String author = null;
                if (authorElement != null) {
                    author = authorElement.text().trim();
                }

                // === 설명 추출: p.desc, .desc ===
                Element descElement = bookElement.selectFirst("p.desc, .desc, p.desc_area");
                String description = null;
                if (descElement != null) {
                    description = descElement.text().trim();
                    if (description.length() > 100) {
                        description = description.substring(0, 100) + "...";
                    }
                }

                // === 이미지 추출: .img_box img 우선 ===
                Element imageElement = bookElement.selectFirst(".img_box img");
                String imageUrl = null;
                if (imageElement != null) {
                    imageUrl = imageElement.attr("abs:data-src").trim();
                    if (imageUrl.isEmpty()) {
                        imageUrl = imageElement.attr("abs:src").trim();
                    }
                }

                // 추출된 데이터 로그 출력
                log.info("추출 시도 ({}): 제목: {}, 포스터: {}, 저자: {}, URL: {}",
                        i, title, imageUrl, author, purchaseUrl);

                // 유효한 데이터만 추가 (제목과 구매 링크는 필수)
                if (title != null && !title.isEmpty() && purchaseUrl != null && !purchaseUrl.isEmpty()) {
                    book.setTitle(title);
                    book.setAuthor(author != null ? author : "저자 정보 없음");
                    book.setDescription(description != null ? description : "설명 정보 없음");
                    book.setImageUrl(imageUrl != null ? imageUrl : "");
                    book.setPurchaseUrl(purchaseUrl);
                    books.add(book);
                    log.debug("교보문고 추출 완료 ({}): {}", i, title);
                }

            } catch (Exception e) {
                log.debug("교보문고 파싱 실패 ({}): {}", i, e.getMessage());
            }
        }

        log.info("교보문고 검색에서 {}개의 도서를 찾았습니다.", books.size());
        return books;
    }

    /**
     * 파싱한 도서 데이터를 DB 에 저장합니다.
     * 중복 저장을 방지합니다 (content_url 기준).
     * content_url 이 null 인 경우 절대 저장하지 않습니다.
     */
    private int saveBooksToDatabase(List<BookInfo> books, String emotion) {
        int savedCount = 0;

        for (BookInfo book : books) {
            // 구매 URL 이 비어있으면 저장하지 않음 (필수 검증)
            if (book.getPurchaseUrl() == null || book.getPurchaseUrl().isEmpty()) {
                log.debug("구매 URL 이 비어있어 저장 스킵: {}", book.getTitle());
                continue;
            }

            // 이미 동일한 구매 URL 이 있는지 확인
            boolean exists = recommendationRepository.findByContentUrl(book.getPurchaseUrl()).isPresent();
            if (exists) {
                log.debug("중복 데이터 스킵: {}", book.getPurchaseUrl());
                continue;
            }

            // 제목 길이 제한 (최대 200 자)
            String title = book.getTitle().trim();
            if (title.length() > 200) {
                title = title.substring(0, 200);
                log.debug("제목 길이가 200 자를 초과하여 잘림: {}", book.getTitle());
            }

            // 설명: 제목 + 저자 + 설명 조합
            String description = String.format("%s | 저자: %s | %s",
                    title, book.getAuthor().trim(), book.getDescription().trim());
            // 설명 길이 제한 (최대 1000 자)
            if (description.length() > 1000) {
                description = description.substring(0, 1000);
                log.debug("설명 길이가 1000 자를 초과하여 잘림");
            }

            // 이미지 URL 정리
            String imageUrl = book.getImageUrl() != null ? book.getImageUrl().trim() : "";

            // 카테고리 고정: 무조건 'BOOK'
            Recommendation recommendation = Recommendation.builder()
                    .emotion(emotion)
                    .category("BOOK")
                    .title(title)
                    .description(description)
                    .imageUrl(imageUrl)
                    .contentUrl(book.getPurchaseUrl().trim())
                    .build();

            recommendationRepository.save(recommendation);
            savedCount++;
            log.info("DB 저장 완료: {} (감정: {})", title, emotion);
        }

        return savedCount;
    }

    /**
     * 도서 정보 DTO
     */
    public static class BookInfo {
        private String title;
        private String author;
        private String description;
        private String imageUrl;
        private String purchaseUrl;

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public String getAuthor() {
            return author;
        }

        public void setAuthor(String author) {
            this.author = author;
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

        public String getPurchaseUrl() {
            return purchaseUrl;
        }

        public void setPurchaseUrl(String purchaseUrl) {
            this.purchaseUrl = purchaseUrl;
        }
    }
}