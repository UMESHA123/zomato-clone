package com.zomato.restaurantservice.service;

import com.zomato.restaurantservice.dto.*;
import com.zomato.restaurantservice.exception.ResourceNotFoundException;
import com.zomato.restaurantservice.model.MenuItem;
import com.zomato.restaurantservice.model.Restaurant;
import com.zomato.restaurantservice.repository.MenuItemRepository;
import com.zomato.restaurantservice.repository.RestaurantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MenuItemService {

    private final MenuItemRepository menuItemRepository;
    private final RestaurantRepository restaurantRepository;
    private final RabbitTemplate rabbitTemplate;

    public MenuItemResponse addMenuItem(Long restaurantId, CreateMenuItemRequest request) {
        Restaurant restaurant = restaurantRepository.findById(restaurantId)
                .orElseThrow(() -> ResourceNotFoundException.restaurant(restaurantId));

        MenuItem menuItem = MenuItem.builder()
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .category(request.getCategory())
                .imageUrl(request.getImageUrl())
                .restaurant(restaurant)
                .build();

        MenuItem saved = menuItemRepository.save(menuItem);

        rabbitTemplate.convertAndSend("restaurant.exchange", "menu.updated",
                Map.of("restaurantId", restaurantId, "menuItemId", saved.getId(), "action", "added"));

        return mapToResponse(saved);
    }

    public List<MenuItemResponse> getMenuItems(Long restaurantId) {
        return menuItemRepository.findByRestaurantId(restaurantId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<MenuItemResponse> getAvailableMenuItems(Long restaurantId) {
        return menuItemRepository.findByRestaurantIdAndIsAvailableTrue(restaurantId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public MenuItemResponse updateMenuItem(Long restaurantId, Long itemId, UpdateMenuItemRequest request) {
        MenuItem menuItem = menuItemRepository.findByIdAndRestaurantId(itemId, restaurantId)
                .orElseThrow(() -> ResourceNotFoundException.menuItem(itemId));

        if (request.getName() != null) menuItem.setName(request.getName());
        if (request.getDescription() != null) menuItem.setDescription(request.getDescription());
        if (request.getPrice() != null) menuItem.setPrice(request.getPrice());
        if (request.getCategory() != null) menuItem.setCategory(request.getCategory());
        if (request.getImageUrl() != null) menuItem.setImageUrl(request.getImageUrl());

        MenuItem saved = menuItemRepository.save(menuItem);

        return mapToResponse(saved);
    }

    public void deleteMenuItem(Long restaurantId, Long itemId) {
        MenuItem menuItem = menuItemRepository.findByIdAndRestaurantId(itemId, restaurantId)
                .orElseThrow(() -> ResourceNotFoundException.menuItem(itemId));

        menuItemRepository.delete(menuItem);
    }

    public MenuItemResponse toggleAvailability(Long restaurantId, Long itemId) {
        MenuItem menuItem = menuItemRepository.findByIdAndRestaurantId(itemId, restaurantId)
                .orElseThrow(() -> ResourceNotFoundException.menuItem(itemId));

        menuItem.setIsAvailable(!menuItem.getIsAvailable());
        MenuItem saved = menuItemRepository.save(menuItem);

        return mapToResponse(saved);
    }

    private MenuItemResponse mapToResponse(MenuItem item) {
        return MenuItemResponse.builder()
                .id(item.getId())
                .name(item.getName())
                .description(item.getDescription())
                .price(item.getPrice())
                .category(item.getCategory())
                .imageUrl(item.getImageUrl())
                .isAvailable(item.getIsAvailable())
                .restaurantId(item.getRestaurant().getId())
                .restaurantName(item.getRestaurant().getName())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }
}
