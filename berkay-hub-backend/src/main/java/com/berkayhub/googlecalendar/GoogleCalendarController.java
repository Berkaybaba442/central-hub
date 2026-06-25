package com.berkayhub.googlecalendar;

import com.berkayhub.auth.AppUser;
import com.berkayhub.auth.AppUserRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.List;

import static com.berkayhub.googlecalendar.GoogleCalendarDtos.*;

@RestController
@RequestMapping("/api/google-calendar")
public class GoogleCalendarController {
    private final GoogleCalendarService googleCalendarService;
    private final AppUserRepository userRepository;

    public GoogleCalendarController(GoogleCalendarService googleCalendarService, AppUserRepository userRepository) {
        this.googleCalendarService = googleCalendarService;
        this.userRepository = userRepository;
    }

    @GetMapping("/status")
    public GoogleCalendarStatusResponse status(Authentication authentication) {
        return googleCalendarService.status(currentUser(authentication));
    }

    @GetMapping("/members")
    public List<GoogleCalendarMemberStatus> members(Authentication authentication) {
        return googleCalendarService.memberStatuses(currentUser(authentication));
    }

    @PostMapping("/oauth/start")
    public StartGoogleOAuthResponse startOAuth(@RequestBody(required = false) StartGoogleOAuthRequest request, Authentication authentication) {
        return googleCalendarService.startOAuth(currentUser(authentication), request);
    }

    @GetMapping("/oauth/callback")
    public ResponseEntity<Void> callback(
            @RequestParam(value = "code", required = false) String code,
            @RequestParam(value = "state", required = false) String state,
            @RequestParam(value = "error", required = false) String error
    ) {
        URI redirect = googleCalendarService.handleCallback(code, state, error);
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, redirect.toString())
                .build();
    }

    @DeleteMapping("/connection")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void disconnect(Authentication authentication) {
        googleCalendarService.disconnect(currentUser(authentication));
    }

    @GetMapping("/events")
    public List<GoogleCalendarEventResponse> events(Authentication authentication) {
        return googleCalendarService.listEvents(currentUser(authentication));
    }

    @PostMapping("/events")
    @ResponseStatus(HttpStatus.CREATED)
    public GoogleCalendarEventResponse createEvent(
            @Valid @RequestBody CreateGoogleCalendarEventRequest request,
            Authentication authentication
    ) {
        return googleCalendarService.createEvent(currentUser(authentication), request);
    }

    @PostMapping("/academic-events/{id}/sync")
    public GoogleCalendarEventResponse syncAcademicEvent(@PathVariable Long id, Authentication authentication) {
        return googleCalendarService.syncAcademicEvent(currentUser(authentication), id);
    }

    @PostMapping("/academic-events/sync")
    public List<GoogleCalendarEventResponse> syncAcademicEvents(Authentication authentication) {
        return googleCalendarService.syncAllAcademicEvents(currentUser(authentication));
    }

    @PostMapping("/tasks/{id}/sync")
    public GoogleCalendarEventResponse syncTask(
            @PathVariable Long id,
            @Valid @RequestBody SyncTaskCalendarRequest request,
            Authentication authentication
    ) {
        return googleCalendarService.syncTask(currentUser(authentication), id, request);
    }

    private AppUser currentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Oturum bulunamadı.");
        }
        return userRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Kullanıcı bulunamadı."));
    }
}
