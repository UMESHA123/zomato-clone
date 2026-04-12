import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from './config/index.js';
import { setupProxies } from './middleware/proxy.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { metricsMiddleware, register, websocketConnections } from './middleware/metrics.js';
import healthRouter from './routes/health.js';
import ordersRouter, { setBroadcast } from './routes/orders.js';

const app = express();
const server = createServer(app);

// WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(data: object) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// Wire broadcast into order routes
setBroadcast(broadcast);

wss.on('connection', (ws) => {
  websocketConnections.inc();
  console.log('WebSocket client connected');
  ws.on('close', () => {
    websocketConnections.dec();
    console.log('WebSocket client disconnected');
  });
});

// Prometheus metrics endpoint (before any auth)
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    process.env.FRONTEND_CUSTOMER_URL || '',
    process.env.FRONTEND_RESTAURANT_URL || '',
    process.env.FRONTEND_DRIVER_URL || '',
    process.env.FRONTEND_AGENT_URL || '',
  ].filter(Boolean),
  credentials: true,
}));

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Metrics middleware (track all requests)
app.use(metricsMiddleware);

// Health check (before auth)
app.use(healthRouter);

// JWT auth middleware
app.use(authMiddleware);

// Order API (handled directly, not proxied)
app.use('/api/orders', ordersRouter);

// Proxy routes to microservices
setupProxies(app);

// Error handler
app.use(errorHandler);

server.listen(config.port, () => {
  console.log(`API Gateway running on port ${config.port} (HTTP + WebSocket)`);
});

export default app;
