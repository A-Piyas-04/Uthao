package com.uthao.driver.service;

import com.uthao.driver.dto.*;
import com.uthao.driver.model.Driver;
import com.uthao.driver.model.DriverStatus;
import com.uthao.driver.model.Vehicle;
import com.uthao.driver.repository.DriverRepository;
import com.uthao.driver.repository.DriverStatusRepository;
import com.uthao.driver.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DriverService {

    private final DriverRepository driverRepository;
    private final VehicleRepository vehicleRepository;
    private final DriverStatusRepository driverStatusRepository;

    public Driver registerDriver(DriverRegisterRequest request) {
        Driver driver = Driver.builder()
                .userId(request.getUserId())
                .name(request.getName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .licenseNumber(request.getLicenseNumber())
                .verificationStatus("PENDING")
                .build();
        return driverRepository.save(driver);
    }

    public Driver getDriver(Long id) {
        return driverRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Driver not found"));
    }

    public Vehicle addVehicle(Long driverId, VehicleRequest request) {
        getDriver(driverId);
        Vehicle vehicle = Vehicle.builder()
                .driverId(driverId)
                .make(request.getMake())
                .model(request.getModel())
                .plateNumber(request.getPlateNumber())
                .color(request.getColor())
                .build();
        return vehicleRepository.save(vehicle);
    }

    public DriverStatus updateStatus(Long driverId, DriverStatusUpdateDto dto) {
        getDriver(driverId);
        DriverStatus status = driverStatusRepository.findByDriverId(driverId)
                .orElse(DriverStatus.builder().driverId(driverId).build());
        status.setStatus(dto.getStatus().toUpperCase());
        status.setCurrentLat(dto.getCurrentLat());
        status.setCurrentLng(dto.getCurrentLng());
        return driverStatusRepository.save(status);
    }

    public List<NearbyDriverDto> getNearbyAvailableDrivers(Double lat, Double lng, Double radiusKm) {
        double radiusDegrees = radiusKm / 111.0;

        return driverStatusRepository.findByStatus("AVAILABLE").stream()
                .map(status -> {
                    double distanceDegrees = Math.sqrt(
                            Math.pow(status.getCurrentLat() - lat, 2)
                                    + Math.pow(status.getCurrentLng() - lng, 2)
                    );
                    double distanceKm = distanceDegrees * 111.0;
                    return new Object[]{status, distanceDegrees, distanceKm};
                })
                .filter(arr -> (double) arr[1] <= radiusDegrees)
                .sorted(Comparator.comparingDouble(arr -> (double) arr[2]))
                .map(arr -> {
                    DriverStatus status = (DriverStatus) arr[0];
                    double distanceKm = (double) arr[2];
                    Driver driver = getDriver(status.getDriverId());
                    String plate = vehicleRepository.findFirstByDriverId(status.getDriverId())
                            .map(Vehicle::getPlateNumber)
                            .orElse(null);
                    return NearbyDriverDto.builder()
                            .driverId(status.getDriverId())
                            .name(driver.getName())
                            .vehiclePlate(plate)
                            .currentLat(status.getCurrentLat())
                            .currentLng(status.getCurrentLng())
                            .distanceKm(distanceKm)
                            .build();
                })
                .collect(Collectors.toList());
    }
}
