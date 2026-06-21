package com.berkayhub.auth;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class TokenStore {
    private final Map<String, SessionData> sessions = new ConcurrentHashMap<>();

    public String issue(AppUser user) {
        String token = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
        sessions.put(token, new SessionData(user.getEmail(), user.getRole(), Instant.now()));
        return token;
    }

    public Optional<SessionData> find(String token) {
        return Optional.ofNullable(sessions.get(token));
    }

    public void revoke(String token) {
        sessions.remove(token);
    }

    public long activeCount() {
        return sessions.size();
    }

    public record SessionData(String email, UserRole role, Instant createdAt) {}
}
