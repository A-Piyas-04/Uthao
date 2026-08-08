package com.uthao.driver.listener;

import com.uthao.driver.config.RabbitMQConfig;
import com.uthao.driver.service.DriverService;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class DriverAssignedListener {

    private final DriverService driverService;

    @RabbitListener(queues = RabbitMQConfig.DRIVER_ASSIGNED_QUEUE)
    public void onDriverAssigned(Map<String, Object> event) {
        System.out.println("driver-service received driver.assigned: " + event);
        driverService.recordTripAssignment(event);
    }
}
