package com.berkayhub.googlecalendar;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface GoogleCalendarOAuthStateRepository extends JpaRepository<GoogleCalendarOAuthState, String> {
    List<GoogleCalendarOAuthState> findAllByExpiresAtBefore(LocalDateTime expiresAt);
}
