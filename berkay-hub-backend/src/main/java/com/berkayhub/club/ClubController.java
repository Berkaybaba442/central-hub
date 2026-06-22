package com.berkayhub.club;

import com.berkayhub.auth.AppUser;
import com.berkayhub.auth.AppUserRepository;
import com.berkayhub.auth.UserRole;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;

import static com.berkayhub.club.ClubDtos.*;

@RestController
@RequestMapping("/api/club")
public class ClubController {
    private final ReportRepository reportRepository;
    private final ClubTaskRepository taskRepository;
    private final TeamAssignmentRepository assignmentRepository;
    private final ClubNotificationRepository notificationRepository;
    private final AppUserRepository userRepository;
    private final ReportFileStorage reportFileStorage;

    public ClubController(
            ReportRepository reportRepository,
            ClubTaskRepository taskRepository,
            TeamAssignmentRepository assignmentRepository,
            ClubNotificationRepository notificationRepository,
            AppUserRepository userRepository,
            ReportFileStorage reportFileStorage
    ) {
        this.reportRepository = reportRepository;
        this.taskRepository = taskRepository;
        this.assignmentRepository = assignmentRepository;
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.reportFileStorage = reportFileStorage;
    }

    @GetMapping("/overview")
    public ClubOverview overview(Authentication authentication) {
        AppUser user = currentUser(authentication);
        List<Report> reports = reportsFor(user);
        List<ClubTask> tasks = tasksFor(user);
        List<TeamAssignment> assignments = assignmentRepository.findAll();
        List<ClubNotification> notifications = notificationRepository.findAllByRecipientEmailIgnoreCaseOrderByCreatedAtDesc(user.getEmail());
        long openTaskCount = isAdmin(user)
                ? taskRepository.countByCompletedFalse()
                : taskRepository.countByAssigneeEmailIgnoreCaseAndCompletedFalse(user.getEmail());
        long unreadCount = notificationRepository.countByRecipientEmailIgnoreCaseAndReadFlagFalse(user.getEmail());
        return new ClubOverview(reports.size(), openTaskCount, assignments.size(), reports, tasks, assignments, notifications, unreadCount);
    }

    @GetMapping("/reports")
    public List<Report> reports(Authentication authentication) {
        return reportsFor(currentUser(authentication));
    }

    @PostMapping("/reports")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public Report createReport(@Valid @RequestBody CreateReportRequest request, Authentication authentication) {
        AppUser admin = currentUser(authentication);
        Report report = new Report(request.title().trim(), request.summary().trim());
        report.setAuthorEmail(admin.getEmail());
        report.setAuthorName(admin.getDisplayName());
        report.setStatus(ReportStatus.PENDING);
        return saveReportWithFile(report);
    }

    @GetMapping("/reports/{id}/download")
    public ResponseEntity<Resource> downloadReport(@PathVariable Long id, Authentication authentication) {
        AppUser user = currentUser(authentication);
        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rapor bulunamadı."));
        if (!isAdmin(user) && !sameEmail(user.getEmail(), report.getAuthorEmail())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu raporu indirme yetkin yok.");
        }
        if (report.getFilePath() == null || report.getFilePath().isBlank()) {
            report = saveReportWithFile(report);
        }

        Resource resource = reportFileStorage.load(report);
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(downloadFileName(report), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(mediaTypeFor(report))
                .body(resource);
    }

    @PutMapping("/reports/{id}/review")
    @PreAuthorize("hasRole('ADMIN')")
    public Report reviewReport(@PathVariable Long id, @Valid @RequestBody ReviewReportRequest request, Authentication authentication) {
        if (request.status() != ReportStatus.APPROVED && request.status() != ReportStatus.REJECTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rapor sadece kabul veya red durumuna alınabilir.");
        }

        AppUser admin = currentUser(authentication);
        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rapor bulunamadı."));
        report.setStatus(request.status());
        report.setReviewNote(request.note());
        report.setReviewedByEmail(admin.getEmail());
        report.setReviewedByName(admin.getDisplayName());
        report.setReviewedAt(LocalDateTime.now());
        Report saved = reportRepository.save(report);

        if (saved.getAuthorEmail() != null && !sameEmail(saved.getAuthorEmail(), admin.getEmail())) {
            String result = saved.getStatus() == ReportStatus.APPROVED ? "kabul edildi" : "reddedildi";
            notifyUser(
                    saved.getAuthorEmail(),
                    "Rapor incelemesi tamamlandı",
                    "\"%s\" raporun admin tarafından %s.".formatted(saved.getTitle(), result),
                    "REPORT_REVIEWED",
                    "modules/club-management/index.html",
                    saved.getTaskId(),
                    saved.getId()
            );
        }
        return saved;
    }

    @GetMapping("/tasks")
    public List<ClubTask> tasks(Authentication authentication) {
        return tasksFor(currentUser(authentication));
    }

    @PostMapping("/tasks")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public ClubTask createTask(@Valid @RequestBody CreateTaskRequest request, Authentication authentication) {
        AppUser admin = currentUser(authentication);
        String assigneeEmail = clean(request.assigneeEmail());
        if (assigneeEmail == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Görev atanacak üye seçilmeli.");
        }

        AppUser assignee = userRepository.findByEmailIgnoreCase(assigneeEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Görev atanacak üye bulunamadı."));
        String owner = clean(request.owner()) == null ? assignee.getDisplayName() : clean(request.owner());
        ClubTask task = new ClubTask(
                request.title().trim(),
                owner,
                assignee.getEmail(),
                admin.getEmail(),
                admin.getDisplayName(),
                request.priority(),
                clean(request.description())
        );
        ClubTask saved = taskRepository.save(task);
        notifyUser(
                assignee.getEmail(),
                "Yeni görev atandı",
                "\"%s\" görevi %s tarafından sana atandı.".formatted(saved.getTitle(), admin.getDisplayName()),
                "TASK_ASSIGNED",
                "modules/club-management/index.html",
                saved.getId(),
                null
        );
        return saved;
    }

    @PutMapping("/tasks/{id}/toggle")
    public ClubTask toggleTask(@PathVariable Long id, Authentication authentication) {
        AppUser user = currentUser(authentication);
        ClubTask task = taskRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Görev bulunamadı."));
        if (!isAdmin(user) && !ownsTask(user, task)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu görevi güncelleme yetkin yok.");
        }

        task.setCompleted(!task.isCompleted());
        ClubTask saved = taskRepository.save(task);
        if (saved.isCompleted() && !isAdmin(user)) {
            notifyAdmins(
                    "Görev tamamlandı",
                    "\"%s\" görevi %s tarafından tamamlandı.".formatted(saved.getTitle(), user.getDisplayName()),
                    "TASK_COMPLETED",
                    saved.getId(),
                    null
            );
        }
        return saved;
    }

    @PostMapping(value = "/tasks/{id}/reports", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Report submitTaskReport(
            @PathVariable Long id,
            @RequestParam("title") String title,
            @RequestParam(value = "note", required = false) String note,
            @RequestParam("file") MultipartFile file,
            Authentication authentication
    ) {
        AppUser user = currentUser(authentication);
        ClubTask task = taskRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Görev bulunamadı."));
        if (!isAdmin(user) && !ownsTask(user, task)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu görev için rapor gönderme yetkin yok.");
        }

        String reportTitle = clean(title);
        if (reportTitle == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rapor başlığı zorunludur.");
        }
        String reportNote = clean(note);
        if (reportNote == null) {
            reportNote = "Yüklenen dosya: " + (file.getOriginalFilename() == null ? "rapor dosyası" : file.getOriginalFilename());
        }

        Report report = new Report(reportTitle, reportNote);
        report.setTaskId(task.getId());
        report.setTaskTitle(task.getTitle());
        report.setAuthorEmail(user.getEmail());
        report.setAuthorName(user.getDisplayName());
        report.setStatus(ReportStatus.PENDING);
        Report saved = reportRepository.save(report);
        reportFileStorage.saveUploadedReportFile(saved, file);
        saved = reportRepository.save(saved);

        notifyAdmins(
                "Yeni rapor bekliyor",
                "%s, \"%s\" görevi için rapor gönderdi.".formatted(user.getDisplayName(), task.getTitle()),
                "REPORT_SUBMITTED",
                task.getId(),
                saved.getId()
        );
        return saved;
    }

    @GetMapping("/notifications")
    public List<ClubNotification> notifications(Authentication authentication) {
        AppUser user = currentUser(authentication);
        return notificationRepository.findAllByRecipientEmailIgnoreCaseOrderByCreatedAtDesc(user.getEmail());
    }

    @PutMapping("/notifications/{id}/read")
    public ClubNotification markNotificationRead(@PathVariable Long id, Authentication authentication) {
        AppUser user = currentUser(authentication);
        ClubNotification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bildirim bulunamadı."));
        if (!sameEmail(user.getEmail(), notification.getRecipientEmail())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu bildirimi güncelleme yetkin yok.");
        }

        notification.setReadFlag(true);
        notification.setReadAt(LocalDateTime.now());
        return notificationRepository.save(notification);
    }

    @GetMapping("/assignments")
    public List<TeamAssignment> assignments() {
        return assignmentRepository.findAll();
    }

    @PostMapping("/assignments")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public TeamAssignment createAssignment(@Valid @RequestBody CreateAssignmentRequest request) {
        return assignmentRepository.save(new TeamAssignment(request.memberName(), request.teamName(), request.responsibility()));
    }

    private Report saveReportWithFile(Report report) {
        Report saved = reportRepository.save(report);
        reportFileStorage.writeReportFile(saved);
        return reportRepository.save(saved);
    }

    private String downloadFileName(Report report) {
        if (report.getOriginalFileName() != null && !report.getOriginalFileName().isBlank()) return report.getOriginalFileName();
        if (report.getFileName() != null && !report.getFileName().isBlank()) return report.getFileName();
        return "rapor.md";
    }

    private MediaType mediaTypeFor(Report report) {
        if (report.getFileContentType() == null || report.getFileContentType().isBlank()) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }

        try {
            return MediaType.parseMediaType(report.getFileContentType());
        } catch (IllegalArgumentException ex) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }

    private List<Report> reportsFor(AppUser user) {
        if (isAdmin(user)) return reportRepository.findAllByOrderByCreatedAtDesc();
        return reportRepository.findAllByAuthorEmailIgnoreCaseOrderByCreatedAtDesc(user.getEmail());
    }

    private List<ClubTask> tasksFor(AppUser user) {
        if (isAdmin(user)) return taskRepository.findAllByOrderByCompletedAscCreatedAtDesc();
        return taskRepository.findAllByAssigneeEmailIgnoreCaseOrderByCompletedAscCreatedAtDesc(user.getEmail());
    }

    private AppUser currentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Oturum bulunamadı.");
        }
        return userRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Kullanıcı bulunamadı."));
    }

    private boolean isAdmin(AppUser user) {
        return user.getRole() == UserRole.ADMIN;
    }

    private boolean ownsTask(AppUser user, ClubTask task) {
        return sameEmail(user.getEmail(), task.getAssigneeEmail());
    }

    private void notifyAdmins(String title, String message, String type, Long taskId, Long reportId) {
        userRepository.findAllByRole(UserRole.ADMIN).forEach(admin ->
                notifyUser(admin.getEmail(), title, message, type, "modules/club-management/index.html", taskId, reportId)
        );
    }

    private void notifyUser(String recipientEmail, String title, String message, String type, String link, Long taskId, Long reportId) {
        if (recipientEmail == null || recipientEmail.isBlank()) return;
        notificationRepository.save(new ClubNotification(recipientEmail, title, message, type, link, taskId, reportId));
    }

    private boolean sameEmail(String left, String right) {
        return left != null && right != null && left.equalsIgnoreCase(right);
    }

    private String clean(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }
}
