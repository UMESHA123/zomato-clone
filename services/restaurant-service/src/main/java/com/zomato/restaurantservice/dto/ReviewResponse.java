package com.zomato.restaurantservice.dto;

import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewResponse {

    private Long id;
    private Long restaurantId;
    private Long userId;
    private Integer rating;
    private String comment;
    private LocalDateTime createdAt;
}
