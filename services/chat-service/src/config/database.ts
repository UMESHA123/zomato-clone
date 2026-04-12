import mongoose from 'mongoose';
import { config } from './index.js';

let connectionStatus = 'disconnected';

export async function connectDatabase(): Promise<void> {
  try {
    mongoose.connection.on('connected', () => {
      connectionStatus = 'connected';
      console.log('MongoDB connected for chat-service');
    });

    mongoose.connection.on('disconnected', () => {
      connectionStatus = 'disconnected';
      console.log('MongoDB disconnected');
    });

    mongoose.connection.on('error', (err) => {
      connectionStatus = 'error';
      console.error('MongoDB connection error:', err.message);
    });

    await mongoose.connect(config.mongo.uri, {
      serverSelectionTimeoutMS: 5000,
    });
  } catch (error) {
    connectionStatus = 'error';
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export function getMongoStatus(): string {
  return connectionStatus;
}
