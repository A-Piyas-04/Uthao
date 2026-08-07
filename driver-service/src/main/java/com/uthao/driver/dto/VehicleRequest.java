package com.uthao.driver.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VehicleRequest {

    @NotBlank
    private String make;

    @NotBlank
    private String model;

    @NotBlank
    private String plateNumber;

    @NotBlank
    private String color;
}
