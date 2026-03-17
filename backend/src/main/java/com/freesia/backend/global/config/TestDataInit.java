package com.freesia.backend.global.config;

import com.freesia.backend.member.entity.AuthProvider;
import com.freesia.backend.member.entity.Member;
import com.freesia.backend.member.entity.MemberStatus;
import com.freesia.backend.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class TestDataInit implements ApplicationRunner {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        String testEmail = "admin@freesia.com";

        if (memberRepository.existsByEmail(testEmail)) {
            log.info("[TestDataInit] 테스트 계정이 이미 존재합니다. (email={})", testEmail);
            return;
        }

        Member testMember = Member.builder()
                .email(testEmail)
                .password(passwordEncoder.encode("Freesia1234!"))
                .nickname("테스트유저")
                .provider(AuthProvider.LOCAL)
                .status(MemberStatus.ACTIVE)
                .build();

        memberRepository.save(testMember);
        log.info("[TestDataInit] 테스트 계정 생성 완료 (email={})", testEmail);
    }
}
