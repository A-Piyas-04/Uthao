package com.uthao.driver.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DriverStatusUpdateDto {

    @NotBlank
    private String status;

    @NotNull
    private Double currentLat;

    @NotNull
    private Double currentLng;
}
