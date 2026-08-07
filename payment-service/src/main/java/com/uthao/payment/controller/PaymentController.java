package com.uthao.payment.controller;

import com.uthao.payment.dto.RefundRequest;
import com.uthao.payment.model.Payment;
import com.uthao.payment.model.Refund;
import com.uthao.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @GetMapping("/trip/{tripId}")
    public Payment getPayment(@PathVariable Long tripId) {
        return paymentService.getPayment(tripId);
    }

    @PostMapping("/{paymentId}/refund")
    public Refund requestRefund(@PathVariable Long paymentId, @RequestBody RefundRequest request) {
        return paymentService.requestRefund(paymentId, request.getReason());
    }
}
