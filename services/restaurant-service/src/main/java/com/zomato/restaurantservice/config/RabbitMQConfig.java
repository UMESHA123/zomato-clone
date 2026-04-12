package com.zomato.restaurantservice.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String RESTAURANT_EXCHANGE = "restaurant.exchange";
    public static final String RESTAURANT_CREATED_QUEUE = "restaurant.created";
    public static final String RESTAURANT_UPDATED_QUEUE = "restaurant.updated";
    public static final String MENU_UPDATED_QUEUE = "menu.updated";

    @Bean
    public TopicExchange restaurantExchange() {
        return new TopicExchange(RESTAURANT_EXCHANGE);
    }

    @Bean
    public Queue restaurantCreatedQueue() {
        return QueueBuilder.durable(RESTAURANT_CREATED_QUEUE).build();
    }

    @Bean
    public Queue restaurantUpdatedQueue() {
        return QueueBuilder.durable(RESTAURANT_UPDATED_QUEUE).build();
    }

    @Bean
    public Queue menuUpdatedQueue() {
        return QueueBuilder.durable(MENU_UPDATED_QUEUE).build();
    }

    @Bean
    public Binding restaurantCreatedBinding(Queue restaurantCreatedQueue, TopicExchange restaurantExchange) {
        return BindingBuilder.bind(restaurantCreatedQueue).to(restaurantExchange).with(RESTAURANT_CREATED_QUEUE);
    }

    @Bean
    public Binding restaurantUpdatedBinding(Queue restaurantUpdatedQueue, TopicExchange restaurantExchange) {
        return BindingBuilder.bind(restaurantUpdatedQueue).to(restaurantExchange).with(RESTAURANT_UPDATED_QUEUE);
    }

    @Bean
    public Binding menuUpdatedBinding(Queue menuUpdatedQueue, TopicExchange restaurantExchange) {
        return BindingBuilder.bind(menuUpdatedQueue).to(restaurantExchange).with(MENU_UPDATED_QUEUE);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
