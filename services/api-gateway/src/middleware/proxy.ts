import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { config } from '../config/index.js';
import type { Express } from 'express';

export function setupProxies(app: Express): void {
  const proxyRoutes = [
    { path: '/api/users', target: config.services.userService },
    { path: '/api/restaurants', target: config.services.restaurantService },
    { path: '/api/orders', target: config.services.orderService },
    { path: '/api/delivery', target: config.services.deliveryService },
    { path: '/api/payments', target: config.services.paymentService },
    { path: '/api/notifications', target: config.services.notificationService },
    { path: '/api/chat', target: config.services.chatService },
  ];

  proxyRoutes.forEach(({ path, target }) => {
    app.use(
      createProxyMiddleware({
        target,
        changeOrigin: true,
        pathFilter: path,
        timeout: 30000,
        on: {
          proxyReq: fixRequestBody,
          error: (err, req, res) => {
            console.error(`Proxy error for ${path}:`, err.message);
            if ('status' in res && typeof res.status === 'function') {
              (res as any).status(502).json({
                error: 'Service unavailable',
                service: path,
              });
            }
          },
        },
      })
    );
  });
}
