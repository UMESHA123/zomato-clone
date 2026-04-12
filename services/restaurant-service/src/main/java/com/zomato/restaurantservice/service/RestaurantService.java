package com.zomato.restaurantservice.service;

import com.zomato.restaurantservice.dto.*;
import com.zomato.restaurantservice.exception.ResourceNotFoundException;
import com.zomato.restaurantservice.model.CuisineType;
import com.zomato.restaurantservice.model.Restaurant;
import com.zomato.restaurantservice.repository.RestaurantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RestaurantService {

    private final RestaurantRepository restaurantRepository;
    private final RabbitTemplate rabbitTemplate;

    public RestaurantResponse createRestaurant(CreateRestaurantRequest request) {
        Restaurant restaurant = Restaurant.builder()
                .name(request.getName())
                .description(request.getDescription())
                .address(request.getAddress())
                .phone(request.getPhone())
                .email(request.getEmail())
                .cuisineType(request.getCuisineType())
                .imageUrl(request.getImageUrl())
                .openingTime(request.getOpeningTime())
                .closingTime(request.getClosingTime())
                .ownerId(request.getOwnerId())
                .build();

        Restaurant saved = restaurantRepository.save(restaurant);

        rabbitTemplate.convertAndSend("restaurant.exchange", "restaurant.created",
                Map.of("restaurantId", saved.getId(), "name", saved.getName()));

        return mapToResponse(saved);
    }

    public RestaurantResponse getRestaurant(Long id) {
        Restaurant restaurant = restaurantRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.restaurant(id));
        return mapToResponse(restaurant);
    }

    public Page<RestaurantResponse> getAllRestaurants(Pageable pageable) {
        return restaurantRepository.findByIsActiveTrue(pageable)
                .map(this::mapToResponse);
    }

    public Page<RestaurantResponse> searchRestaurants(String query, Pageable pageable) {
        return restaurantRepository.searchByNameOrDescription(query, pageable)
                .map(this::mapToResponse);
    }

    public Page<RestaurantResponse> getByCuisine(CuisineType cuisineType, Pageable pageable) {
        return restaurantRepository.findByCuisineTypeAndIsActiveTrue(cuisineType, pageable)
                .map(this::mapToResponse);
    }

    public List<RestaurantResponse> getRestaurantsByOwner(Long ownerId) {
        return restaurantRepository.findByOwnerId(ownerId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public RestaurantResponse updateRestaurant(Long id, UpdateRestaurantRequest request) {
        Restaurant restaurant = restaurantRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.restaurant(id));

        if (request.getName() != null) restaurant.setName(request.getName());
        if (request.getDescription() != null) restaurant.setDescription(request.getDescription());
        if (request.getAddress() != null) restaurant.setAddress(request.getAddress());
        if (request.getPhone() != null) restaurant.setPhone(request.getPhone());
        if (request.getEmail() != null) restaurant.setEmail(request.getEmail());
        if (request.getCuisineType() != null) restaurant.setCuisineType(request.getCuisineType());
        if (request.getImageUrl() != null) restaurant.setImageUrl(request.getImageUrl());
        if (request.getOpeningTime() != null) restaurant.setOpeningTime(request.getOpeningTime());
        if (request.getClosingTime() != null) restaurant.setClosingTime(request.getClosingTime());
        if (request.getOwnerId() != null) restaurant.setOwnerId(request.getOwnerId());

        Restaurant saved = restaurantRepository.save(restaurant);

        rabbitTemplate.convertAndSend("restaurant.exchange", "restaurant.updated",
                Map.of("restaurantId", saved.getId(), "name", saved.getName()));

        return mapToResponse(saved);
    }

    public void deleteRestaurant(Long id) {
        Restaurant restaurant = restaurantRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.restaurant(id));

        restaurantRepository.delete(restaurant);

        rabbitTemplate.convertAndSend("restaurant.exchange", "restaurant.updated",
                Map.of("restaurantId", id, "action", "deleted"));
    }

    public RestaurantResponse toggleActive(Long id) {
        Restaurant restaurant = restaurantRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.restaurant(id));

        restaurant.setIsActive(!restaurant.getIsActive());
        Restaurant saved = restaurantRepository.save(restaurant);

        return mapToResponse(saved);
    }

    private RestaurantResponse mapToResponse(Restaurant restaurant) {
        int menuItemCount = (restaurant.getMenuItems() != null) ? restaurant.getMenuItems().size() : 0;

        return RestaurantResponse.builder()
                .id(restaurant.getId())
                .name(restaurant.getName())
                .description(restaurant.getDescription())
                .address(restaurant.getAddress())
                .phone(restaurant.getPhone())
                .email(restaurant.getEmail())
                .cuisineType(restaurant.getCuisineType())
                .rating(restaurant.getRating())
                .imageUrl(restaurant.getImageUrl())
                .isActive(restaurant.getIsActive())
                .openingTime(restaurant.getOpeningTime())
                .closingTime(restaurant.getClosingTime())
                .ownerId(restaurant.getOwnerId())
                .createdAt(restaurant.getCreatedAt())
                .updatedAt(restaurant.getUpdatedAt())
                .menuItemCount(menuItemCount)
                .build();
    }
}
