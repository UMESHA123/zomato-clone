package com.zomato.restaurantservice.dto;

import com.zomato.restaurantservice.model.CuisineType;
import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RestaurantResponse {

    private Long id;
    private String name;
    private String description;
    private String address;
    private String phone;
    private String email;
    private CuisineType cuisineType;
    private Double rating;
    private String imageUrl;
    private Boolean isActive;
    private String openingTime;
    private String closingTime;
    private Long ownerId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Integer menuItemCount;
}
