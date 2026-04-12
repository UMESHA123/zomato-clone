package com.zomato.restaurantservice.dto;

import com.zomato.restaurantservice.model.CuisineType;
import jakarta.validation.constraints.*;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateRestaurantRequest {

    @NotBlank(message = "Name is required")
    private String name;

    private String description;

    @NotBlank(message = "Address is required")
    private String address;

    private String phone;

    @Email(message = "Invalid email")
    private String email;

    private CuisineType cuisineType;

    private String imageUrl;

    private String openingTime;

    private String closingTime;

    private Long ownerId;
}
