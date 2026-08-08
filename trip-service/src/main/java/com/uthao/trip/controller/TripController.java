package com.uthao.trip.controller;

import com.uthao.trip.model.Trip;
import com.uthao.trip.security.JwtUtil;
import com.uthao.trip.service.TripService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/trips")
@RequiredArgsConstructor
public class TripController {

    private final TripService tripService;
    private final JwtUtil jwtUtil;

    @GetMapping("/{tripId}")
    public Trip getTrip(@PathVariable Long tripId) {
        return tripService.getTrip(tripId);
    }

    @GetMapping("/by-request/{rideRequestId}")
    public Trip getTripByRideRequest(@PathVariable Long rideRequestId) {
        return tripService.getTripByRideRequestId(rideRequestId);
    }

    @PostMapping("/{tripId}/start")
    public Trip startTrip(@PathVariable Long tripId,
                           @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        return tripService.startTrip(tripId, jwtUtil.getRole(authorization));
    }

    @PostMapping("/{tripId}/complete")
    public Trip completeTrip(@PathVariable Long tripId,
                              @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        return tripService.completeTrip(tripId, jwtUtil.getRole(authorization));
    }

    @PostMapping("/{tripId}/cancel")
    public Trip cancelTrip(@PathVariable Long tripId) {
        return tripService.cancelTrip(tripId);
    }
}
