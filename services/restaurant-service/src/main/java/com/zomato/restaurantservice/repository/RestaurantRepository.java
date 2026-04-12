package com.zomato.restaurantservice.repository;

import com.zomato.restaurantservice.model.CuisineType;
import com.zomato.restaurantservice.model.Restaurant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RestaurantRepository extends JpaRepository<Restaurant, Long> {

    List<Restaurant> findByIsActiveTrue();

    Page<Restaurant> findByIsActiveTrue(Pageable pageable);

    Page<Restaurant> findByCuisineTypeAndIsActiveTrue(CuisineType cuisineType, Pageable pageable);

    @Query("SELECT r FROM Restaurant r WHERE r.isActive = true AND (LOWER(r.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(r.description) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Restaurant> searchByNameOrDescription(@Param("query") String query, Pageable pageable);

    List<Restaurant> findByOwnerId(Long ownerId);
}
