package com.freesia.backend.member.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class TokenResponseDTO {

    private String accessToken;
    private String tokenType;
    private long expiresIn;

    public static TokenResponseDTO of(String accessToken, long expiresIn) {
        return new TokenResponseDTO(accessToken, "Bearer", expiresIn);
    }
}
