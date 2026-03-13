package com.freesia.backend.global;

import lombok.Getter;

/**
 * 모든 API 응답을 감싸는 공통 래퍼 클래스.
 *
 * <pre>
 * 성공: { "success": true,  "message": "...", "data": { ... } }
 * 실패: { "success": false, "message": "...", "data": null      }
 * </pre>
 */
@Getter
public class ApiResponse<T> {

    private final boolean success;
    private final String  message;
    private final T       data;

    private ApiResponse(boolean success, String message, T data) {
        this.success = success;
        this.message = message;
        this.data    = data;
    }

    // ── 성공 응답 팩토리 ───────────────────────────────────────────────────────

    /** 데이터만 반환 (메시지 없음) */
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, null, data);
    }

    /** 메시지 + 데이터 반환 */
    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, message, data);
    }

    /** 메시지만 반환 (데이터 없음, 삭제 응답 등에 사용) */
    public static <Void> ApiResponse<Void> success(String message) {
        return new ApiResponse<>(true, message, null);
    }

    // ── 실패 응답 팩토리 ───────────────────────────────────────────────────────

    /** 오류 메시지 반환 */
    public static <T> ApiResponse<T> failure(String message) {
        return new ApiResponse<>(false, message, null);
    }
}
