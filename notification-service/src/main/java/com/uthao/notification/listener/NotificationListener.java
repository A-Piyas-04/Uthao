package com.uthao.notification.listener;

import com.uthao.notification.config.RabbitMQConfig;
import com.uthao.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class NotificationListener {

    private final NotificationService notificationService;

    @RabbitListener(queues = RabbitMQConfig.DRIVER_ASSIGNED_QUEUE)
    public void onDriverAssigned(Map<String, Object> event) {
        System.out.println("notification-service received driver.assigned: " + event);
        Long riderId = toLong(event.get("riderId"));
        Long driverId = toLong(event.get("driverId"));
        String message = "Your driver has been assigned";
        notificationService.save(riderId, message, "RIDE_MATCHED");
        notificationService.save(driverId, message, "RIDE_MATCHED");
    }

    @RabbitListener(queues = RabbitMQConfig.TRIP_COMPLETED_QUEUE)
    public void onTripCompleted(Map<String, Object> event) {
        System.out.println("notification-service received trip.completed: " + event);
        Long riderId = toLong(event.get("riderId"));
        notificationService.save(riderId, "Your trip is complete", "TRIP_COMPLETED");
    }

    @RabbitListener(queues = RabbitMQConfig.PAYMENT_COMPLETED_QUEUE)
    public void onPaymentCompleted(Map<String, Object> event) {
        System.out.println("notification-service received payment.completed: " + event);
        Long riderId = toLong(event.get("riderId"));
        Object amount = event.get("amount");
        String message = "Payment of BDT " + amount + " was successful";
        notificationService.save(riderId, message, "PAYMENT_SUCCESS");
    }

    @RabbitListener(queues = RabbitMQConfig.TRIP_CANCELLED_QUEUE)
    public void onTripCancelled(Map<String, Object> event) {
        System.out.println("notification-service received trip.cancelled: " + event);
        Long riderId = toLong(event.get("riderId"));
        notificationService.save(riderId, "Your trip has been cancelled", "CANCELLED");
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
}
