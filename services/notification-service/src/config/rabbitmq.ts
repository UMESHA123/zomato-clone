import amqplib, { type ChannelModel, type Channel } from 'amqplib';
import { config } from './index.js';

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

export async function connectRabbitMQ(): Promise<void> {
  try {
    connection = await amqplib.connect(config.rabbitmq.url);
    channel = await connection.createChannel();

    // Assert exchanges this service consumes from
    await channel.assertExchange('order.exchange', 'topic', { durable: true });
    await channel.assertExchange('payment.exchange', 'topic', { durable: true });
    await channel.assertExchange('delivery.exchange', 'topic', { durable: true });
    await channel.assertExchange('user.exchange', 'topic', { durable: true });

    // Assert queues for notification consumption
    const queues = [
      { queue: 'notification.order.created', exchange: 'order.exchange', key: 'order.created' },
      { queue: 'notification.order.updated', exchange: 'order.exchange', key: 'order.updated' },
      { queue: 'notification.order.cancelled', exchange: 'order.exchange', key: 'order.cancelled' },
      { queue: 'notification.payment.completed', exchange: 'payment.exchange', key: 'payment.completed' },
      { queue: 'notification.payment.failed', exchange: 'payment.exchange', key: 'payment.failed' },
      { queue: 'notification.delivery.assigned', exchange: 'delivery.exchange', key: 'delivery.assigned' },
      { queue: 'notification.delivery.completed', exchange: 'delivery.exchange', key: 'delivery.completed' },
      { queue: 'notification.user.registered', exchange: 'user.exchange', key: 'user.registered' },
    ];

    for (const { queue, exchange, key } of queues) {
      await channel.assertQueue(queue, { durable: true });
      await channel.bindQueue(queue, exchange, key);
    }

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
