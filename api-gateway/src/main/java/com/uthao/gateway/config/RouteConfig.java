package com.uthao.gateway.config;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RouteConfig {

    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
                .route("identity-service", r -> r.path("/api/auth/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("lb://identity-service"))
                .route("rider-service", r -> r.path("/api/riders/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("lb://rider-service"))
                .route("driver-service", r -> r.path("/api/drivers/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("lb://driver-service"))
                .route("matching-service", r -> r.path("/api/matching/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("lb://matching-service"))
                .route("trip-service", r -> r.path("/api/trips/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("lb://trip-service"))
                .route("payment-service", r -> r.path("/api/payments/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("lb://payment-service"))
                .route("notification-service", r -> r.path("/api/notifications/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("lb://notification-service"))
                .build();
    }
}
