import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

export const config = {
  port: process.env.API_GATEWAY_PORT || 8080,
  services: {
    userService: process.env.USER_SERVICE_URL || 'http://localhost:8081',
    restaurantService: process.env.RESTAURANT_SERVICE_URL || 'http://localhost:8082',
    orderService: process.env.ORDER_SERVICE_URL || 'http://localhost:8083',
    deliveryService: process.env.DELIVERY_SERVICE_URL || 'http://localhost:8084',
    paymentService: process.env.PAYMENT_SERVICE_URL || 'http://localhost:8085',
    notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:8086',
    chatService: process.env.CHAT_SERVICE_URL || 'http://localhost:8087',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || 'zomato_secret',
  },
};
