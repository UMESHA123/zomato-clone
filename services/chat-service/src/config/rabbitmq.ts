import amqplib from 'amqplib';
import { config } from './index.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let connection: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let channel: any = null;
let status = 'disconnected';

const EXCHANGE_NAME = 'chat.exchange';

export async function connectRabbitMQ(): Promise<void> {
  try {
    connection = await amqplib.connect(config.rabbitmq.url);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
    await channel.assertQueue('chat.escalated', { durable: true });
    await channel.bindQueue('chat.escalated', EXCHANGE_NAME, 'chat.escalated');
    await channel.assertQueue('chat.resolved', { durable: true });
    await channel.bindQueue('chat.resolved', EXCHANGE_NAME, 'chat.resolved');

    status = 'connected';
    console.log('RabbitMQ connected for chat-service');

    connection.on('close', () => {
      status = 'disconnected';
      console.log('RabbitMQ connection closed');
    });

    connection.on('error', (err: Error) => {
      status = 'error';
      console.error('RabbitMQ error:', err.message);
    });
  } catch (error) {
    status = 'error';
    console.error('Failed to connect to RabbitMQ:', error);
    throw error;
  }
}

export function getRabbitMQChannel() {
  return channel;
}

export function getRabbitMQStatus(): string {
  return status;
}

export function publishEvent(routingKey: string, data: object): void {
  if (channel) {
    channel.publish(
      EXCHANGE_NAME,
      routingKey,
      Buffer.from(JSON.stringify(data)),
      { persistent: true }
    );
  }
}
