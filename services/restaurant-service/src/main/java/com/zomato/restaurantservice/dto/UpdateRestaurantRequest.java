package com.zomato.restaurantservice.dto;

import com.zomato.restaurantservice.model.CuisineType;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateRestaurantRequest {

    private String name;

    private String description;

    private String address;

    private String phone;

    private String email;

    private CuisineType cuisineType;

    private String imageUrl;

    private String openingTime;

    private String closingTime;

    private Long ownerId;
}
