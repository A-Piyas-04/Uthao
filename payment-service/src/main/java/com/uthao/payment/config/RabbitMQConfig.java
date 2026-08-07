package com.uthao.payment.config;

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
    public static final String TRIP_COMPLETED_QUEUE = "payment.trip-completed.queue";

    @Bean
    public TopicExchange uthaoEventsExchange() {
        return new TopicExchange(EXCHANGE);
    }

    @Bean
    public Queue tripCompletedQueue() {
        return new Queue(TRIP_COMPLETED_QUEUE, true);
    }

    @Bean
    public Binding tripCompletedBinding(Queue tripCompletedQueue, TopicExchange uthaoEventsExchange) {
        return BindingBuilder.bind(tripCompletedQueue).to(uthaoEventsExchange).with("trip.completed");
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
