package com.uthao.notification.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.DefaultJackson2JavaTypeMapper;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE = "uthao.events";
    public static final String DRIVER_ASSIGNED_QUEUE = "driver.assigned.queue";
    public static final String TRIP_COMPLETED_QUEUE = "trip.completed.queue";
    public static final String PAYMENT_COMPLETED_QUEUE = "payment.completed.queue";
    public static final String TRIP_CANCELLED_QUEUE = "trip.cancelled.queue";

    @Bean
    public TopicExchange uthaoEventsExchange() {
        return new TopicExchange(EXCHANGE);
    }

    @Bean
    public Queue driverAssignedQueue() {
        return new Queue(DRIVER_ASSIGNED_QUEUE, true);
    }

    @Bean
    public Queue tripCompletedQueue() {
        return new Queue(TRIP_COMPLETED_QUEUE, true);
    }

    @Bean
    public Queue paymentCompletedQueue() {
        return new Queue(PAYMENT_COMPLETED_QUEUE, true);
    }

    @Bean
    public Queue tripCancelledQueue() {
        return new Queue(TRIP_CANCELLED_QUEUE, true);
    }

    @Bean
    public Binding driverAssignedBinding(Queue driverAssignedQueue, TopicExchange uthaoEventsExchange) {
        return BindingBuilder.bind(driverAssignedQueue).to(uthaoEventsExchange).with("driver.assigned");
    }

    @Bean
    public Binding tripCompletedBinding(Queue tripCompletedQueue, TopicExchange uthaoEventsExchange) {
        return BindingBuilder.bind(tripCompletedQueue).to(uthaoEventsExchange).with("trip.completed");
    }

    @Bean
    public Binding paymentCompletedBinding(Queue paymentCompletedQueue, TopicExchange uthaoEventsExchange) {
        return BindingBuilder.bind(paymentCompletedQueue).to(uthaoEventsExchange).with("payment.completed");
    }

    @Bean
    public Binding tripCancelledBinding(Queue tripCancelledQueue, TopicExchange uthaoEventsExchange) {
        return BindingBuilder.bind(tripCancelledQueue).to(uthaoEventsExchange).with("trip.cancelled");
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        Jackson2JsonMessageConverter converter = new Jackson2JsonMessageConverter();
        DefaultJackson2JavaTypeMapper typeMapper = new DefaultJackson2JavaTypeMapper();
        typeMapper.setTrustedPackages("*");
        converter.setJavaTypeMapper(typeMapper);
        return converter;
    }
}
