package com.freesia.backend.recommendation.repository;

import com.freesia.backend.member.entity.Member;
import com.freesia.backend.recommendation.entity.RecommendationFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RecommendationFeedbackRepository extends JpaRepository<RecommendationFeedback, Long> {

    /**
     * 특정 Member 가 싫어요 처리한 Recommendation 의 ID 리스트를 조회합니다.
     */
    @Query("SELECT rf.recommendation.id FROM RecommendationFeedback rf " +
            "WHERE rf.member = :member AND rf.isDisliked = true")
    List<Long> findDislikedRecommendationIdsByMember(@Param("member") Member member);

    /**
     * 특정 Member 가 특정 Recommendation 에 대한 피드백이 존재하는지 확인합니다.
     */
    Optional<RecommendationFeedback> findByMemberAndRecommendation(Member member,
            RecommendationFeedback recommendation);

    /**
     * 특정 Member 가 특정 Recommendation 에 대한 싫어요 피드백이 존재하는지 확인합니다.
     */
    @Query("SELECT EXISTS (SELECT 1 FROM RecommendationFeedback rf " +
            "WHERE rf.member = :member AND rf.recommendation.id = :recommendationId AND rf.isDisliked = true)")
    boolean existsByMemberAndRecommendationIdAndIsDisliked(@Param("member") Member member,
            @Param("recommendationId") Long recommendationId);
}