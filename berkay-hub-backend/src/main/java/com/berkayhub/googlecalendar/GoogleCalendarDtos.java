package com.berkayhub.googlecalendar;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.List;

public class GoogleCalendarDtos {
    public record GoogleCalendarStatusResponse(
            boolean configured,
            boolean connected,
            String userEmail,
            String googleAccountEmail,
            LocalDateTime connectedAt,
            LocalDateTime accessTokenExpiresAt,
            LocalDateTime lastSyncAt,
            String lastError
    ) {}

    public record GoogleCalendarMemberStatus(
            Long userId,
            String email,
            String displayName,
            String role,
            boolean currentUser,
            boolean connected,
            String googleAccountEmail,
            LocalDateTime connectedAt,
            LocalDateTime lastSyncAt,
            String lastError
    ) {}

    public record StartGoogleOAuthRequest(String returnUrl) {}
    public record StartGoogleOAuthResponse(String authorizationUrl) {}

    public record CreateGoogleCalendarEventRequest(
            @NotBlank String summary,
            String description,
            @NotNull LocalDateTime startsAt,
            @NotNull LocalDateTime endsAt
    ) {}

    public record SyncTaskCalendarRequest(
            @NotNull LocalDateTime startsAt,
            @NotNull LocalDateTime endsAt
    ) {}

    public record GoogleCalendarEventResponse(
            String id,
            String summary,
            String description,
            String htmlLink,
            LocalDateTime startsAt,
            LocalDateTime endsAt,
            List<String> conflicts
    ) {}
}
