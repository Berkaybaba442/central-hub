package com.berkayhub.club;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static com.berkayhub.club.ClubDtos.*;

@RestController
@RequestMapping("/api/club")
public class ClubController {
    private final ReportRepository reportRepository;
    private final ClubTaskRepository taskRepository;
    private final TeamAssignmentRepository assignmentRepository;

    public ClubController(ReportRepository reportRepository, ClubTaskRepository taskRepository, TeamAssignmentRepository assignmentRepository) {
        this.reportRepository = reportRepository;
        this.taskRepository = taskRepository;
        this.assignmentRepository = assignmentRepository;
    }

    @GetMapping("/overview")
    public ClubOverview overview() {
        List<Report> reports = reportRepository.findAllByOrderByCreatedAtDesc();
        List<ClubTask> tasks = taskRepository.findAllByOrderByCompletedAscCreatedAtDesc();
        List<TeamAssignment> assignments = assignmentRepository.findAll();
        return new ClubOverview(reports.size(), taskRepository.countByCompletedFalse(), assignments.size(), reports, tasks, assignments);
    }

    @GetMapping("/reports")
    public List<Report> reports() { return reportRepository.findAllByOrderByCreatedAtDesc(); }

    @PostMapping("/reports")
    @ResponseStatus(HttpStatus.CREATED)
    public Report createReport(@Valid @RequestBody CreateReportRequest request) {
        return reportRepository.save(new Report(request.title(), request.summary()));
    }

    @GetMapping("/tasks")
    public List<ClubTask> tasks() { return taskRepository.findAllByOrderByCompletedAscCreatedAtDesc(); }

    @PostMapping("/tasks")
    @ResponseStatus(HttpStatus.CREATED)
    public ClubTask createTask(@Valid @RequestBody CreateTaskRequest request) {
        return taskRepository.save(new ClubTask(request.title(), request.owner(), request.priority()));
    }

    @PutMapping("/tasks/{id}/toggle")
    public ClubTask toggleTask(@PathVariable Long id) {
        ClubTask task = taskRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Görev bulunamadı."));
        task.setCompleted(!task.isCompleted());
        return taskRepository.save(task);
    }

    @GetMapping("/assignments")
    public List<TeamAssignment> assignments() { return assignmentRepository.findAll(); }

    @PostMapping("/assignments")
    @ResponseStatus(HttpStatus.CREATED)
    public TeamAssignment createAssignment(@Valid @RequestBody CreateAssignmentRequest request) {
        return assignmentRepository.save(new TeamAssignment(request.memberName(), request.teamName(), request.responsibility()));
    }
}
