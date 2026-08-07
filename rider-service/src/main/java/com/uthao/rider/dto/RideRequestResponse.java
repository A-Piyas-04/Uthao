package com.uthao.rider.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RideRequestResponse {

    private Long id;
    private Long riderId;
    private String status;
    private LocalDateTime createdAt;
}
