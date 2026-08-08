package com.uthao.driver.controller;

import com.uthao.driver.dto.*;
import com.uthao.driver.model.Driver;
import com.uthao.driver.model.DriverStatus;
import com.uthao.driver.model.DriverTrip;
import com.uthao.driver.model.Vehicle;
import com.uthao.driver.service.DriverService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/drivers")
@RequiredArgsConstructor
public class DriverController {

    private final DriverService driverService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Driver registerDriver(@Valid @RequestBody DriverRegisterRequest request) {
        return driverService.registerDriver(request);
    }

    @PostMapping("/{driverId}/vehicles")
    @ResponseStatus(HttpStatus.CREATED)
    public Vehicle addVehicle(@PathVariable Long driverId, @Valid @RequestBody VehicleRequest request) {
        return driverService.addVehicle(driverId, request);
    }

    @PatchMapping("/{driverId}/status")
    public DriverStatus updateStatus(@PathVariable Long driverId,
                                     @Valid @RequestBody DriverStatusUpdateDto dto) {
        return driverService.updateStatus(driverId, dto);
    }

    @GetMapping("/available")
    public List<NearbyDriverDto> getAvailable(
            @RequestParam Double lat,
            @RequestParam Double lng,
            @RequestParam(defaultValue = "5.0") Double radiusKm) {
        return driverService.getNearbyAvailableDrivers(lat, lng, radiusKm);
    }

    @GetMapping("/{driverId}")
    public Driver getDriver(@PathVariable Long driverId) {
        return driverService.getDriver(driverId);
    }

    @GetMapping("/{driverId}/trips")
    public List<DriverTrip> getDriverTrips(@PathVariable Long driverId) {
        return driverService.getDriverTrips(driverId);
    }
}
