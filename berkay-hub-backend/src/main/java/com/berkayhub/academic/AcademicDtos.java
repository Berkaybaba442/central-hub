package com.berkayhub.academic;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public class AcademicDtos {
    public record CreateAcademicEventRequest(@NotBlank String title, AcademicEventType type, @NotNull LocalDateTime startsAt, String description) {}
}
