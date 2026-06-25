package com.berkayhub.googlecalendar;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "google_calendar_oauth_states")
public class GoogleCalendarOAuthState {
    @Id
    private String state;

    @Column(name = "user_email", nullable = false)
    private String userEmail;

    @Column(name = "return_url", length = 1000)
    private String returnUrl;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    public GoogleCalendarOAuthState() {}

    public GoogleCalendarOAuthState(String state, String userEmail, String returnUrl, LocalDateTime expiresAt) {
        this.state = state;
        this.userEmail = userEmail;
        this.returnUrl = returnUrl;
        this.expiresAt = expiresAt;
    }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }
    public String getReturnUrl() { return returnUrl; }
    public void setReturnUrl(String returnUrl) { this.returnUrl = returnUrl; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
}
