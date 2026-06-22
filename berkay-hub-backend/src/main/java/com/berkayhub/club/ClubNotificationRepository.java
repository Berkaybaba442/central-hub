package com.berkayhub.club;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ClubNotificationRepository extends JpaRepository<ClubNotification, Long> {
    List<ClubNotification> findAllByRecipientEmailIgnoreCaseOrderByCreatedAtDesc(String recipientEmail);
    long countByRecipientEmailIgnoreCaseAndReadFlagFalse(String recipientEmail);
}
