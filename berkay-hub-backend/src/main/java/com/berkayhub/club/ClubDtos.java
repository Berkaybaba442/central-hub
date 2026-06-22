package com.berkayhub.club;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public class ClubDtos {
    public record CreateReportRequest(@NotBlank String title, @NotBlank String summary) {}
    public record CreateTaskRequest(@NotBlank String title, String owner, String assigneeEmail, TaskPriority priority, String description) {}
    public record SubmitTaskReportRequest(@NotBlank String title, @NotBlank String summary) {}
    public record ReviewReportRequest(@NotNull ReportStatus status, String note) {}
    public record CreateAssignmentRequest(@NotBlank String memberName, @NotBlank String teamName, @NotBlank String responsibility) {}
    public record ClubOverview(
            long reportCount,
            long openTaskCount,
            long memberCount,
            List<Report> reports,
            List<ClubTask> tasks,
            List<TeamAssignment> assignments,
            List<ClubNotification> notifications,
            long unreadNotificationCount
    ) {}
}
