package com.uthao.payment.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "refunds")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Refund {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long paymentId;

    private String reason;

    private LocalDateTime refundedAt;

    @PrePersist
    public void prePersist() {
        if (refundedAt == null) {
            refundedAt = LocalDateTime.now();
        }
    }
}
