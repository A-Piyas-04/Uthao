package com.uthao.payment.service;

import com.uthao.payment.config.RabbitMQConfig;
import com.uthao.payment.model.Payment;
import com.uthao.payment.model.Refund;
import com.uthao.payment.repository.PaymentRepository;
import com.uthao.payment.repository.RefundRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private static final double BASE_FARE = 50.0;
    private static final double PER_KM = 15.0;

    private final PaymentRepository paymentRepository;
    private final RefundRepository refundRepository;
    private final RabbitTemplate rabbitTemplate;

    public Payment processPayment(Map<String, Object> event) {
        Long tripId = toLong(event.get("tripId"));
        Long riderId = toLong(event.get("riderId"));
        Double pickupLat = toDouble(event.get("pickupLat"));
        Double pickupLng = toDouble(event.get("pickupLng"));
        Double dropLat = toDouble(event.get("dropLat"));
        Double dropLng = toDouble(event.get("dropLng"));

        double amount = calculateFare(pickupLat, pickupLng, dropLat, dropLng);

        Payment payment = Payment.builder()
                .tripId(tripId)
                .riderId(riderId)
                .amount(amount)
                .status("SUCCESS")
                .build();
        payment = paymentRepository.save(payment);

        Map<String, Object> payload = new HashMap<>();
        payload.put("tripId", tripId);
        payload.put("riderId", riderId);
        payload.put("amount", amount);
        payload.put("status", "SUCCESS");

        rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, "payment.completed", payload);
        return payment;
    }

    public Refund requestRefund(Long paymentId, String reason) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));

        Refund refund = Refund.builder()
                .paymentId(paymentId)
                .reason(reason)
                .build();
        refund = refundRepository.save(refund);

        payment.setStatus("REFUNDED");
        paymentRepository.save(payment);
        return refund;
    }

    public Payment getPayment(Long tripId) {
        return paymentRepository.findByTripId(tripId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));
    }

    private double calculateFare(Double pickupLat, Double pickupLng, Double dropLat, Double dropLng) {
        if (pickupLat == null || pickupLng == null || dropLat == null || dropLng == null) {
            return BASE_FARE;
        }
        double distanceDegrees = Math.sqrt(
                Math.pow(dropLat - pickupLat, 2) + Math.pow(dropLng - pickupLng, 2)
        );
        double distanceKm = distanceDegrees * 111.0;
        return BASE_FARE + (PER_KM * distanceKm);
    }

    private Long toLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(value.toString());
    }

    private Double toDouble(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        return Double.parseDouble(value.toString());
    }
}
