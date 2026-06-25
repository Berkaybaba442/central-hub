package com.berkayhub.googlecalendar;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@ConfigurationProperties(prefix = "berkay-hub.google-calendar")
public class GoogleCalendarProperties {
    private String clientId = "";
    private String clientSecret = "";
    private String redirectUri = "http://localhost:8080/api/google-calendar/oauth/callback";
    private String tokenSecret = "";
    private String frontendCallbackUrl = "http://localhost:5500/modules/academic-planner/index.html";
    private String timeZone = "Europe/Istanbul";
    private List<String> allowedReturnOrigins = new ArrayList<>(List.of(
            "http://localhost:5500",
            "http://127.0.0.1:5500"
    ));

    public boolean isConfigured() {
        return hasText(clientId) && hasText(clientSecret) && hasText(redirectUri) && hasText(tokenSecret);
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getClientSecret() {
        return clientSecret;
    }

    public void setClientSecret(String clientSecret) {
        this.clientSecret = clientSecret;
    }

    public String getRedirectUri() {
        return redirectUri;
    }

    public void setRedirectUri(String redirectUri) {
        this.redirectUri = redirectUri;
    }

    public String getTokenSecret() {
        return tokenSecret;
    }

    public void setTokenSecret(String tokenSecret) {
        this.tokenSecret = tokenSecret;
    }

    public String getFrontendCallbackUrl() {
        return frontendCallbackUrl;
    }

    public void setFrontendCallbackUrl(String frontendCallbackUrl) {
        this.frontendCallbackUrl = frontendCallbackUrl;
    }

    public String getTimeZone() {
        return timeZone;
    }

    public void setTimeZone(String timeZone) {
        this.timeZone = timeZone;
    }

    public List<String> getAllowedReturnOrigins() {
        return allowedReturnOrigins;
    }

    public void setAllowedReturnOrigins(List<String> allowedReturnOrigins) {
        this.allowedReturnOrigins = allowedReturnOrigins == null ? new ArrayList<>() : allowedReturnOrigins;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
