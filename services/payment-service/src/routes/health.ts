import { Router } from 'express';
import { getDbStatus } from '../config/database.js';
import { getRabbitMQStatus } from '../config/rabbitmq.js';

const router = Router();

router.get('/health', async (req, res) => {
  const dbStatus = await getDbStatus();
  const rabbitmqStatus = getRabbitMQStatus();
  const isHealthy = dbStatus === 'connected' && rabbitmqStatus === 'connected';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'UP' : 'DEGRADED',
    service: 'payment-service',
    timestamp: new Date().toISOString(),
    dependencies: {
      postgresql: dbStatus,
      rabbitmq: rabbitmqStatus,
    },
  });
});

export default router;
