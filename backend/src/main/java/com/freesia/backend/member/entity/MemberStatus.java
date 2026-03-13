package com.freesia.backend.member.entity;

/**
 * 회원 계정 상태
 */
public enum MemberStatus {
    ACTIVE,    // 정상 활성 계정
    INACTIVE,  // 비활성 (탈퇴 요청 등)
    BANNED     // 관리자에 의해 정지된 계정
}
