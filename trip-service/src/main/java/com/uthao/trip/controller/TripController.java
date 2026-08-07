package com.uthao.trip.controller;

import com.uthao.trip.model.Trip;
import com.uthao.trip.service.TripService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/trips")
@RequiredArgsConstructor
public class TripController {

    private final TripService tripService;

    @GetMapping("/{tripId}")
    public Trip getTrip(@PathVariable Long tripId) {
        return tripService.getTrip(tripId);
    }

    @PostMapping("/{tripId}/start")
    public Trip startTrip(@PathVariable Long tripId) {
        return tripService.startTrip(tripId);
    }

    @PostMapping("/{tripId}/complete")
    public Trip completeTrip(@PathVariable Long tripId) {
        return tripService.completeTrip(tripId);
    }

    @PostMapping("/{tripId}/cancel")
    public Trip cancelTrip(@PathVariable Long tripId) {
        return tripService.cancelTrip(tripId);
    }
}
