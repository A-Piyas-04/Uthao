package com.uthao.matching.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NearbyDriverDto {

    private Long driverId;
    private String name;
    private String vehiclePlate;
    private Double currentLat;
    private Double currentLng;
    private Double distanceKm;
}
