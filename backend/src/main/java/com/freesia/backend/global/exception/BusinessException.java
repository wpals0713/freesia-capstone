package com.freesia.backend.global.exception;

import org.springframework.http.HttpStatus;

/**
 * 비즈니스 로직 예외의 최상위 클래스.
 * 도메인별 예외는 이 클래스를 상속하거나 직접 사용한다.
 */
public class BusinessException extends RuntimeException {

    private final HttpStatus status;

    public BusinessException(String message) {
        super(message);
        this.status = HttpStatus.BAD_REQUEST;
    }

    public BusinessException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
