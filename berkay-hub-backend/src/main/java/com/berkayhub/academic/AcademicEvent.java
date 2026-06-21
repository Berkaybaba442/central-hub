package com.berkayhub.academic;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;

@Entity
@Table(name = "academic_events")
public class AcademicEvent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @NotBlank @Column(nullable = false)
    private String title;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AcademicEventType type = AcademicEventType.EVENT;
    @Column(nullable = false)
    private LocalDateTime startsAt;
    @Column(length = 1500)
    private String description;

    public AcademicEvent() {}
    public AcademicEvent(String title, AcademicEventType type, LocalDateTime startsAt, String description) {
        this.title = title;
        this.type = type == null ? AcademicEventType.EVENT : type;
        this.startsAt = startsAt;
        this.description = description;
    }
    public Long getId() { return id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public AcademicEventType getType() { return type; }
    public void setType(AcademicEventType type) { this.type = type; }
    public LocalDateTime getStartsAt() { return startsAt; }
    public void setStartsAt(LocalDateTime startsAt) { this.startsAt = startsAt; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
