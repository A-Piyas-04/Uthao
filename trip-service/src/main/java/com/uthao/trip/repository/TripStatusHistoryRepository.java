package com.uthao.trip.repository;

import com.uthao.trip.model.TripStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TripStatusHistoryRepository extends JpaRepository<TripStatusHistory, Long> {
}
