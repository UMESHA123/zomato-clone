package com.zomato.restaurantservice.service;

import com.zomato.restaurantservice.dto.CreateReviewRequest;
import com.zomato.restaurantservice.dto.ReviewResponse;
import com.zomato.restaurantservice.exception.ResourceNotFoundException;
import com.zomato.restaurantservice.model.Restaurant;
import com.zomato.restaurantservice.model.Review;
import com.zomato.restaurantservice.repository.RestaurantRepository;
import com.zomato.restaurantservice.repository.ReviewRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReviewServiceTest {

    @Mock
    private ReviewRepository reviewRepository;

    @Mock
    private RestaurantRepository restaurantRepository;

    @InjectMocks
    private ReviewService reviewService;

    private Restaurant restaurant;

    @BeforeEach
    void setUp() {
        restaurant = Restaurant.builder()
                .id(1L)
                .name("Pizza Place")
                .rating(0.0)
                .build();
    }

    @Test
    void addReview_savesReviewAndRecomputesRating() {
        CreateReviewRequest request = CreateReviewRequest.builder()
                .userId(42L)
                .rating(5)
                .comment("Delicious")
                .build();

        Review savedReview = Review.builder()
                .id(100L)
                .userId(42L)
                .rating(5)
                .comment("Delicious")
                .restaurant(restaurant)
                .build();

        when(restaurantRepository.findById(1L)).thenReturn(Optional.of(restaurant));
        when(reviewRepository.save(any(Review.class))).thenReturn(savedReview);
        when(reviewRepository.findAverageRatingByRestaurantId(1L)).thenReturn(4.55);

        ArgumentCaptor<Restaurant> restaurantCaptor = ArgumentCaptor.forClass(Restaurant.class);
        when(restaurantRepository.save(restaurantCaptor.capture())).thenAnswer(inv -> inv.getArgument(0));

        ReviewResponse response = reviewService.addReview(1L, request);

        assertThat(response.getId()).isEqualTo(100L);
        assertThat(response.getRestaurantId()).isEqualTo(1L);
        assertThat(response.getRating()).isEqualTo(5);
        // Rating is rounded to one decimal place
        assertThat(restaurantCaptor.getValue().getRating()).isEqualTo(4.6);
    }

    @Test
    void addReview_nullAverageBecomesZero() {
        CreateReviewRequest request = CreateReviewRequest.builder()
                .userId(42L)
                .rating(4)
                .build();

        when(restaurantRepository.findById(1L)).thenReturn(Optional.of(restaurant));
        when(reviewRepository.save(any(Review.class))).thenAnswer(inv -> {
            Review r = inv.getArgument(0);
            r.setId(1L);
            return r;
        });
        when(reviewRepository.findAverageRatingByRestaurantId(1L)).thenReturn(null);

        ArgumentCaptor<Restaurant> captor = ArgumentCaptor.forClass(Restaurant.class);
        when(restaurantRepository.save(captor.capture())).thenAnswer(inv -> inv.getArgument(0));

        reviewService.addReview(1L, request);

        assertThat(captor.getValue().getRating()).isEqualTo(0.0);
    }

    @Test
    void addReview_throwsWhenRestaurantMissing() {
        when(restaurantRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> reviewService.addReview(99L, new CreateReviewRequest()))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(reviewRepository, never()).save(any());
    }

    @Test
    void getReviews_throwsWhenRestaurantMissing() {
        when(restaurantRepository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> reviewService.getReviews(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getReviews_returnsMappedList() {
        Review r1 = Review.builder().id(1L).userId(10L).rating(5).comment("Great").restaurant(restaurant).build();
        Review r2 = Review.builder().id(2L).userId(11L).rating(3).comment("OK").restaurant(restaurant).build();
        when(restaurantRepository.existsById(1L)).thenReturn(true);
        when(reviewRepository.findByRestaurantIdOrderByCreatedAtDesc(1L)).thenReturn(java.util.List.of(r1, r2));

        var result = reviewService.getReviews(1L);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getRating()).isEqualTo(5);
        assertThat(result.get(1).getRating()).isEqualTo(3);
    }
}
