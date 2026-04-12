package com.zomato.restaurantservice.service;

import com.zomato.restaurantservice.dto.CreateRestaurantRequest;
import com.zomato.restaurantservice.dto.RestaurantResponse;
import com.zomato.restaurantservice.dto.UpdateRestaurantRequest;
import com.zomato.restaurantservice.exception.ResourceNotFoundException;
import com.zomato.restaurantservice.model.CuisineType;
import com.zomato.restaurantservice.model.Restaurant;
import com.zomato.restaurantservice.repository.RestaurantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RestaurantServiceTest {

    @Mock
    private RestaurantRepository restaurantRepository;

    @Mock
    private RabbitTemplate rabbitTemplate;

    @InjectMocks
    private RestaurantService restaurantService;

    private Restaurant sampleRestaurant;

    @BeforeEach
    void setUp() {
        sampleRestaurant = Restaurant.builder()
                .id(1L)
                .name("Pizza Place")
                .description("Great pizza")
                .address("123 Main St")
                .phone("555-0100")
                .email("pizza@example.com")
                .cuisineType(CuisineType.ITALIAN)
                .rating(0.0)
                .isActive(true)
                .ownerId(42L)
                .build();
    }

    @Test
    void createRestaurant_savesAndPublishesEvent() {
        CreateRestaurantRequest request = CreateRestaurantRequest.builder()
                .name("Pizza Place")
                .address("123 Main St")
                .cuisineType(CuisineType.ITALIAN)
                .ownerId(42L)
                .build();

        when(restaurantRepository.save(any(Restaurant.class))).thenReturn(sampleRestaurant);

        RestaurantResponse response = restaurantService.createRestaurant(request);

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getName()).isEqualTo("Pizza Place");
        verify(rabbitTemplate).convertAndSend(eq("restaurant.exchange"), eq("restaurant.created"), any(Object.class));
    }

    @Test
    void getRestaurant_returnsResponse() {
        when(restaurantRepository.findById(1L)).thenReturn(Optional.of(sampleRestaurant));

        RestaurantResponse response = restaurantService.getRestaurant(1L);

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getName()).isEqualTo("Pizza Place");
    }

    @Test
    void getRestaurant_throwsWhenMissing() {
        when(restaurantRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> restaurantService.getRestaurant(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }

    @Test
    void updateRestaurant_patchesFieldsAndPublishesEvent() {
        UpdateRestaurantRequest request = UpdateRestaurantRequest.builder()
                .name("New Name")
                .phone("555-9999")
                .build();

        when(restaurantRepository.findById(1L)).thenReturn(Optional.of(sampleRestaurant));
        when(restaurantRepository.save(any(Restaurant.class))).thenAnswer(inv -> inv.getArgument(0));

        RestaurantResponse response = restaurantService.updateRestaurant(1L, request);

        assertThat(response.getName()).isEqualTo("New Name");
        assertThat(response.getPhone()).isEqualTo("555-9999");
        // Unchanged fields are preserved
        assertThat(response.getAddress()).isEqualTo("123 Main St");
        verify(rabbitTemplate).convertAndSend(eq("restaurant.exchange"), eq("restaurant.updated"), any(Object.class));
    }

    @Test
    void updateRestaurant_throwsWhenMissing() {
        when(restaurantRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> restaurantService.updateRestaurant(99L, new UpdateRestaurantRequest()))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(rabbitTemplate, never()).convertAndSend(anyString(), anyString(), any(Object.class));
    }

    @Test
    void deleteRestaurant_deletesAndPublishesEvent() {
        when(restaurantRepository.findById(1L)).thenReturn(Optional.of(sampleRestaurant));

        restaurantService.deleteRestaurant(1L);

        verify(restaurantRepository).delete(sampleRestaurant);
        verify(rabbitTemplate).convertAndSend(eq("restaurant.exchange"), eq("restaurant.updated"), any(Object.class));
    }

    @Test
    void toggleActive_flipsActiveFlag() {
        when(restaurantRepository.findById(1L)).thenReturn(Optional.of(sampleRestaurant));
        ArgumentCaptor<Restaurant> captor = ArgumentCaptor.forClass(Restaurant.class);
        when(restaurantRepository.save(captor.capture())).thenAnswer(inv -> inv.getArgument(0));

        RestaurantResponse response = restaurantService.toggleActive(1L);

        assertThat(response.getIsActive()).isFalse();
        assertThat(captor.getValue().getIsActive()).isFalse();
    }
}
