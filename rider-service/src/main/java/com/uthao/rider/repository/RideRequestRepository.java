package com.uthao.rider.repository;

import com.uthao.rider.model.RideRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RideRequestRepository extends JpaRepository<RideRequest, Long> {

    List<RideRequest> findByRiderId(Long riderId);
}
