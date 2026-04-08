package com.freesia.backend.recommendation.repository;

import com.freesia.backend.recommendation.entity.Recommendation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecommendationRepository extends JpaRepository<Recommendation, Long> {

    /** 특정 감정에 맞는 추천 콘텐츠 조회 */
    List<Recommendation> findByEmotion(String emotion);
}