package com.freesia.backend.recommendation.config;

import com.freesia.backend.recommendation.entity.Recommendation;
import com.freesia.backend.recommendation.repository.RecommendationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

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

                List<Recommendation> recommendations = List.of(
                                // 기쁨
                                Recommendation.builder()
                                                .emotion("기쁨")
                                                .category("MUSIC")
                                                .title("신나는 K-Pop 플레이리스트")
                                                .description("텐션을 하늘 끝까지 올려줄 신나는 음악 모음!")
                                                .imageUrl("https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg")
                                                .contentUrl("https://youtube.com")
                                                .build(),
                                Recommendation.builder()
                                                .emotion("기쁨")
                                                .category("HOBBY")
                                                .title("새로운 요리 도전")
                                                .description("기분 좋은 날, 평소 안 해본 특별한 요리를 만들어 보세요.")
                                                .imageUrl("")
                                                .contentUrl("")
                                                .build(),
                                Recommendation.builder()
                                                .emotion("기쁨")
                                                .category("ACTIVITY")
                                                .title("한강 피크닉")
                                                .description("날씨 좋은 날 친구들과 예쁜 돗자리를 펴고 피크닉 어때요?")
                                                .imageUrl("")
                                                .contentUrl("")
                                                .build(),
                                Recommendation.builder()
                                                .emotion("기쁨")
                                                .category("MOVIE")
                                                .title("라라랜드")
                                                .description("음악과 꿈, 그리고 사랑이 넘치는 눈과 귀가 즐거운 영화")
                                                .imageUrl(
                                                                "https://upload.wikimedia.org/wikipedia/ko/3/3a/%EB%9D%BC%EB%9D%BC%EB%9E%9C%EB%93%9C_%ED%8F%AC%EC%8A%A4%ED%84%B0.jpg")
                                                .contentUrl("")
                                                .build(),
                                Recommendation.builder()
                                                .emotion("기쁨")
                                                .category("BOOK")
                                                .title("아주 작은 습관의 힘")
                                                .description("긍정적인 에너지를 모아 새로운 목표를 세우기 좋은 책")
                                                .imageUrl("")
                                                .contentUrl("")
                                                .build(),

                                // 슬픔
                                Recommendation.builder()
                                                .emotion("슬픔")
                                                .category("MUSIC")
                                                .title("잔잔한 인디/어쿠스틱")
                                                .description("지친 마음을 따뜻하게 어루만져 주는 위로의 음악")
                                                .imageUrl("https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg")
                                                .contentUrl("https://youtube.com")
                                                .build(),
                                Recommendation.builder()
                                                .emotion("슬픔")
                                                .category("HOBBY")
                                                .title("다이어리 꾸미기")
                                                .description("따뜻한 차 한 잔과 함께 내 감정을 다이어리에 쏟아내 보세요.")
                                                .imageUrl("")
                                                .contentUrl("")
                                                .build(),
                                Recommendation.builder()
                                                .emotion("슬픔")
                                                .category("ACTIVITY")
                                                .title("이불 속 휴식")
                                                .description("포근한 이불 속에서 좋아하는 간식을 먹으며 푹 쉬어가는 시간")
                                                .imageUrl("")
                                                .contentUrl("")
                                                .build(),
                                Recommendation.builder()
                                                .emotion("슬픔")
                                                .category("MOVIE")
                                                .title("인사이드 아웃")
                                                .description("슬픔이라는 감정이 우리에게 주는 진짜 의미를 찾아가는 여정")
                                                .imageUrl(
                                                                "https://upload.wikimedia.org/wikipedia/ko/c/c5/%EC%9D%B8%EC%82%AC%EC%9D%B4%EB%93%9C_%EC%95%84%EC%9B%83_%ED%8F%AC%EC%8A%A4%ED%84%B0.jpg")
                                                .contentUrl("")
                                                .build(),
                                Recommendation.builder()
                                                .emotion("슬픔")
                                                .category("BOOK")
                                                .title("보편적인 시간")
                                                .description("누구에게나 찾아오는 슬픔에 대한 따뜻한 위로의 에세이")
                                                .imageUrl("")
                                                .contentUrl("")
                                                .build(),

                                // 분노
                                Recommendation.builder()
                                                .emotion("분노")
                                                .category("MUSIC")
                                                .title("록/메탈 히트곡 모음")
                                                .description("분노를 시원하게 발산할 수 있는 고음질 록 음악")
                                                .imageUrl("https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg")
                                                .contentUrl("https://youtube.com")
                                                .build(),
                                Recommendation.builder()
                                                .emotion("분노")
                                                .category("HOBBY")
                                                .title("클레이 아뜨")
                                                .description("점토를 주물러가며 스트레스를 해소하는 창의적인 취미")
                                                .imageUrl("")
                                                .contentUrl("")
                                                .build(),
                                Recommendation.builder()
                                                .emotion("분노")
                                                .category("ACTIVITY")
                                                .title("격렬한 운동")
                                                .description("-boxing, 인터벌 트레이닝 등 몸을 움직이며 분노를 날려버리자!")
                                                .imageUrl("")
                                                .contentUrl("")
                                                .build(),
                                Recommendation.builder()
                                                .emotion("분노")
                                                .category("MOVIE")
                                                .title("조커")
                                                .description("내면의 분노와 사회적 갈등을 강렬하게 표현한 영화")
                                                .imageUrl(
                                                                "https://upload.wikimedia.org/wikipedia/ko/d/d1/Joker_%ED%8F%AC%EC%8A%A4%ED%84%B0.jpg")
                                                .contentUrl("")
                                                .build(),
                                Recommendation.builder()
                                                .emotion("분노")
                                                .category("BOOK")
                                                .title("분노의 포도")
                                                .description("사회적 불평등에 대한 분노를 문학적으로 풀어낸 고전")
                                                .imageUrl("")
                                                .contentUrl("")
                                                .build(),

                                // 불안
                                Recommendation.builder()
                                                .emotion("불안")
                                                .category("MUSIC")
                                                .title("바이올린/클래식 명곡")
                                                .description("차분한 선율이 마음을 진정시켜 주는 클래식 모음")
                                                .imageUrl("https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg")
                                                .contentUrl("https://youtube.com")
                                                .build(),
                                Recommendation.builder()
                                                .emotion("불안")
                                                .category("HOBBY")
                                                .title("명상과 호흡 운동")
                                                .description("깊은 호흡과 명상으로 불안한 마음을 가라앉혀 보세요")
                                                .imageUrl("")
                                                .contentUrl("")
                                                .build(),
                                Recommendation.builder()
                                                .emotion("불안")
                                                .category("ACTIVITY")
                                                .title("산책")
                                                .description("자연 속을 천천히 걸으며 마음을 정리하는 시간")
                                                .imageUrl("")
                                                .contentUrl("")
                                                .build(),
                                Recommendation.builder()
                                                .emotion("불안")
                                                .category("MOVIE")
                                                .title("미드나잇 인 파리")
                                                .description("환상적이고 차분한 분위기의 영화로 마음을 편안하게")
                                                .imageUrl("https://upload.wikimedia.org/wikipedia/ko/9/9a/Midnight_in_Paris_poster.jpg")
                                                .contentUrl("")
                                                .build(),
                                Recommendation.builder()
                                                .emotion("불안")
                                                .category("BOOK")
                                                .title("마음의 기술")
                                                .description("불안한 마음을 다스리는 실용적인 심리학 가이드")
                                                .imageUrl("")
                                                .contentUrl("")
                                                .build(),

                                // 무기력
                                Recommendation.builder()
                                                .emotion("무기력")
                                                .category("MUSIC")
                                                .title("부드러운 재즈 플레이리스트")
                                                .description("가벼운 리듬으로 은은하게 에너지를 채우는 재즈")
                                                .imageUrl("https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg")
                                                .contentUrl("https://youtube.com")
                                                .build(),
                                Recommendation.builder()
                                                .emotion("무기력")
                                                .category("HOBBY")
                                                .title("식물 키우기")
                                                .description("작은 생명체를 돌보며 은은한 성취감을 느껴보세요")
                                                .imageUrl("")
                                                .contentUrl("")
                                                .build(),
                                Recommendation.builder()
                                                .emotion("무기력")
                                                .category("ACTIVITY")
                                                .title("일기 쓰기")
                                                .description("오늘의 감정을 적으며 마음의 짐을 내려놓는 시간")
                                                .imageUrl("")
                                                .contentUrl("")
                                                .build(),
                                Recommendation.builder()
                                                .emotion("무기력")
                                                .category("MOVIE")
                                                .title("월-E")
                                                .description("작은 로봇의 따뜻한 이야기가 힘을 줍니다")
                                                .imageUrl("https://upload.wikimedia.org/wikipedia/ko/3/3e/WALL-E_poster.jpg")
                                                .contentUrl("")
                                                .build(),
                                Recommendation.builder()
                                                .emotion("무기력")
                                                .category("BOOK")
                                                .title("작은 것들을 위한 시")
                                                .description("사소한 행복에 주목하게 하는 시집")
                                                .imageUrl("")
                                                .contentUrl("")
                                                .build());

                recommendationRepository.saveAll(recommendations);
        }
}