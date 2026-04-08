package com.freesia.backend.recommendation.config;

import com.freesia.backend.recommendation.entity.Recommendation;
import com.freesia.backend.recommendation.repository.RecommendationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class RecommendationDataSeeder implements CommandLineRunner {

        private final RecommendationRepository recommendationRepository;

        @Override
        public void run(String... args) throws Exception {
                // 이미 데이터가 있으면 시딩하지 않음
                if (recommendationRepository.count() > 0) {
                        return;
                }

                List<Recommendation> recommendations = parseRecommendationsFromCSV();
                recommendationRepository.saveAll(recommendations);
        }

        /**
         * CSV 파일에서 추천 데이터를 파싱합니다.
         */
        private List<Recommendation> parseRecommendationsFromCSV() {
                List<Recommendation> recommendations = new ArrayList<>();

                try {
                        ClassPathResource resource = new ClassPathResource("data/recommendations.csv");
                        try (BufferedReader reader = new BufferedReader(
                                        new InputStreamReader(resource.getInputStream()))) {
                                String line;
                                boolean isFirstLine = true;

                                while ((line = reader.readLine()) != null) {
                                        // 헤더 줄 건너뛰기
                                        if (isFirstLine) {
                                                isFirstLine = false;
                                                continue;
                                        }

                                        // 빈 줄 건너뛰기
                                        if (line.trim().isEmpty()) {
                                                continue;
                                        }

                                        Recommendation recommendation = parseCSVLine(line);
                                        if (recommendation != null) {
                                                recommendations.add(recommendation);
                                        }
                                }
                        }
                } catch (IOException e) {
                        throw new RuntimeException("CSV 파일 읽기 실패", e);
                }

                return recommendations;
        }

        /**
         * CSV 한 줄을 Recommendation 엔티티로 파싱합니다.
         * 큰따옴표로 감싸진 필드 내의 쉼표도 올바르게 처리합니다.
         */
        private Recommendation parseCSVLine(String line) {
                try {
                        // CSV 파싱: 큰따옴표 안의 쉼표를 구분자로 인식하지 않도록 정규식 사용
                        String[] fields = splitCSVLine(line);

                        if (fields.length < 6) {
                                System.err.println("잘못된 CSV 형식: " + line);
                                return null;
                        }

                        String emotion = fields[0].trim();
                        String category = fields[1].trim();
                        String title = fields[2].trim();
                        String description = fields[3].trim();
                        String imageUrl = fields[4].trim();
                        String contentUrl = fields[5].trim();

                        // 큰따옴표 제거 (필요한 경우)
                        title = unquote(title);
                        description = unquote(description);
                        imageUrl = unquote(imageUrl);
                        contentUrl = unquote(contentUrl);

                        return Recommendation.builder()
                                        .emotion(emotion)
                                        .category(category)
                                        .title(title)
                                        .description(description)
                                        .imageUrl(imageUrl.isEmpty() ? null : imageUrl)
                                        .contentUrl(contentUrl.isEmpty() ? null : contentUrl)
                                        .build();

                } catch (Exception e) {
                        System.err.println("CSV 파싱 오류: " + line);
                        e.printStackTrace();
                        return null;
                }
        }

        /**
         * CSV 한 줄을 올바르게 분할합니다.
         * 큰따옴표로 감싸진 필드 내의 쉼표는 구분자로 처리하지 않습니다.
         */
        private String[] splitCSVLine(String line) {
                List<String> fields = new ArrayList<>();
                StringBuilder currentField = new StringBuilder();
                boolean inQuotes = false;

                for (int i = 0; i < line.length(); i++) {
                        char c = line.charAt(i);

                        if (c == '"') {
                                // 이스케이프된 따옴표 ("") 인 경우
                                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                                        currentField.append('"');
                                        i++; // 다음 따옴표 건너뛰기
                                } else {
                                        inQuotes = !inQuotes;
                                }
                        } else if (c == ',' && !inQuotes) {
                                fields.add(currentField.toString());
                                currentField.setLength(0);
                        } else {
                                currentField.append(c);
                        }
                }

                // 마지막 필드 추가
                fields.add(currentField.toString());

                return fields.toArray(new String[0]);
        }

        /**
         * 필드에서 큰따옴표를 제거합니다.
         */
        private String unquote(String value) {
                if (value == null || value.isEmpty()) {
                        return value;
                }
                if (value.startsWith("\"") && value.endsWith("\"")) {
                        return value.substring(1, value.length() - 1);
                }
                return value;
        }
}