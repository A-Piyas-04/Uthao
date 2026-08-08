package com.uthao.driver.repository;

import com.uthao.driver.model.DriverTrip;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DriverTripRepository extends JpaRepository<DriverTrip, Long> {
    List<DriverTrip> findByDriverIdOrderByAssignedAtDesc(Long driverId);
}
