package com.uthao.driver.repository;

import com.uthao.driver.model.DriverStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DriverStatusRepository extends JpaRepository<DriverStatus, Long> {

    Optional<DriverStatus> findByDriverId(Long driverId);

    List<DriverStatus> findByStatus(String status);
}
