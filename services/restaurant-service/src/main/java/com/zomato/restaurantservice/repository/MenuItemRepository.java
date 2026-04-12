package com.zomato.restaurantservice.repository;

import com.zomato.restaurantservice.model.MenuCategory;
import com.zomato.restaurantservice.model.MenuItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {

    List<MenuItem> findByRestaurantId(Long restaurantId);

    List<MenuItem> findByRestaurantIdAndIsAvailableTrue(Long restaurantId);

    List<MenuItem> findByRestaurantIdAndCategory(Long restaurantId, MenuCategory category);

    Optional<MenuItem> findByIdAndRestaurantId(Long id, Long restaurantId);
}
