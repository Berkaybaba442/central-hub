package com.berkayhub.academic;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

import static com.berkayhub.academic.AcademicDtos.*;

@RestController
@RequestMapping("/api/academic")
public class AcademicController {
    private final AcademicEventRepository eventRepository;

    public AcademicController(AcademicEventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    @GetMapping("/events")
    public List<AcademicEvent> events() {
        return eventRepository.findAllByStartsAtAfterOrderByStartsAtAsc(LocalDateTime.now().minusDays(1));
    }

    @PostMapping("/events")
    @ResponseStatus(HttpStatus.CREATED)
    public AcademicEvent createEvent(@Valid @RequestBody CreateAcademicEventRequest request) {
        return eventRepository.save(new AcademicEvent(request.title(), request.type(), request.startsAt(), request.description()));
    }
}
