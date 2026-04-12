package com.freesia.backend.recommendation.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "recommendations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Recommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 감정 카테고리 */
    @Column(nullable = false, length = 50)
    private String emotion;

    /** 콘텐츠 종류 (MUSIC, MOVIE 등) */
    @Column(nullable = false, length = 50)
    private String category;

    /** 콘텐츠 제목 */
    @Column(nullable = false, length = 200)
    private String title;

    /** 추천 이유 */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    /** 썸네일 링크 */
    @Column(length = 500)
    private String imageUrl;

    /** 실제 이동할 링크 */
    @Column(length = 500)
    private String contentUrl;

    @Builder
    public Recommendation(String emotion, String category, String title, String description, String imageUrl,
            String contentUrl) {
        this.emotion = emotion;
        this.category = category;
        this.title = title;
        this.description = description;
        this.imageUrl = imageUrl;
        this.contentUrl = contentUrl;
    }
}