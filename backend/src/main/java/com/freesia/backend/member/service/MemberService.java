package com.freesia.backend.member.service;

import com.freesia.backend.global.exception.BusinessException;
import com.freesia.backend.global.security.JwtProvider;
import com.freesia.backend.member.dto.JoinDTO;
import com.freesia.backend.member.dto.LoginDTO;
import com.freesia.backend.member.dto.MemberResponseDTO;
import com.freesia.backend.member.dto.TokenResponseDTO;
import com.freesia.backend.member.entity.AuthProvider;
import com.freesia.backend.member.entity.Member;
import com.freesia.backend.member.entity.MemberStatus;
import com.freesia.backend.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemberService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;

    /**
     * 회원가입
     * - 이메일 중복 체크 후 비밀번호를 BCrypt로 인코딩하여 저장
     */
    @Transactional
    public MemberResponseDTO join(JoinDTO joinDTO) {
        if (memberRepository.existsByEmail(joinDTO.getEmail())) {
            throw new BusinessException("이미 사용 중인 이메일입니다.", HttpStatus.CONFLICT);
        }

        Member member = Member.builder()
                .email(joinDTO.getEmail())
                .password(passwordEncoder.encode(joinDTO.getPassword()))
                .nickname(joinDTO.getNickname())
                .provider(AuthProvider.LOCAL)
                .status(MemberStatus.ACTIVE)
                .build();

        return MemberResponseDTO.from(memberRepository.save(member));
    }

    /**
     * 로그인
     * - 이메일로 회원 조회 → 비밀번호 검증 → JWT 발급
     */
    @Transactional
    public TokenResponseDTO login(LoginDTO loginDTO) {
        Member member = memberRepository.findByEmail(loginDTO.getEmail())
                .orElseThrow(() -> new BusinessException("이메일 또는 비밀번호가 올바르지 않습니다.", HttpStatus.UNAUTHORIZED));

        if (!passwordEncoder.matches(loginDTO.getPassword(), member.getPassword())) {
            throw new BusinessException("이메일 또는 비밀번호가 올바르지 않습니다.", HttpStatus.UNAUTHORIZED);
        }

        String token = jwtProvider.generateToken(member.getId(), member.getEmail());
        return TokenResponseDTO.of(token, jwtProvider.getExpirationMs());
    }

    /**
     * 내 정보 조회
     * - JWT 필터에서 추출한 memberId 기반 조회
     */
    public MemberResponseDTO getMyInfo(Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new BusinessException("존재하지 않는 회원입니다.", HttpStatus.NOT_FOUND));
        return MemberResponseDTO.from(member);
    }
}
