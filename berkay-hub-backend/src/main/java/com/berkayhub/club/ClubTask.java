package com.berkayhub.club;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;

@Entity
@Table(name = "club_tasks")
public class ClubTask {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @NotBlank @Column(nullable = false)
    private String title;
    private String owner;
    private String assigneeEmail;
    private String assignedByEmail;
    private String assignedByName;
    @Column(length = 2000)
    private String description;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskPriority priority = TaskPriority.MEDIUM;
    @Column(nullable = false)
    private boolean completed = false;
    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime assignedAt = LocalDateTime.now();

    public ClubTask() {}
    public ClubTask(String title, String owner, TaskPriority priority) {
        this.title = title;
        this.owner = owner;
        this.priority = priority == null ? TaskPriority.MEDIUM : priority;
    }
    public ClubTask(String title, String owner, String assigneeEmail, String assignedByEmail, String assignedByName, TaskPriority priority, String description) {
        this.title = title;
        this.owner = owner;
        this.assigneeEmail = assigneeEmail;
        this.assignedByEmail = assignedByEmail;
        this.assignedByName = assignedByName;
        this.priority = priority == null ? TaskPriority.MEDIUM : priority;
        this.description = description;
    }
    public Long getId() { return id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getOwner() { return owner; }
    public void setOwner(String owner) { this.owner = owner; }
    public String getAssigneeEmail() { return assigneeEmail; }
    public void setAssigneeEmail(String assigneeEmail) { this.assigneeEmail = assigneeEmail; }
    public String getAssignedByEmail() { return assignedByEmail; }
    public void setAssignedByEmail(String assignedByEmail) { this.assignedByEmail = assignedByEmail; }
    public String getAssignedByName() { return assignedByName; }
    public void setAssignedByName(String assignedByName) { this.assignedByName = assignedByName; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public TaskPriority getPriority() { return priority; }
    public void setPriority(TaskPriority priority) { this.priority = priority; }
    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean completed) { this.completed = completed; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getAssignedAt() { return assignedAt; }
    public void setAssignedAt(LocalDateTime assignedAt) { this.assignedAt = assignedAt; }
}
