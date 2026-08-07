package com.uthao.rider.controller;

import com.uthao.rider.dto.RideRequestDto;
import com.uthao.rider.dto.RideRequestResponse;
import com.uthao.rider.service.RideRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/riders")
@RequiredArgsConstructor
public class RiderController {

    private final RideRequestService rideRequestService;

    @PostMapping("/requests")
    @ResponseStatus(HttpStatus.CREATED)
    public RideRequestResponse createRequest(@Valid @RequestBody RideRequestDto dto) {
        return rideRequestService.createRequest(dto);
    }

    @GetMapping("/{riderId}/requests")
    public List<RideRequestResponse> getRequests(@PathVariable Long riderId) {
        return rideRequestService.getRequestsByRider(riderId);
    }

    @PostMapping("/requests/{requestId}/cancel")
    public RideRequestResponse cancelRequest(@PathVariable Long requestId) {
        return rideRequestService.cancelRequest(requestId);
    }
}
