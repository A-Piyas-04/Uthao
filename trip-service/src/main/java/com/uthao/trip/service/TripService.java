package com.uthao.trip.service;

import com.uthao.trip.config.RabbitMQConfig;
import com.uthao.trip.model.Trip;
import com.uthao.trip.model.TripStatusHistory;
import com.uthao.trip.repository.TripRepository;
import com.uthao.trip.repository.TripStatusHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TripService {

    private final TripRepository tripRepository;
    private final TripStatusHistoryRepository historyRepository;
    private final RabbitTemplate rabbitTemplate;

    public Trip createTrip(Map<String, Object> event) {
        Trip trip = Trip.builder()
                .rideRequestId(toLong(event.get("rideRequestId")))
                .riderId(toLong(event.get("riderId")))
                .driverId(toLong(event.get("driverId")))
                .pickupLat(toDouble(event.get("pickupLat")))
                .pickupLng(toDouble(event.get("pickupLng")))
                .dropLat(toDouble(event.get("dropLat")))
                .dropLng(toDouble(event.get("dropLng")))
                .status("MATCHED")
                .build();

        trip = tripRepository.save(trip);
        addHistory(trip.getId(), "MATCHED");
        return trip;
    }

    public Trip startTrip(Long tripId, String requesterRole) {
        requireDriver(requesterRole);
        Trip trip = getTrip(tripId);
        trip.setStatus("ONGOING");
        trip.setStartedAt(LocalDateTime.now());
        trip = tripRepository.save(trip);
        addHistory(tripId, "ONGOING");
        return trip;
    }

    public Trip completeTrip(Long tripId, String requesterRole) {
        requireDriver(requesterRole);
        Trip trip = getTrip(tripId);
        trip.setStatus("COMPLETED");
        trip.setCompletedAt(LocalDateTime.now());
        trip.setFare(0.0);
        trip = tripRepository.save(trip);
        addHistory(tripId, "COMPLETED");

        Map<String, Object> payload = new HashMap<>();
        payload.put("tripId", trip.getId());
        payload.put("riderId", trip.getRiderId());
        payload.put("driverId", trip.getDriverId());
        payload.put("fare", 0.0);
        payload.put("pickupLat", trip.getPickupLat());
        payload.put("pickupLng", trip.getPickupLng());
        payload.put("dropLat", trip.getDropLat());
        payload.put("dropLng", trip.getDropLng());

        rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, "trip.completed", payload);
        return trip;
    }

    public Trip cancelTrip(Long tripId) {
        Trip trip = getTrip(tripId);
        if (!"MATCHED".equals(trip.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Trip can only be cancelled before it has started");
        }
        trip.setStatus("CANCELLED");
        trip = tripRepository.save(trip);
        addHistory(tripId, "CANCELLED");

        Map<String, Object> payload = new HashMap<>();
        payload.put("tripId", trip.getId());
        payload.put("riderId", trip.getRiderId());
        payload.put("driverId", trip.getDriverId());

        rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, "trip.cancelled", payload);
        return trip;
    }

    public Trip getTrip(Long tripId) {
        return tripRepository.findById(tripId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found"));
    }

    public Trip getTripByRideRequestId(Long rideRequestId) {
        return tripRepository.findByRideRequestId(rideRequestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No trip created yet for this ride request"));
    }

    private void requireDriver(String requesterRole) {
        if (!"DRIVER".equalsIgnoreCase(requesterRole)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the driver can perform this action");
        }
    }

    private void addHistory(Long tripId, String status) {
        historyRepository.save(TripStatusHistory.builder()
                .tripId(tripId)
                .status(status)
                .build());
    }

    private Long toLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(value.toString());
    }

    private Double toDouble(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        return Double.parseDouble(value.toString());
    }
}
