package com.berkayhub.googlecalendar;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GoogleCalendarConnectionRepository extends JpaRepository<GoogleCalendarConnection, Long> {
    Optional<GoogleCalendarConnection> findByUserEmailIgnoreCase(String userEmail);
    boolean existsByUserEmailIgnoreCase(String userEmail);
}
