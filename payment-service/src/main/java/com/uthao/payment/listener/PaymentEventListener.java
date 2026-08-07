package com.uthao.payment.listener;

import com.uthao.payment.config.RabbitMQConfig;
import com.uthao.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class PaymentEventListener {

    private final PaymentService paymentService;

    @RabbitListener(queues = RabbitMQConfig.TRIP_COMPLETED_QUEUE)
    public void onTripCompleted(Map<String, Object> event) {
        System.out.println("payment-service received trip.completed: " + event);
        paymentService.processPayment(event);
    }
}
