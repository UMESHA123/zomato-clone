import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

export const config = {
  port: process.env.NOTIFICATION_SERVICE_PORT || 8086,
  rabbitmq: {
    url: `amqp://${process.env.RABBITMQ_USER || 'zomato'}:${process.env.RABBITMQ_PASSWORD || 'zomato_secret'}@${process.env.RABBITMQ_HOST || 'localhost'}:${process.env.RABBITMQ_PORT || '5672'}`,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || 'zomato_secret',
  },
  email: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '1025'),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};
