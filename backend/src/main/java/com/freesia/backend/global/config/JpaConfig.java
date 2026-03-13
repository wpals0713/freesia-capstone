package com.freesia.backend.global.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * JPA Auditing 활성화 — @CreatedDate, @LastModifiedDate 자동 주입
 */
@Configuration
@EnableJpaAuditing
public class JpaConfig {
}
