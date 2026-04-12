import { Router } from 'express';
import { getRabbitMQStatus } from '../config/rabbitmq.js';

const router = Router();

router.get('/health', (req, res) => {
  const rabbitmqStatus = getRabbitMQStatus();
  const isHealthy = rabbitmqStatus === 'connected';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'UP' : 'DEGRADED',
    service: 'notification-service',
    timestamp: new Date().toISOString(),
    dependencies: {
      rabbitmq: rabbitmqStatus,
    },
  });
});

export default router;
