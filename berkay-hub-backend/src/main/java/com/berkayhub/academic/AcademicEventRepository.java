package com.berkayhub.academic;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface AcademicEventRepository extends JpaRepository<AcademicEvent, Long> {
    List<AcademicEvent> findAllByStartsAtAfterOrderByStartsAtAsc(LocalDateTime now);
}
