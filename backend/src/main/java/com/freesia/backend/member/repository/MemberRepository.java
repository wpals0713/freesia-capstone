package com.freesia.backend.member.repository;

import com.freesia.backend.member.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long> {

    /** 이메일로 회원 조회 (로그인, 중복 체크에 활용) */
    Optional<Member> findByEmail(String email);

    /** 이메일 중복 여부 확인 */
    boolean existsByEmail(String email);
}
