package com.uthao.trip.listener;

import com.uthao.trip.config.RabbitMQConfig;
import com.uthao.trip.service.TripService;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class TripEventListener {

    private final TripService tripService;

    @RabbitListener(queues = RabbitMQConfig.DRIVER_ASSIGNED_QUEUE)
    public void onDriverAssigned(Map<String, Object> event) {
        System.out.println("trip-service received driver.assigned: " + event);
        tripService.createTrip(event);
    }
}
