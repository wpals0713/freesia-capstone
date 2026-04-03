package com.freesia.backend.diary.entity;

import com.freesia.backend.member.entity.Member;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Entity
@Table(name = "diaries")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Diary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    /** 일기 본문 */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    /** 감정 이모지 (단일 문자 또는 유니코드) */
    @Column(length = 10)
    private String emoji;

    /** 분석된 감정 결과 (기쁨, 슬픔, 분노, 중립 등) */
    @Column(length = 20)
    private String emotion;

    /** 감정 강도 (0.0 ~ 1.0) */
    private Double sentimentScore;

    /** AI 위로 코멘트 */
    @Column(columnDefinition = "TEXT")
    private String aiComment;

    /** 일기 날짜 (하루 하나) */
    @Column(nullable = false)
    private LocalDate date;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DiaryStatus status;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @Builder
    public Diary(Member member, String content, String emoji, LocalDate date,
            String emotion, Double sentimentScore, String aiComment) {
        this.member = member;
        this.content = content;
        this.emoji = emoji;
        this.date = date;
        this.emotion = emotion;
        this.sentimentScore = sentimentScore;
        this.aiComment = aiComment;
        this.status = DiaryStatus.ACTIVE;
    }

    public void update(String content, String emoji, LocalDate date) {
        this.content = content;
        this.emoji = emoji;
        this.date = date;
    }

    public void delete() {
        this.status = DiaryStatus.DELETED;
    }

    /**
     * DB 에 INSERT 되기 직전에 호출됨.
     * date 필드가 null 이면 서버의 현재 날짜 (KST) 를 자동 할당.
     */
    @PrePersist
    public void prePersist() {
        // this.date = LocalDate.now();
        this.date = LocalDate.now(ZoneId.of("Asia/Seoul"));
    }
}
