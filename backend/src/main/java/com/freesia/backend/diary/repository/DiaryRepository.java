package com.freesia.backend.diary.repository;

import com.freesia.backend.diary.dto.DiaryCalendarResponse;
import com.freesia.backend.diary.entity.Diary;
import com.freesia.backend.diary.entity.DiaryStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DiaryRepository extends JpaRepository<Diary, Long> {

    /** 특정 회원의 활성 일기를 날짜 오름차순으로 조회 */
    List<Diary> findByMemberIdAndStatusOrderByDateAsc(Long memberId, DiaryStatus status);

    /** 특정 회원의 특정 일기 조회 (소유권 확인용) */
    Optional<Diary> findByIdAndMemberId(Long id, Long memberId);

    /** 특정 회원의 특정 년/월 활성 일기 조회 */
    @Query("SELECT d FROM Diary d WHERE d.member.id = :memberId AND d.status = :status AND YEAR(d.date) = :year AND MONTH(d.date) = :month")
    List<Diary> findByMemberIdAndStatusAndYearMonth(
            @Param("memberId") Long memberId,
            @Param("status") DiaryStatus status,
            @Param("year") int year,
            @Param("month") int month);

    /** 특정 회원의 특정 년/월 활성 일기 조회 (캘린더용 DTO) */
    @Query("SELECT new com.freesia.backend.diary.dto.DiaryCalendarResponse(d.id, d.createdAt, d.emotion) " +
            "FROM Diary d WHERE d.member.id = :memberId AND d.status = :status AND YEAR(d.date) = :year AND MONTH(d.date) = :month")
    List<DiaryCalendarResponse> findCalendarDiariesByMemberIdAndYearMonth(
            @Param("memberId") Long memberId,
            @Param("status") DiaryStatus status,
            @Param("year") int year,
            @Param("month") int month);
}
