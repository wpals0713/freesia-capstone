package com.freesia.backend.member.entity;

/**
 * 회원 가입 경로 (로컬 / 소셜 로그인)
 */
public enum AuthProvider {
    LOCAL,    // 일반 이메일 가입
    GOOGLE,   // 구글 간편 로그인
    KAKAO,    // 카카오 간편 로그인
    NAVER     // 네이버 간편 로그인
}
