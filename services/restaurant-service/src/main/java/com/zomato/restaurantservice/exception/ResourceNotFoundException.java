package com.zomato.restaurantservice.exception;

public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }

    public static ResourceNotFoundException restaurant(Long id) {
        return new ResourceNotFoundException("Restaurant not found with id: " + id);
    }

    public static ResourceNotFoundException menuItem(Long id) {
        return new ResourceNotFoundException("Menu item not found with id: " + id);
    }

    public static ResourceNotFoundException review(Long id) {
        return new ResourceNotFoundException("Review not found with id: " + id);
    }
}
