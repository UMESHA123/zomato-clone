package com.zomato.restaurantservice.controller;

import com.zomato.restaurantservice.dto.*;
import com.zomato.restaurantservice.model.CuisineType;
import com.zomato.restaurantservice.service.MenuItemService;
import com.zomato.restaurantservice.service.RestaurantService;
import com.zomato.restaurantservice.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/restaurants")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RestaurantController {

    private final RestaurantService restaurantService;
    private final MenuItemService menuItemService;
    private final ReviewService reviewService;

    // --- Restaurant endpoints ---

    @GetMapping
    public Page<RestaurantResponse> getAllRestaurants(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) CuisineType cuisineType) {

        PageRequest pageable = PageRequest.of(page, size);

        if (search != null && !search.isBlank()) {
            return restaurantService.searchRestaurants(search, pageable);
        }
        if (cuisineType != null) {
            return restaurantService.getByCuisine(cuisineType, pageable);
        }
        return restaurantService.getAllRestaurants(pageable);
    }

    @GetMapping("/{id}")
    public RestaurantResponse getRestaurant(@PathVariable Long id) {
        return restaurantService.getRestaurant(id);
    }

    @PostMapping
    public ResponseEntity<RestaurantResponse> createRestaurant(
            @Valid @RequestBody CreateRestaurantRequest request) {
        RestaurantResponse response = restaurantService.createRestaurant(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public RestaurantResponse updateRestaurant(
            @PathVariable Long id,
            @RequestBody UpdateRestaurantRequest request) {
        return restaurantService.updateRestaurant(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRestaurant(@PathVariable Long id) {
        restaurantService.deleteRestaurant(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/toggle")
    public RestaurantResponse toggleActive(@PathVariable Long id) {
        return restaurantService.toggleActive(id);
    }

    @GetMapping("/owner/{ownerId}")
    public List<RestaurantResponse> getByOwner(@PathVariable Long ownerId) {
        return restaurantService.getRestaurantsByOwner(ownerId);
    }

    // --- Menu Item endpoints ---

    @GetMapping("/{id}/menu")
    public List<MenuItemResponse> getMenu(
            @PathVariable Long id,
            @RequestParam(required = false) Boolean available) {
        if (Boolean.TRUE.equals(available)) {
            return menuItemService.getAvailableMenuItems(id);
        }
        return menuItemService.getMenuItems(id);
    }

    @PostMapping("/{id}/menu")
    public ResponseEntity<MenuItemResponse> addMenuItem(
            @PathVariable Long id,
            @Valid @RequestBody CreateMenuItemRequest request) {
        MenuItemResponse response = menuItemService.addMenuItem(id, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}/menu/{itemId}")
    public MenuItemResponse updateMenuItem(
            @PathVariable Long id,
            @PathVariable Long itemId,
            @RequestBody UpdateMenuItemRequest request) {
        return menuItemService.updateMenuItem(id, itemId, request);
    }

    @DeleteMapping("/{id}/menu/{itemId}")
    public ResponseEntity<Void> deleteMenuItem(
            @PathVariable Long id,
            @PathVariable Long itemId) {
        menuItemService.deleteMenuItem(id, itemId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/menu/{itemId}/toggle")
    public MenuItemResponse toggleMenuItemAvailability(
            @PathVariable Long id,
            @PathVariable Long itemId) {
        return menuItemService.toggleAvailability(id, itemId);
    }

    // --- Review endpoints ---

    @GetMapping("/{id}/reviews")
    public List<ReviewResponse> getReviews(@PathVariable Long id) {
        return reviewService.getReviews(id);
    }

    @PostMapping("/{id}/reviews")
    public ResponseEntity<ReviewResponse> addReview(
            @PathVariable Long id,
            @Valid @RequestBody CreateReviewRequest request) {
        ReviewResponse response = reviewService.addReview(id, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
