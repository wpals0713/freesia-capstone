package com.freesia.backend.member.dto;

import com.freesia.backend.member.entity.AuthProvider;
import com.freesia.backend.member.entity.Member;
import com.freesia.backend.member.entity.MemberStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class MemberResponseDTO {

    private Long id;
    private String email;
    private String nickname;
    private AuthProvider provider;
    private MemberStatus status;
    private LocalDateTime createdAt;

    /** Member 엔티티 → DTO 변환 */
    public static MemberResponseDTO from(Member member) {
        return MemberResponseDTO.builder()
                .id(member.getId())
                .email(member.getEmail())
                .nickname(member.getNickname())
                .provider(member.getProvider())
                .status(member.getStatus())
                .createdAt(member.getCreatedAt())
                .build();
    }
}
