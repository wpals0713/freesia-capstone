package com.freesia.backend.diary.controller;

import com.freesia.backend.diary.dto.DiaryAnalysisResponse;
import com.freesia.backend.diary.dto.DiaryCalendarResponse;
import com.freesia.backend.diary.dto.DiaryRequestDTO;
import com.freesia.backend.diary.dto.DiaryResponseDTO;
import com.freesia.backend.diary.dto.DiaryStatisticsResponseDTO;
import com.freesia.backend.diary.service.DiaryService;
import com.freesia.backend.global.ApiResponse;
import com.freesia.backend.global.security.CustomUserDetails;
import com.freesia.backend.recommendation.dto.RecommendationResponse;
import com.freesia.backend.recommendation.service.RecommendationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Collections;

@RestController
@RequestMapping("/api/diaries")
@RequiredArgsConstructor
public class DiaryController {

    private final DiaryService diaryService;
    private final RecommendationService recommendationService;

    /**
     * POST /api/diaries
     * 일기 작성
     */
    @PostMapping
    public ResponseEntity<ApiResponse<DiaryResponseDTO>> create(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody DiaryRequestDTO request) {
        DiaryResponseDTO response = diaryService.create(userDetails.getMemberId(), request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("일기가 작성되었습니다.", response));
    }

    /**
     * POST /api/diaries/analyze
     * 일기 작성 후 감정 분석 및 추천 콘텐츠 반환
     */
    @PostMapping("/analyze")
    public ResponseEntity<ApiResponse<DiaryAnalysisResponse>> createAndRecommend(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody DiaryRequestDTO request) {
        
        // 1. 일기 작성 및 감정 분석
        DiaryResponseDTO diaryResponse = diaryService.create(userDetails.getMemberId(), request);
        
        // 2. 분석된 감정을 바탕으로 추천 콘텐츠 조회
        String emotion = diaryResponse.getEmotion();
        List<RecommendationResponse> recommendations = recommendationService.getRecommendationsByEmotion(emotion);
        
        // 3. 응답 DTO 에 담아서 반환
        DiaryAnalysisResponse response = DiaryAnalysisResponse.of(diaryResponse, recommendations);
        
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("일기가 작성되었습니다.", response));
    }

    /**
     * GET /api/diaries
     * 내 일기 목록 조회
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<DiaryResponseDTO>>> getMyDiaries(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        List<DiaryResponseDTO> response = diaryService.getMyDiaries(userDetails.getMemberId());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * GET /api/diaries/{id}
     * 일기 상세 조회
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DiaryResponseDTO>> getDiary(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        DiaryResponseDTO response = diaryService.getDiary(userDetails.getMemberId(), id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * PUT /api/diaries/{id}
     * 일기 수정
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<DiaryResponseDTO>> update(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody DiaryRequestDTO request) {
        DiaryResponseDTO response = diaryService.update(userDetails.getMemberId(), id, request);
        return ResponseEntity.ok(ApiResponse.success("일기가 수정되었습니다.", response));
    }

    /**
     * GET /api/diaries/statistics?year={year}&month={month}
     * 월별 감정 통계 조회
     */
    @GetMapping("/statistics")
    public ResponseEntity<ApiResponse<DiaryStatisticsResponseDTO>> getStatistics(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam int year,
            @RequestParam int month) {
        DiaryStatisticsResponseDTO response = diaryService.getStatistics(userDetails.getMemberId(), year, month);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * DELETE /api/diaries/{id}
     * 일기 삭제 (소프트 삭제)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        diaryService.delete(userDetails.getMemberId(), id);
        return ResponseEntity.ok(ApiResponse.success("일기가 삭제되었습니다."));
    }

    /**
     * GET /api/diaries/calendar
     * 감정 달력용 일기 목록 조회 (월별)
     */
    @GetMapping("/calendar")
    public ResponseEntity<ApiResponse<List<DiaryCalendarResponse>>> getCalendarDiaries(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam int year,
            @RequestParam int month) {
        List<DiaryCalendarResponse> response = diaryService.getCalendarDiaries(
                userDetails.getMemberId(), year, month);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
