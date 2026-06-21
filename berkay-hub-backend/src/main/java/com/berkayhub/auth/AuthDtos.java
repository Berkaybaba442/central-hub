package com.berkayhub.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthDtos {
    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}
    public record SignupRequest(@Email @NotBlank String email, @NotBlank String displayName, @NotBlank @Size(min = 6) String password) {}
    public record UserResponse(Long id, String email, String displayName, UserRole role) {
        public static UserResponse from(AppUser user) {
            return new UserResponse(user.getId(), user.getEmail(), user.getDisplayName(), user.getRole());
        }
    }
    public record LoginResponse(String token, UserResponse user) {}
    public record MeResponse(UserResponse user) {}
}
