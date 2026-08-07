package com.uthao.matching.service;

import com.uthao.matching.config.RabbitMQConfig;
import com.uthao.matching.dto.FindDriverRequest;
import com.uthao.matching.dto.MatchResultDto;
import com.uthao.matching.dto.NearbyDriverDto;
import com.uthao.matching.model.MatchHistory;
import com.uthao.matching.model.MatchRequest;
import com.uthao.matching.repository.MatchHistoryRepository;
import com.uthao.matching.repository.MatchRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MatchingService {

    private final MatchRequestRepository matchRequestRepository;
    private final MatchHistoryRepository matchHistoryRepository;
    private final RestTemplate restTemplate;
    private final RabbitTemplate rabbitTemplate;

    public MatchResultDto findDriver(FindDriverRequest req) {
        String url = UriComponentsBuilder
                .fromHttpUrl("http://localhost:8083/drivers/available")
                .queryParam("lat", req.getPickupLat())
                .queryParam("lng", req.getPickupLng())
                .queryParam("radiusKm", 5)
                .toUriString();

        List<NearbyDriverDto> drivers;
        try {
            ResponseEntity<List<NearbyDriverDto>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<NearbyDriverDto>>() {}
            );
            drivers = response.getBody();
        } catch (Exception e) {
            drivers = List.of();
        }

        if (drivers == null || drivers.isEmpty()) {
            MatchRequest matchRequest = MatchRequest.builder()
                    .rideRequestId(req.getRideRequestId())
                    .riderId(req.getRiderId())
                    .pickupLat(req.getPickupLat())
                    .pickupLng(req.getPickupLng())
                    .status("NO_DRIVER_FOUND")
                    .build();
            matchRequestRepository.save(matchRequest);

            return MatchResultDto.builder()
                    .rideRequestId(req.getRideRequestId())
                    .status("NO_DRIVER_FOUND")
                    .build();
        }

        NearbyDriverDto nearest = drivers.get(0);

        MatchRequest matchRequest = MatchRequest.builder()
                .rideRequestId(req.getRideRequestId())
                .riderId(req.getRiderId())
                .pickupLat(req.getPickupLat())
                .pickupLng(req.getPickupLng())
                .status("MATCHED")
                .build();
        matchRequestRepository.save(matchRequest);

        MatchHistory history = MatchHistory.builder()
                .rideRequestId(req.getRideRequestId())
                .riderId(req.getRiderId())
                .driverId(nearest.getDriverId())
                .build();
        matchHistoryRepository.save(history);

        Map<String, Object> payload = new HashMap<>();
        payload.put("rideRequestId", req.getRideRequestId());
        payload.put("riderId", req.getRiderId());
        payload.put("driverId", nearest.getDriverId());
        payload.put("driverName", nearest.getName());
        payload.put("eta", "5 mins");
        payload.put("pickupLat", req.getPickupLat());
        payload.put("pickupLng", req.getPickupLng());
        payload.put("dropLat", req.getDropLat());
        payload.put("dropLng", req.getDropLng());

        rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, "driver.assigned", payload);

        return MatchResultDto.builder()
                .rideRequestId(req.getRideRequestId())
                .driverId(nearest.getDriverId())
                .driverName(nearest.getName())
                .vehiclePlate(nearest.getVehiclePlate())
                .eta("5 mins")
                .status("MATCHED")
                .build();
    }
}
