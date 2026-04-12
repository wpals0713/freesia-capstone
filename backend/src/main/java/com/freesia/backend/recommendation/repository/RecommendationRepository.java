package com.freesia.backend.recommendation.repository;

import com.freesia.backend.recommendation.entity.Recommendation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface RecommendationRepository extends JpaRepository<Recommendation, Long> {

    /** 특정 감정에 맞는 추천 콘텐츠 조회 */
    List<Recommendation> findByEmotion(String emotion);

    /** 특정 URL 을 가진 추천 콘텐츠 조회 (중복 방지용) */
    Optional<Recommendation> findByContentUrl(String contentUrl);

    /** 특정 카테고리에 해당하는 모든 데이터 삭제 */
    @Modifying
    @Transactional
    @Query("DELETE FROM Recommendation r WHERE r.category = ?1")
    int deleteByCategory(String category);
}
