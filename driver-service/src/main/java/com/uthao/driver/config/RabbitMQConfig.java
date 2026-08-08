package com.uthao.driver.config;

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
    public static final String DRIVER_ASSIGNED_QUEUE = "driver.trips.driver-assigned.queue";

    @Bean
    public TopicExchange uthaoEventsExchange() {
        return new TopicExchange(EXCHANGE);
    }

    @Bean
    public Queue driverAssignedQueue() {
        return new Queue(DRIVER_ASSIGNED_QUEUE, true);
    }

    @Bean
    public Binding driverAssignedBinding(Queue driverAssignedQueue, TopicExchange uthaoEventsExchange) {
        return BindingBuilder.bind(driverAssignedQueue).to(uthaoEventsExchange).with("driver.assigned");
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
