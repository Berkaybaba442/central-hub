package com.berkayhub.config;

import com.berkayhub.academic.*;
import com.berkayhub.auth.*;
import com.berkayhub.camera.*;
import com.berkayhub.club.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;

@Configuration
public class DataSeeder {
    @Bean
    CommandLineRunner seed(
            AppUserRepository userRepository,
            ReportRepository reportRepository,
            ClubTaskRepository taskRepository,
            TeamAssignmentRepository assignmentRepository,
            AcademicEventRepository eventRepository,
            SecurityCameraRepository cameraRepository,
            PasswordEncoder passwordEncoder
    ) {
        return args -> {
            if (userRepository.count() == 0) {
                userRepository.save(new AppUser("admin@berkayhub.local", "Berkay Hub Admin", passwordEncoder.encode("admin123"), UserRole.ADMIN));
                userRepository.save(new AppUser("user@berkayhub.local", "Berkay Hub Kullanıcı", passwordEncoder.encode("user123"), UserRole.USER));
            }
            if (reportRepository.count() == 0) {
                reportRepository.save(new Report("Haftalık Robolig Çalışma Raporu", "Mekanik şase revizyonu, motor sürücü testleri ve yazılım görev dağılımı tamamlandı."));
                reportRepository.save(new Report("Sektör Sohbetleri Hazırlık", "Konuşmacı adayları, duyuru takvimi ve görev dağılımı oluşturuldu."));
            }
            if (taskRepository.count() == 0) {
                taskRepository.save(new ClubTask("Teknofest görev listesini güncelle", "Berkay", TaskPriority.HIGH));
                taskRepository.save(new ClubTask("Atölye sponsor ihtiyaç listesini toparla", "Koordinasyon", TaskPriority.MEDIUM));
                ClubTask done = new ClubTask("Haftalık toplantı notlarını yayınla", "Sekreterya", TaskPriority.LOW);
                done.setCompleted(true);
                taskRepository.save(done);
            }
            if (assignmentRepository.count() == 0) {
                assignmentRepository.save(new TeamAssignment("Berkay Kerem", "Yazılım", "Dashboard ve API entegrasyonu"));
                assignmentRepository.save(new TeamAssignment("Emirhan", "Mekanik", "Şase revizyonu"));
            }
            if (eventRepository.count() == 0) {
                eventRepository.save(new AcademicEvent("Mikrodenetleyici Laboratuvarı", AcademicEventType.COURSE, LocalDateTime.now().plusDays(1).withHour(10).withMinute(0), "Timer, ADC, PWM ve CCP tekrar."));
                eventRepository.save(new AcademicEvent("Sayısal Analiz Çalışması", AcademicEventType.STUDY, LocalDateTime.now().plusDays(2).withHour(19).withMinute(30), "Newton, Simpson, Gauss-Seidel ve spline soruları."));
            }
            if (cameraRepository.count() == 0) {
                cameraRepository.save(new SecurityCamera("Laboratuvar Ana Kamera", "Atölye Giriş", "", CameraStatus.ONLINE));
                cameraRepository.save(new SecurityCamera("Elektronik Masa", "Masa 2", "", CameraStatus.MAINTENANCE));
            }
        };
    }
}
