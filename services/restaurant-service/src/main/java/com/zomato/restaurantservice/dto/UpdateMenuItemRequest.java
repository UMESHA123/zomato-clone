package com.zomato.restaurantservice.dto;

import com.zomato.restaurantservice.model.MenuCategory;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateMenuItemRequest {

    private String name;

    private String description;

    private BigDecimal price;

    private MenuCategory category;

    private String imageUrl;
}
