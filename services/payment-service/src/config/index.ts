import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

export const config = {
  port: process.env.PAYMENT_SERVICE_PORT || 8085,
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER || 'zomato',
    password: process.env.POSTGRES_PASSWORD || 'zomato_secret',
    database: 'zomato_payments',
  },
  rabbitmq: {
    url: `amqp://${process.env.RABBITMQ_USER || 'zomato'}:${process.env.RABBITMQ_PASSWORD || 'zomato_secret'}@${process.env.RABBITMQ_HOST || 'localhost'}:${process.env.RABBITMQ_PORT || '5672'}`,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || 'zomato_secret',
  },
};
