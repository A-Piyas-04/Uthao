package com.uthao.matching.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "match_history")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long rideRequestId;

    private Long riderId;

    private Long driverId;

    private LocalDateTime matchedAt;

    @PrePersist
    public void prePersist() {
        if (matchedAt == null) {
            matchedAt = LocalDateTime.now();
        }
    }
}
