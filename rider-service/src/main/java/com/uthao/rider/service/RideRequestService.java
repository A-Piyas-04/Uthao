package com.uthao.rider.service;

import com.uthao.rider.config.RabbitMQConfig;
import com.uthao.rider.dto.RideRequestDto;
import com.uthao.rider.dto.RideRequestResponse;
import com.uthao.rider.model.RideRequest;
import com.uthao.rider.repository.RideRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RideRequestService {

    private final RideRequestRepository rideRequestRepository;
    private final RabbitTemplate rabbitTemplate;

    public RideRequestResponse createRequest(RideRequestDto dto) {
        RideRequest request = RideRequest.builder()
                .riderId(dto.getRiderId())
                .pickupLat(dto.getPickupLat())
                .pickupLng(dto.getPickupLng())
                .dropLat(dto.getDropLat())
                .dropLng(dto.getDropLng())
                .status("REQUESTED")
                .build();

        request = rideRequestRepository.save(request);

        Map<String, Object> payload = new HashMap<>();
        payload.put("id", request.getId());
        payload.put("riderId", request.getRiderId());
        payload.put("pickupLat", request.getPickupLat());
        payload.put("pickupLng", request.getPickupLng());
        payload.put("dropLat", request.getDropLat());
        payload.put("dropLng", request.getDropLng());
        payload.put("status", request.getStatus());
        payload.put("createdAt", request.getCreatedAt() != null ? request.getCreatedAt().toString() : null);

        rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, "ride.requested", payload);

        return toResponse(request);
    }

    public RideRequestResponse cancelRequest(Long requestId) {
        RideRequest request = rideRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ride request not found"));
        request.setStatus("CANCELLED");
        request = rideRequestRepository.save(request);
        return toResponse(request);
    }

    public List<RideRequestResponse> getRequestsByRider(Long riderId) {
        return rideRequestRepository.findByRiderId(riderId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private RideRequestResponse toResponse(RideRequest request) {
        return RideRequestResponse.builder()
                .id(request.getId())
                .riderId(request.getRiderId())
                .status(request.getStatus())
                .createdAt(request.getCreatedAt())
                .build();
    }
}
