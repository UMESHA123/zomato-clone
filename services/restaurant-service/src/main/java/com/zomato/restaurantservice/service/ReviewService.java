package com.zomato.restaurantservice.service;

import com.zomato.restaurantservice.dto.CreateReviewRequest;
import com.zomato.restaurantservice.dto.ReviewResponse;
import com.zomato.restaurantservice.exception.ResourceNotFoundException;
import com.zomato.restaurantservice.model.Restaurant;
import com.zomato.restaurantservice.model.Review;
import com.zomato.restaurantservice.repository.RestaurantRepository;
import com.zomato.restaurantservice.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final RestaurantRepository restaurantRepository;

    @Transactional
    public ReviewResponse addReview(Long restaurantId, CreateReviewRequest request) {
        Restaurant restaurant = restaurantRepository.findById(restaurantId)
                .orElseThrow(() -> ResourceNotFoundException.restaurant(restaurantId));

        Review review = Review.builder()
                .userId(request.getUserId())
                .rating(request.getRating())
                .comment(request.getComment())
                .restaurant(restaurant)
                .build();

        Review saved = reviewRepository.save(review);

        // Recompute restaurant average rating
        Double avg = reviewRepository.findAverageRatingByRestaurantId(restaurantId);
        restaurant.setRating(avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0);
        restaurantRepository.save(restaurant);

        return mapToResponse(saved, restaurantId);
    }

    public List<ReviewResponse> getReviews(Long restaurantId) {
        if (!restaurantRepository.existsById(restaurantId)) {
            throw ResourceNotFoundException.restaurant(restaurantId);
        }
        return reviewRepository.findByRestaurantIdOrderByCreatedAtDesc(restaurantId).stream()
                .map(r -> mapToResponse(r, restaurantId))
                .collect(Collectors.toList());
    }

    private ReviewResponse mapToResponse(Review review, Long restaurantId) {
        return ReviewResponse.builder()
                .id(review.getId())
                .restaurantId(restaurantId)
                .userId(review.getUserId())
                .rating(review.getRating())
                .comment(review.getComment())
                .createdAt(review.getCreatedAt())
                .build();
    }
}
