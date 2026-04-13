package com.freesia.backend.diary.service;

import com.freesia.backend.diary.dto.DiaryCalendarResponse;
import com.freesia.backend.diary.dto.DiaryRequestDTO;
import com.freesia.backend.diary.dto.DiaryResponseDTO;
import com.freesia.backend.diary.dto.DiaryStatisticsResponseDTO;
import com.freesia.backend.diary.entity.Diary;
import com.freesia.backend.diary.entity.DiaryStatus;
import com.freesia.backend.diary.repository.DiaryRepository;
import com.freesia.backend.global.exception.BusinessException;
import com.freesia.backend.member.entity.Member;
import com.freesia.backend.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.OptionalDouble;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DiaryService {

        private final DiaryRepository diaryRepository;
        private final MemberRepository memberRepository;
        private final SentimentService sentimentService; // AiSentimentService 주입

        // ── 일기 작성 ─────────────────────────────────────────────────────────────

        @Transactional
        public DiaryResponseDTO create(Long memberId, DiaryRequestDTO request) {
                Member member = findMemberOrThrow(memberId);

                // AI 서버로 감정 분석 요청
                SentimentResult analysis = sentimentService.analyze(request.getContent());
                log.info("[DiaryService] 감정 분석 완료 — memberId={}, emotion={}, score={}",
                                memberId, analysis.emotion(), analysis.score());

                Diary diary = Diary.builder()
                                .member(member)
                                .content(request.getContent())
                                .emoji(request.getEmoji())
                                .date(request.getDate())
                                .emotion(analysis.emotion())
                                .sentimentScore(analysis.score())
                                .aiComment(analysis.aiComment())
                                .build();

                return DiaryResponseDTO.from(diaryRepository.save(diary));
        }

        // ── 내 일기 목록 조회 ─────────────────────────────────────────────────────

        public List<DiaryResponseDTO> getMyDiaries(Long memberId) {
                return diaryRepository
                                .findByMemberIdAndStatusOrderByDateAsc(memberId, DiaryStatus.ACTIVE)
                                .stream()
                                .map(DiaryResponseDTO::from)
                                .collect(Collectors.toList());
        }

        // ── 일기 상세 조회 ────────────────────────────────────────────────────────

        public DiaryResponseDTO getDiary(Long memberId, Long diaryId) {
                Diary diary = findDiaryOrThrow(memberId, diaryId);
                return DiaryResponseDTO.from(diary);
        }

        // ── 일기 수정 ─────────────────────────────────────────────────────────────

        @Transactional
        public DiaryResponseDTO update(Long memberId, Long diaryId, DiaryRequestDTO request) {
                Diary diary = findDiaryOrThrow(memberId, diaryId);
                diary.update(request.getContent(), request.getEmoji(), request.getDate());
                return DiaryResponseDTO.from(diary);
        }

        // ── 일기 삭제 (소프트) ────────────────────────────────────────────────────

        @Transactional
        public void delete(Long memberId, Long diaryId) {
                Diary diary = findDiaryOrThrow(memberId, diaryId);
                diary.delete();
        }

        // ── 월별 감정 통계 ────────────────────────────────────────────────────────

        public DiaryStatisticsResponseDTO getStatistics(Long memberId, int year, int month) {
                List<Diary> diaries = diaryRepository
                                .findByMemberIdAndStatusAndYearMonth(memberId, DiaryStatus.ACTIVE, year, month);

                // 감정별 카운트
                Map<String, Long> emotionCounts = diaries.stream()
                                .filter(d -> d.getEmotion() != null)
                                .collect(Collectors.groupingBy(Diary::getEmotion, Collectors.counting()));

                // 평균 감정 점수 (점수가 기록된 일기만)
                OptionalDouble avg = diaries.stream()
                                .filter(d -> d.getSentimentScore() != null)
                                .mapToDouble(Diary::getSentimentScore)
                                .average();

                Double averageScore = avg.isPresent()
                                ? Math.round(avg.getAsDouble() * 100.0) / 100.0
                                : null;

                return DiaryStatisticsResponseDTO.builder()
                                .year(year)
                                .month(month)
                                .totalCount(diaries.size())
                                .emotionCounts(emotionCounts)
                                .averageSentimentScore(averageScore)
                                .build();
        }

        // ── 감정 달력용 일기 목록 조회 ────────────────────────────────────────────

        public List<DiaryCalendarResponse> getCalendarDiaries(Long memberId, int year, int month) {
                return diaryRepository.findCalendarDiariesByMemberIdAndYearMonth(
                                memberId, DiaryStatus.ACTIVE, year, month);
        }

        // ── 내부 헬퍼 ─────────────────────────────────────────────────────────────

        private Member findMemberOrThrow(Long memberId) {
                return memberRepository.findById(memberId)
                                .orElseThrow(() -> new BusinessException("존재하지 않는 회원입니다.", HttpStatus.NOT_FOUND));
        }

        private Diary findDiaryOrThrow(Long memberId, Long diaryId) {
                return diaryRepository.findByIdAndMemberId(diaryId, memberId)
                                .filter(d -> d.getStatus() == DiaryStatus.ACTIVE)
                                .orElseThrow(() -> new BusinessException("일기를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
        }
}