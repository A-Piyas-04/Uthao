package com.uthao.matching.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchResultDto {

    private Long rideRequestId;
    private Long driverId;
    private String driverName;
    private String vehiclePlate;
    private String eta;
    private String status;
}
