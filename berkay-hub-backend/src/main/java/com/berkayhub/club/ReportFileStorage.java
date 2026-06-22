package com.berkayhub.club;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.text.Normalizer;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

import static org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class ReportFileStorage {
    private static final DateTimeFormatter REPORT_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final Path storageRoot;

    public ReportFileStorage(@Value("${berkay-hub.reports.storage-path:data/reports}") String storagePath) {
        this.storageRoot = Path.of(storagePath).toAbsolutePath().normalize();
    }

    public Report writeReportFile(Report report) {
        try {
            Files.createDirectories(storageRoot);
            String fileName = "%06d-%s.md".formatted(report.getId(), slug(report.getTitle()));
            Path file = storageRoot.resolve(fileName).normalize();
            Files.writeString(file, renderReport(report), StandardCharsets.UTF_8);
            report.setFileName(fileName);
            report.setOriginalFileName(fileName);
            report.setFileContentType("text/markdown");
            report.setFilePath(file.toString());
            report.setFileSize(Files.size(file));
            return report;
        } catch (IOException ex) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, "Rapor dosyası VDS üzerinde oluşturulamadı.", ex);
        }
    }

    public Report saveUploadedReportFile(Report report, MultipartFile upload) {
        if (upload == null || upload.isEmpty()) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Rapor dosyası seçilmeli.");
        }

        try {
            Files.createDirectories(storageRoot);
            String originalName = cleanFileName(upload.getOriginalFilename());
            String fileName = "%06d-%s".formatted(report.getId(), originalName);
            Path file = storageRoot.resolve(fileName).normalize();
            if (!file.startsWith(storageRoot)) {
                throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Geçersiz dosya adı.");
            }

            Files.copy(upload.getInputStream(), file, StandardCopyOption.REPLACE_EXISTING);
            report.setOriginalFileName(originalName);
            report.setFileContentType(upload.getContentType());
            report.setFileName(fileName);
            report.setFilePath(file.toString());
            report.setFileSize(Files.size(file));
            return report;
        } catch (IOException ex) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, "Rapor dosyası VDS üzerinde kaydedilemedi.", ex);
        }
    }

    public Resource load(Report report) {
        Path file = resolveReportPath(report);
        if (!Files.exists(file) || !Files.isRegularFile(file)) {
            throw new ResponseStatusException(NOT_FOUND, "Rapor dosyası bulunamadı.");
        }

        try {
            return new UrlResource(file.toUri());
        } catch (MalformedURLException ex) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, "Rapor dosyası okunamadı.", ex);
        }
    }

    private Path resolveReportPath(Report report) {
        if (report.getFilePath() != null && !report.getFilePath().isBlank()) {
            return Path.of(report.getFilePath()).toAbsolutePath().normalize();
        }
        if (report.getFileName() != null && !report.getFileName().isBlank()) {
            return storageRoot.resolve(report.getFileName()).normalize();
        }
        throw new ResponseStatusException(NOT_FOUND, "Rapor dosyası henuz oluşturulmamış.");
    }

    private String renderReport(Report report) {
        StringBuilder builder = new StringBuilder();
        builder.append("# ").append(nullSafe(report.getTitle())).append("\n\n");
        builder.append("- Durum: ").append(report.getStatus() == null ? ReportStatus.PENDING : report.getStatus()).append("\n");
        builder.append("- Görev: ").append(nullSafe(report.getTaskTitle())).append("\n");
        builder.append("- Raporlayan: ").append(nullSafe(report.getAuthorName())).append(" <").append(nullSafe(report.getAuthorEmail())).append(">\n");
        builder.append("- Oluşturulma: ").append(report.getCreatedAt() == null ? "-" : report.getCreatedAt().format(REPORT_DATE_FORMAT)).append("\n");
        if (report.getReviewedAt() != null) {
            builder.append("- İnceleyen: ").append(nullSafe(report.getReviewedByName())).append(" <").append(nullSafe(report.getReviewedByEmail())).append(">\n");
            builder.append("- İnceleme: ").append(report.getReviewedAt().format(REPORT_DATE_FORMAT)).append("\n");
        }
        if (report.getReviewNote() != null && !report.getReviewNote().isBlank()) {
            builder.append("- İnceleme notu: ").append(report.getReviewNote()).append("\n");
        }
        builder.append("\n## Özet\n\n");
        builder.append(nullSafe(report.getSummary())).append("\n");
        return builder.toString();
    }

    private String slug(String value) {
        String normalized = Normalizer.normalize(nullSafe(value), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        if (normalized.isBlank()) return "rapor";
        return normalized.length() > 72 ? normalized.substring(0, 72) : normalized;
    }

    private String cleanFileName(String value) {
        String fileName = Path.of(value == null || value.isBlank() ? "rapor-dosyasi" : value).getFileName().toString();
        String normalized = Normalizer.normalize(fileName, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^a-zA-Z0-9._-]+", "-")
                .replaceAll("(^[.-]+|[.-]+$)", "");
        if (normalized.isBlank()) return "rapor-dosyasi";
        return normalized.length() > 120 ? normalized.substring(normalized.length() - 120) : normalized;
    }

    private String nullSafe(String value) {
        return value == null || value.isBlank() ? "-" : value.trim();
    }
}
