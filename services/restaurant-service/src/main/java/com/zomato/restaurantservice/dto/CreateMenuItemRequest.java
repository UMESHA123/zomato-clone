package com.zomato.restaurantservice.dto;

import com.zomato.restaurantservice.model.MenuCategory;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateMenuItemRequest {

    @NotBlank
    private String name;

    private String description;

    @NotNull
    @DecimalMin("0.01")
    private BigDecimal price;

    private MenuCategory category;

    private String imageUrl;
}
