package com.freesia.backend.member.controller;

import com.freesia.backend.global.ApiResponse;
import com.freesia.backend.global.security.CustomUserDetails;
import com.freesia.backend.member.dto.JoinDTO;
import com.freesia.backend.member.dto.LoginDTO;
import com.freesia.backend.member.dto.MemberResponseDTO;
import com.freesia.backend.member.dto.TokenResponseDTO;
import com.freesia.backend.member.service.MemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/members")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    /**
     * POST /api/members/join
     * 회원가입 — 인증 불필요 (permitAll)
     */
    @PostMapping("/join")
    public ResponseEntity<ApiResponse<MemberResponseDTO>> join(@Valid @RequestBody JoinDTO joinDTO) {
        MemberResponseDTO response = memberService.join(joinDTO);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("회원가입이 완료되었습니다.", response));
    }

    /**
     * POST /api/members/login
     * 로그인 — 인증 불필요 (permitAll)
     * 응답: JWT 액세스 토큰
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<TokenResponseDTO>> login(@Valid @RequestBody LoginDTO loginDTO) {
        TokenResponseDTO response = memberService.login(loginDTO);
        return ResponseEntity.ok(ApiResponse.success("로그인이 완료되었습니다.", response));
    }

    /**
     * GET /api/members/me
     * 내 정보 조회 — JWT 토큰 인증 필요
     * SecurityContext에 저장된 CustomUserDetails에서 memberId를 추출하여 조회
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<MemberResponseDTO>> getMyInfo(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        MemberResponseDTO response = memberService.getMyInfo(userDetails.getMemberId());
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
