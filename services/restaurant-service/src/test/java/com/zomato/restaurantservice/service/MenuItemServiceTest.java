package com.zomato.restaurantservice.service;

import com.zomato.restaurantservice.dto.CreateMenuItemRequest;
import com.zomato.restaurantservice.dto.MenuItemResponse;
import com.zomato.restaurantservice.dto.UpdateMenuItemRequest;
import com.zomato.restaurantservice.exception.ResourceNotFoundException;
import com.zomato.restaurantservice.model.MenuCategory;
import com.zomato.restaurantservice.model.MenuItem;
import com.zomato.restaurantservice.model.Restaurant;
import com.zomato.restaurantservice.repository.MenuItemRepository;
import com.zomato.restaurantservice.repository.RestaurantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MenuItemServiceTest {

    @Mock
    private MenuItemRepository menuItemRepository;

    @Mock
    private RestaurantRepository restaurantRepository;

    @Mock
    private RabbitTemplate rabbitTemplate;

    @InjectMocks
    private MenuItemService menuItemService;

    private Restaurant restaurant;
    private MenuItem menuItem;

    @BeforeEach
    void setUp() {
        restaurant = Restaurant.builder()
                .id(1L)
                .name("Pizza Place")
                .build();

        menuItem = MenuItem.builder()
                .id(10L)
                .name("Margherita")
                .description("Classic")
                .price(new BigDecimal("9.99"))
                .category(MenuCategory.MAIN_COURSE)
                .isAvailable(true)
                .restaurant(restaurant)
                .build();
    }

    @Test
    void addMenuItem_savesAndPublishesEvent() {
        CreateMenuItemRequest request = CreateMenuItemRequest.builder()
                .name("Margherita")
                .price(new BigDecimal("9.99"))
                .category(MenuCategory.MAIN_COURSE)
                .build();

        when(restaurantRepository.findById(1L)).thenReturn(Optional.of(restaurant));
        when(menuItemRepository.save(any(MenuItem.class))).thenReturn(menuItem);

        MenuItemResponse response = menuItemService.addMenuItem(1L, request);

        assertThat(response.getId()).isEqualTo(10L);
        assertThat(response.getName()).isEqualTo("Margherita");
        assertThat(response.getRestaurantId()).isEqualTo(1L);
        verify(rabbitTemplate).convertAndSend(eq("restaurant.exchange"), eq("menu.updated"), any(Object.class));
    }

    @Test
    void addMenuItem_throwsWhenRestaurantMissing() {
        when(restaurantRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> menuItemService.addMenuItem(99L, new CreateMenuItemRequest()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }

    @Test
    void updateMenuItem_patchesAllowedFields() {
        UpdateMenuItemRequest request = UpdateMenuItemRequest.builder()
                .name("Margherita Deluxe")
                .price(new BigDecimal("12.49"))
                .build();

        when(menuItemRepository.findByIdAndRestaurantId(10L, 1L)).thenReturn(Optional.of(menuItem));
        when(menuItemRepository.save(any(MenuItem.class))).thenAnswer(inv -> inv.getArgument(0));

        MenuItemResponse response = menuItemService.updateMenuItem(1L, 10L, request);

        assertThat(response.getName()).isEqualTo("Margherita Deluxe");
        assertThat(response.getPrice()).isEqualByComparingTo("12.49");
        // Unchanged
        assertThat(response.getCategory()).isEqualTo(MenuCategory.MAIN_COURSE);
    }

    @Test
    void updateMenuItem_throwsWhenMissing() {
        when(menuItemRepository.findByIdAndRestaurantId(10L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> menuItemService.updateMenuItem(1L, 10L, new UpdateMenuItemRequest()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("10");
    }

    @Test
    void deleteMenuItem_deletes() {
        when(menuItemRepository.findByIdAndRestaurantId(10L, 1L)).thenReturn(Optional.of(menuItem));

        menuItemService.deleteMenuItem(1L, 10L);

        verify(menuItemRepository).delete(menuItem);
    }

    @Test
    void toggleAvailability_flipsFlag() {
        when(menuItemRepository.findByIdAndRestaurantId(10L, 1L)).thenReturn(Optional.of(menuItem));
        when(menuItemRepository.save(any(MenuItem.class))).thenAnswer(inv -> inv.getArgument(0));

        MenuItemResponse response = menuItemService.toggleAvailability(1L, 10L);

        assertThat(response.getIsAvailable()).isFalse();
    }
}
