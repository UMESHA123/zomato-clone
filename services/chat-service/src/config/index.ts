import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  port: parseInt(process.env.CHAT_SERVICE_PORT || '8087', 10),
  mongo: {
    uri: `mongodb://${process.env.MONGO_USER || 'zomato'}:${process.env.MONGO_PASSWORD || 'zomato_secret'}@${process.env.MONGO_HOST || 'localhost'}:${process.env.MONGO_PORT || '27017'}/zomato_chats?authSource=admin`,
  },
  rabbitmq: {
    url: `amqp://${process.env.RABBITMQ_USER || 'zomato'}:${process.env.RABBITMQ_PASSWORD || 'zomato_secret'}@${process.env.RABBITMQ_HOST || 'localhost'}:${process.env.RABBITMQ_PORT || '5672'}`,
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },
  cors: {
    origins: [
      process.env.FRONTEND_CUSTOMER_URL || 'http://localhost:3000',
      process.env.FRONTEND_AGENT_URL || 'http://localhost:3003',
    ],
  },
};
