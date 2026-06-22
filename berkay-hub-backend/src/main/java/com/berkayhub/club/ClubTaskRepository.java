package com.berkayhub.club;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ClubTaskRepository extends JpaRepository<ClubTask, Long> {
    List<ClubTask> findAllByOrderByCompletedAscCreatedAtDesc();
    List<ClubTask> findAllByAssigneeEmailIgnoreCaseOrderByCompletedAscCreatedAtDesc(String assigneeEmail);
    long countByCompletedFalse();
    long countByAssigneeEmailIgnoreCaseAndCompletedFalse(String assigneeEmail);
}
