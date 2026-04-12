import amqplib, { type ChannelModel, type Channel } from 'amqplib';
import { config } from './index.js';

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

export async function connectRabbitMQ(): Promise<void> {
  try {
    connection = await amqplib.connect(config.rabbitmq.url);
    channel = await connection.createChannel();

    // Assert exchanges
    await channel.assertExchange('payment.exchange', 'topic', { durable: true });
    await channel.assertExchange('order.exchange', 'topic', { durable: true });

    // Assert and bind queues for consuming order events
    await channel.assertQueue('payment.order.created', { durable: true });
    await channel.bindQueue('payment.order.created', 'order.exchange', 'order.created');

    await channel.assertQueue('payment.order.cancelled', { durable: true });
    await channel.bindQueue('payment.order.cancelled', 'order.exchange', 'order.cancelled');

    console.log('Connected to RabbitMQ');

    connection.on('error', (err: Error) => {
      console.error('RabbitMQ connection error:', err);
    });

    connection.on('close', () => {
      console.warn('RabbitMQ connection closed');
    });
  } catch (error) {
    console.error('RabbitMQ connection error:', error);
  }
}

export function getRabbitMQChannel(): Channel | null {
  return channel;
}

export function getRabbitMQStatus(): string {
  if (channel && connection) return 'connected';
  return 'disconnected';
}
