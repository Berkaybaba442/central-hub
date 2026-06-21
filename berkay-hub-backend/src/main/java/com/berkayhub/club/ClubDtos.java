package com.berkayhub.club;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public class ClubDtos {
    public record CreateReportRequest(@NotBlank String title, @NotBlank String summary) {}
    public record CreateTaskRequest(@NotBlank String title, String owner, TaskPriority priority) {}
    public record CreateAssignmentRequest(@NotBlank String memberName, @NotBlank String teamName, @NotBlank String responsibility) {}
    public record ClubOverview(long reportCount, long openTaskCount, long memberCount, List<Report> reports, List<ClubTask> tasks, List<TeamAssignment> assignments) {}
}
