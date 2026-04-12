import express from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config/index.js';
import { connectDatabase } from './config/database.js';
import { connectRabbitMQ } from './config/rabbitmq.js';
import { initializeSocket } from './socket/chatSocket.js';
import { errorHandler } from './middleware/errorHandler.js';
import { metricsMiddleware, register } from './middleware/metrics.js';
import healthRouter from './routes/health.js';
import chatsRouter from './routes/chats.js';
import incidentsRouter from './routes/incidents.js';

const app = express();
const httpServer = createServer(app);

// Prometheus metrics endpoint (before other middleware)
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: config.cors.origins,
    credentials: true,
  })
);
app.use(express.json());

// Metrics middleware
app.use(metricsMiddleware);

// Routes
app.use('/api/chat', healthRouter);
app.use('/api/chat/chats', chatsRouter);
app.use('/api/chat/incidents', incidentsRouter);

// Error handler
app.use(errorHandler);

// Initialize Socket.IO
initializeSocket(httpServer);

// Start server
async function start(): Promise<void> {
  try {
    await connectDatabase();
    console.log('MongoDB connected');
    await connectRabbitMQ();
    console.log('RabbitMQ connected');
  } catch (error) {
    console.error('Chat service failed to start:', error);
    process.exit(1);
  }

  httpServer.listen(config.port, () => {
    console.log(`Chat service running on port ${config.port}`);
    console.log(`AI Mode: ${config.anthropic.apiKey ? 'Claude API' : 'Built-in AI'}`);
  });
}

start();
