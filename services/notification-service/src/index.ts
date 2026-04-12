import express from 'express';
import helmet from 'helmet';
import { config } from './config/index.js';
import { connectRabbitMQ } from './config/rabbitmq.js';
import { errorHandler } from './middleware/errorHandler.js';
import { metricsMiddleware, register } from './middleware/metrics.js';
import healthRouter from './routes/health.js';

const app = express();

// Prometheus metrics endpoint
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use(helmet());
app.use(express.json());

// Metrics middleware
app.use(metricsMiddleware);

// Routes
app.use('/api/notifications', healthRouter);

// Error handler
app.use(errorHandler);

async function start(): Promise<void> {
  await connectRabbitMQ();

  app.listen(config.port, () => {
    console.log(`Notification Service running on port ${config.port}`);
  });
}

start().catch(console.error);

export default app;
