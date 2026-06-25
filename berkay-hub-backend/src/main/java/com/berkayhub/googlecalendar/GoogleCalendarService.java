package com.berkayhub.googlecalendar;

import com.berkayhub.academic.AcademicEvent;
import com.berkayhub.academic.AcademicEventRepository;
import com.berkayhub.auth.AppUser;
import com.berkayhub.auth.AppUserRepository;
import com.berkayhub.auth.UserRole;
import com.berkayhub.club.ClubTask;
import com.berkayhub.club.ClubTaskRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.*;

import static com.berkayhub.googlecalendar.GoogleCalendarDtos.*;

@Service
public class GoogleCalendarService {
    private static final String AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final String TOKEN_URL = "https://oauth2.googleapis.com/token";
    private static final String USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
    private static final String CALENDAR_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
    private static final String SCOPES = "openid email https://www.googleapis.com/auth/calendar.events";

    private final GoogleCalendarProperties properties;
    private final GoogleCalendarConnectionRepository connectionRepository;
    private final GoogleCalendarOAuthStateRepository stateRepository;
    private final AppUserRepository userRepository;
    private final AcademicEventRepository academicEventRepository;
    private final ClubTaskRepository taskRepository;
    private final GoogleTokenCrypto tokenCrypto;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public GoogleCalendarService(
            GoogleCalendarProperties properties,
            GoogleCalendarConnectionRepository connectionRepository,
            GoogleCalendarOAuthStateRepository stateRepository,
            AppUserRepository userRepository,
            AcademicEventRepository academicEventRepository,
            ClubTaskRepository taskRepository,
            GoogleTokenCrypto tokenCrypto,
            ObjectMapper objectMapper
    ) {
        this.properties = properties;
        this.connectionRepository = connectionRepository;
        this.stateRepository = stateRepository;
        this.userRepository = userRepository;
        this.academicEventRepository = academicEventRepository;
        this.taskRepository = taskRepository;
        this.tokenCrypto = tokenCrypto;
        this.objectMapper = objectMapper;
    }

    public GoogleCalendarStatusResponse status(AppUser user) {
        Optional<GoogleCalendarConnection> connection = connectionRepository.findByUserEmailIgnoreCase(user.getEmail());
        return connection
                .map(item -> new GoogleCalendarStatusResponse(
                        properties.isConfigured(),
                        true,
                        user.getEmail(),
                        item.getGoogleAccountEmail(),
                        item.getConnectedAt(),
                        item.getAccessTokenExpiresAt(),
                        item.getLastSyncAt(),
                        item.getLastError()
                ))
                .orElseGet(() -> new GoogleCalendarStatusResponse(
                        properties.isConfigured(),
                        false,
                        user.getEmail(),
                        null,
                        null,
                        null,
                        null,
                        null
                ));
    }

    public List<GoogleCalendarMemberStatus> memberStatuses(AppUser requester) {
        List<AppUser> users = requester.getRole() == UserRole.ADMIN
                ? userRepository.findAll().stream()
                        .sorted(Comparator.comparing(AppUser::getDisplayName, String.CASE_INSENSITIVE_ORDER))
                        .toList()
                : List.of(requester);

        return users.stream().map(user -> {
            Optional<GoogleCalendarConnection> connection = connectionRepository.findByUserEmailIgnoreCase(user.getEmail());
            return new GoogleCalendarMemberStatus(
                    user.getId(),
                    user.getEmail(),
                    user.getDisplayName(),
                    user.getRole().name(),
                    sameEmail(user.getEmail(), requester.getEmail()),
                    connection.isPresent(),
                    connection.map(GoogleCalendarConnection::getGoogleAccountEmail).orElse(null),
                    connection.map(GoogleCalendarConnection::getConnectedAt).orElse(null),
                    connection.map(GoogleCalendarConnection::getLastSyncAt).orElse(null),
                    connection.map(GoogleCalendarConnection::getLastError).orElse(null)
            );
        }).toList();
    }

    @Transactional
    public StartGoogleOAuthResponse startOAuth(AppUser user, StartGoogleOAuthRequest request) {
        ensureConfigured();
        cleanupExpiredStates();

        String state = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
        String returnUrl = safeReturnUrl(request == null ? null : request.returnUrl());
        stateRepository.save(new GoogleCalendarOAuthState(state, user.getEmail(), returnUrl, LocalDateTime.now().plusMinutes(10)));

        String authorizationUrl = UriComponentsBuilder.fromUriString(AUTH_URL)
                .queryParam("client_id", properties.getClientId())
                .queryParam("redirect_uri", properties.getRedirectUri())
                .queryParam("response_type", "code")
                .queryParam("scope", SCOPES)
                .queryParam("state", state)
                .queryParam("access_type", "offline")
                .queryParam("include_granted_scopes", "true")
                .queryParam("prompt", "consent")
                .queryParam("login_hint", user.getEmail())
                .build()
                .toUriString();

        return new StartGoogleOAuthResponse(authorizationUrl);
    }

    @Transactional
    public URI handleCallback(String code, String state, String error) {
        GoogleCalendarOAuthState savedState = stateRepository.findById(state == null ? "" : state)
                .orElse(null);
        String returnUrl = savedState == null ? properties.getFrontendCallbackUrl() : savedState.getReturnUrl();

        if (savedState == null || savedState.getExpiresAt().isBefore(LocalDateTime.now())) {
            return redirectWithResult(returnUrl, "error", "Google OAuth state süresi doldu.");
        }

        stateRepository.delete(savedState);

        if (error != null && !error.isBlank()) {
            return redirectWithResult(returnUrl, "error", "Google yetkilendirmesi iptal edildi: " + error);
        }

        if (code == null || code.isBlank()) {
            return redirectWithResult(returnUrl, "error", "Google callback kodu alınamadı.");
        }

        try {
            JsonNode token = exchangeCode(code);
            saveConnection(savedState.getUserEmail(), token);
            return redirectWithResult(returnUrl, "connected", null);
        } catch (ResponseStatusException ex) {
            return redirectWithResult(returnUrl, "error", ex.getReason());
        }
    }

    @Transactional
    public void disconnect(AppUser user) {
        connectionRepository.findByUserEmailIgnoreCase(user.getEmail()).ifPresent(connectionRepository::delete);
    }

    public List<GoogleCalendarEventResponse> listEvents(AppUser user) {
        GoogleCalendarConnection connection = requireConnection(user);
        String accessToken = accessToken(connection);
        URI uri = UriComponentsBuilder.fromUriString(CALENDAR_EVENTS_URL)
                .queryParam("timeMin", OffsetDateTime.now().toString())
                .queryParam("showDeleted", false)
                .queryParam("singleEvents", true)
                .queryParam("maxResults", 20)
                .queryParam("orderBy", "startTime")
                .build()
                .toUri();

        JsonNode response = getJson(uri, accessToken);
        List<GoogleCalendarEventResponse> events = new ArrayList<>();
        response.path("items").forEach(item -> events.add(toEventResponse(item)));
        return events;
    }

    @Transactional
    public GoogleCalendarEventResponse createEvent(AppUser user, CreateGoogleCalendarEventRequest request) {
        validateEventRange(request.startsAt(), request.endsAt());
        GoogleCalendarConnection connection = requireConnection(user);
        ObjectNode body = baseEventResource(
                request.summary().trim(),
                request.description(),
                request.startsAt(),
                request.endsAt()
        );
        privateProperties(body).put("berkayHubUser", user.getEmail());
        JsonNode response = postJson(URI.create(CALENDAR_EVENTS_URL), accessToken(connection), body);
        markSynced(connection);
        return toEventResponse(response);
    }

    @Transactional
    public GoogleCalendarEventResponse syncAcademicEvent(AppUser user, Long eventId) {
        AcademicEvent event = academicEventRepository.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Akademik etkinlik bulunamadı."));
        GoogleCalendarConnection connection = requireConnection(user);
        JsonNode response = upsertAcademicEvent(connection, event, user);
        markSynced(connection);
        return toEventResponse(response);
    }

    @Transactional
    public List<GoogleCalendarEventResponse> syncAllAcademicEvents(AppUser user) {
        GoogleCalendarConnection connection = requireConnection(user);
        List<GoogleCalendarEventResponse> responses = new ArrayList<>();
        List<AcademicEvent> events = academicEventRepository.findAllByStartsAtAfterOrderByStartsAtAsc(LocalDateTime.now().minusDays(1));
        for (AcademicEvent event : events) {
            responses.add(toEventResponse(upsertAcademicEvent(connection, event, user)));
        }
        markSynced(connection);
        return responses;
    }

    @Transactional
    public GoogleCalendarEventResponse syncTask(AppUser user, Long taskId, SyncTaskCalendarRequest request) {
        validateEventRange(request.startsAt(), request.endsAt());
        ClubTask task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Görev bulunamadı."));
        if (user.getRole() != UserRole.ADMIN && !sameEmail(user.getEmail(), task.getAssigneeEmail())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu görevi takvime gönderme yetkin yok.");
        }

        GoogleCalendarConnection connection = requireConnection(user);
        ObjectNode body = baseEventResource(
                "[Görev] " + task.getTitle(),
                taskDescription(task),
                request.startsAt(),
                request.endsAt()
        );
        ObjectNode privateProps = privateProperties(body);
        privateProps.put("berkayHubTaskId", String.valueOf(task.getId()));
        privateProps.put("berkayHubSource", "club-task");
        privateProps.put("berkayHubUser", user.getEmail());

        JsonNode response = upsertByPrivateProperty(connection, "berkayHubTaskId", String.valueOf(task.getId()), body);
        markSynced(connection);
        return toEventResponse(response);
    }

    private JsonNode upsertAcademicEvent(GoogleCalendarConnection connection, AcademicEvent event, AppUser user) {
        LocalDateTime start = event.getStartsAt();
        LocalDateTime end = start.plusHours(1);
        ObjectNode body = baseEventResource(
                "[" + eventTypeLabel(event) + "] " + event.getTitle(),
                "[Berkay Hub] " + nullToEmpty(event.getDescription()),
                start,
                end
        );
        ObjectNode privateProps = privateProperties(body);
        privateProps.put("berkayHubAcademicEventId", String.valueOf(event.getId()));
        privateProps.put("berkayHubSource", "academic-event");
        privateProps.put("berkayHubUser", user.getEmail());
        return upsertByPrivateProperty(connection, "berkayHubAcademicEventId", String.valueOf(event.getId()), body);
    }

    private JsonNode upsertByPrivateProperty(GoogleCalendarConnection connection, String key, String value, ObjectNode body) {
        String accessToken = accessToken(connection);
        URI searchUri = UriComponentsBuilder.fromUriString(CALENDAR_EVENTS_URL)
                .queryParam("privateExtendedProperty", key + "=" + value)
                .queryParam("showDeleted", false)
                .queryParam("singleEvents", true)
                .queryParam("maxResults", 1)
                .build()
                .toUri();
        JsonNode existing = getJson(searchUri, accessToken).path("items").path(0);

        if (existing.hasNonNull("id")) {
            URI patchUri = URI.create(CALENDAR_EVENTS_URL + "/" + encode(existing.path("id").asText()));
            return patchJson(patchUri, accessToken, body);
        }

        return postJson(URI.create(CALENDAR_EVENTS_URL), accessToken, body);
    }

    private void saveConnection(String userEmail, JsonNode token) {
        String refreshToken = text(token, "refresh_token");
        GoogleCalendarConnection connection = connectionRepository.findByUserEmailIgnoreCase(userEmail)
                .orElseGet(() -> new GoogleCalendarConnection(userEmail));

        if ((refreshToken == null || refreshToken.isBlank()) && connection.getEncryptedRefreshToken() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Google refresh token dönmedi. Yeniden izin ver.");
        }

        if (refreshToken != null && !refreshToken.isBlank()) {
            connection.setEncryptedRefreshToken(tokenCrypto.encrypt(refreshToken));
        }
        applyAccessToken(connection, token);
        connection.setScopes(text(token, "scope"));
        connection.setGoogleAccountEmail(fetchGoogleAccountEmail(text(token, "access_token")));
        connection.setConnectedAt(connection.getConnectedAt() == null ? LocalDateTime.now() : connection.getConnectedAt());
        connection.setLastError(null);
        connectionRepository.save(connection);
    }

    private String accessToken(GoogleCalendarConnection connection) {
        if (connection.getEncryptedAccessToken() != null
                && connection.getAccessTokenExpiresAt() != null
                && connection.getAccessTokenExpiresAt().isAfter(LocalDateTime.now().plusMinutes(1))) {
            return tokenCrypto.decrypt(connection.getEncryptedAccessToken());
        }

        JsonNode refreshed = refreshAccessToken(connection);
        applyAccessToken(connection, refreshed);
        connection.setScopes(text(refreshed, "scope"));
        connection.setLastError(null);
        connectionRepository.save(connection);
        return text(refreshed, "access_token");
    }

    private void applyAccessToken(GoogleCalendarConnection connection, JsonNode token) {
        String accessToken = text(token, "access_token");
        if (accessToken == null || accessToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Google access token alınamadı.");
        }
        int expiresIn = token.path("expires_in").asInt(3600);
        connection.setEncryptedAccessToken(tokenCrypto.encrypt(accessToken));
        connection.setAccessTokenExpiresAt(LocalDateTime.now().plusSeconds(Math.max(60, expiresIn - 30L)));
    }

    private JsonNode exchangeCode(String code) {
        return postForm(URI.create(TOKEN_URL), Map.of(
                "code", code,
                "client_id", properties.getClientId(),
                "client_secret", properties.getClientSecret(),
                "redirect_uri", properties.getRedirectUri(),
                "grant_type", "authorization_code"
        ));
    }

    private JsonNode refreshAccessToken(GoogleCalendarConnection connection) {
        String refreshToken = tokenCrypto.decrypt(connection.getEncryptedRefreshToken());
        try {
            return postForm(URI.create(TOKEN_URL), Map.of(
                    "client_id", properties.getClientId(),
                    "client_secret", properties.getClientSecret(),
                    "refresh_token", refreshToken,
                    "grant_type", "refresh_token"
            ));
        } catch (ResponseStatusException ex) {
            connection.setLastError("Google token yenilenemedi: " + ex.getReason());
            connectionRepository.save(connection);
            throw ex;
        }
    }

    private String fetchGoogleAccountEmail(String accessToken) {
        if (accessToken == null || accessToken.isBlank()) return null;
        try {
            JsonNode userInfo = getJson(URI.create(USERINFO_URL), accessToken);
            return text(userInfo, "email");
        } catch (ResponseStatusException ex) {
            return null;
        }
    }

    private GoogleCalendarConnection requireConnection(AppUser user) {
        ensureConfigured();
        return connectionRepository.findByUserEmailIgnoreCase(user.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Google Calendar bağlantısı yok."));
    }

    private ObjectNode baseEventResource(String summary, String description, LocalDateTime startsAt, LocalDateTime endsAt) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("summary", summary);
        if (description != null && !description.isBlank()) {
            body.put("description", description.trim());
        }
        ObjectNode start = body.putObject("start");
        start.put("dateTime", startsAt.toString());
        start.put("timeZone", properties.getTimeZone());
        ObjectNode end = body.putObject("end");
        end.put("dateTime", endsAt.toString());
        end.put("timeZone", properties.getTimeZone());
        body.putObject("extendedProperties").putObject("private");
        return body;
    }

    private ObjectNode privateProperties(ObjectNode body) {
        JsonNode extended = body.get("extendedProperties");
        ObjectNode extendedObject;
        if (extended instanceof ObjectNode node) {
            extendedObject = node;
        } else {
            extendedObject = body.putObject("extendedProperties");
        }
        JsonNode privateNode = extendedObject.get("private");
        if (privateNode instanceof ObjectNode privateObject) {
            return privateObject;
        }
        return extendedObject.putObject("private");
    }

    private GoogleCalendarEventResponse toEventResponse(JsonNode item) {
        LocalDateTime startsAt = parseGoogleDate(item.path("start"));
        LocalDateTime endsAt = parseGoogleDate(item.path("end"));
        String academicId = item.path("extendedProperties").path("private").path("berkayHubAcademicEventId").asText(null);
        return new GoogleCalendarEventResponse(
                text(item, "id"),
                text(item, "summary"),
                text(item, "description"),
                text(item, "htmlLink"),
                startsAt,
                endsAt,
                conflictsFor(startsAt, endsAt, academicId)
        );
    }

    private List<String> conflictsFor(LocalDateTime startsAt, LocalDateTime endsAt, String sourceAcademicId) {
        if (startsAt == null || endsAt == null) return List.of();

        return academicEventRepository.findAll().stream()
                .filter(event -> sourceAcademicId == null || !String.valueOf(event.getId()).equals(sourceAcademicId))
                .filter(event -> overlaps(startsAt, endsAt, event.getStartsAt(), event.getStartsAt().plusHours(1)))
                .map(AcademicEvent::getTitle)
                .limit(5)
                .toList();
    }

    private boolean overlaps(LocalDateTime leftStart, LocalDateTime leftEnd, LocalDateTime rightStart, LocalDateTime rightEnd) {
        return leftStart.isBefore(rightEnd) && leftEnd.isAfter(rightStart);
    }

    private LocalDateTime parseGoogleDate(JsonNode node) {
        if (node == null || node.isMissingNode()) return null;
        String dateTime = node.path("dateTime").asText(null);
        if (dateTime != null && !dateTime.isBlank()) {
            try {
                return OffsetDateTime.parse(dateTime).toLocalDateTime();
            } catch (Exception ignored) {
                return LocalDateTime.parse(dateTime);
            }
        }

        String date = node.path("date").asText(null);
        return date == null || date.isBlank() ? null : LocalDate.parse(date).atStartOfDay();
    }

    private JsonNode getJson(URI uri, String accessToken) {
        HttpRequest request = HttpRequest.newBuilder(uri)
                .header("Authorization", "Bearer " + accessToken)
                .GET()
                .build();
        return send(request);
    }

    private JsonNode postJson(URI uri, String accessToken, JsonNode body) {
        HttpRequest request = jsonRequest(uri, accessToken, body, "POST");
        return send(request);
    }

    private JsonNode patchJson(URI uri, String accessToken, JsonNode body) {
        HttpRequest request = jsonRequest(uri, accessToken, body, "PATCH");
        return send(request);
    }

    private HttpRequest jsonRequest(URI uri, String accessToken, JsonNode body, String method) {
        try {
            return HttpRequest.newBuilder(uri)
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .method(method, HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Google isteği hazırlanamadı.");
        }
    }

    private JsonNode postForm(URI uri, Map<String, String> fields) {
        StringBuilder body = new StringBuilder();
        fields.forEach((key, value) -> {
            if (body.length() > 0) body.append('&');
            body.append(encode(key)).append('=').append(encode(value));
        });

        HttpRequest request = HttpRequest.newBuilder(uri)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body.toString()))
                .build();
        return send(request);
    }

    private JsonNode send(HttpRequest request) {
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, googleError(response.body()));
            }
            if (response.body() == null || response.body().isBlank()) return objectMapper.createObjectNode();
            return objectMapper.readTree(response.body());
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Google API bağlantısı kurulamadı.");
        }
    }

    private String googleError(String body) {
        try {
            JsonNode json = objectMapper.readTree(body);
            JsonNode error = json.path("error");
            if (error.isObject()) {
                String message = text(error, "message");
                return message == null ? "Google API hatası." : message;
            }
            if (error.isTextual()) {
                String description = text(json, "error_description");
                return description == null ? error.asText() : description;
            }
        } catch (Exception ignored) {
            // fall through
        }
        return "Google API hatası.";
    }

    private URI redirectWithResult(String returnUrl, String result, String message) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(safeReturnUrl(returnUrl))
                .replaceQueryParam("googleCalendar", result);
        if (message != null && !message.isBlank()) {
            builder.replaceQueryParam("googleCalendarMessage", message);
        }
        return builder.build().toUri();
    }

    private String safeReturnUrl(String returnUrl) {
        String fallback = properties.getFrontendCallbackUrl();
        if (returnUrl == null || returnUrl.isBlank()) return fallback;
        try {
            URI uri = URI.create(returnUrl);
            String origin = uri.getScheme() + "://" + uri.getAuthority();
            boolean allowed = properties.getAllowedReturnOrigins().stream().anyMatch(origin::equalsIgnoreCase)
                    || origin.equalsIgnoreCase(originOf(properties.getFrontendCallbackUrl()));
            return allowed ? returnUrl : fallback;
        } catch (Exception ex) {
            return fallback;
        }
    }

    private String originOf(String value) {
        try {
            URI uri = URI.create(value);
            return uri.getScheme() + "://" + uri.getAuthority();
        } catch (Exception ex) {
            return "";
        }
    }

    private void cleanupExpiredStates() {
        stateRepository.deleteAll(stateRepository.findAllByExpiresAtBefore(LocalDateTime.now()));
    }

    private void markSynced(GoogleCalendarConnection connection) {
        connection.setLastSyncAt(LocalDateTime.now());
        connection.setLastError(null);
        connectionRepository.save(connection);
    }

    private void ensureConfigured() {
        if (!properties.isConfigured()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Google Calendar backend ayarları eksik.");
        }
    }

    private void validateEventRange(LocalDateTime startsAt, LocalDateTime endsAt) {
        if (startsAt == null || endsAt == null || !startsAt.isBefore(endsAt)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bitiş zamanı başlangıçtan sonra olmalı.");
        }
    }

    private String eventTypeLabel(AcademicEvent event) {
        return switch (event.getType()) {
            case COURSE -> "Ders";
            case STUDY -> "Çalışma";
            case EXAM -> "Sınav";
            case PROJECT -> "Proje";
            case EVENT -> "Etkinlik";
        };
    }

    private String taskDescription(ClubTask task) {
        StringBuilder description = new StringBuilder("[Berkay Hub]");
        if (task.getOwner() != null && !task.getOwner().isBlank()) {
            description.append("\nSorumlu: ").append(task.getOwner());
        }
        if (task.getDescription() != null && !task.getDescription().isBlank()) {
            description.append("\n\n").append(task.getDescription());
        }
        return description.toString();
    }

    private String text(JsonNode node, String field) {
        JsonNode value = node == null ? null : node.get(field);
        return value == null || value.isNull() ? null : value.asText();
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private String encode(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    private boolean sameEmail(String left, String right) {
        return left != null && right != null && left.equalsIgnoreCase(right);
    }
}
