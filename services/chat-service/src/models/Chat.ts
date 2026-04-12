import mongoose, { Schema, type Document } from 'mongoose';

export type ChatStatus = 'ai' | 'waiting' | 'active' | 'closed';

export type ResolutionType = 'ai_resolved' | 'agent_resolved' | 'customer_left' | 'auto_closed' | null;

export interface IChat extends Document {
  customerName: string;
  customerEmail: string;
  customerSocketId: string;
  agentId: string | null;
  agentName: string | null;
  agentSocketId: string | null;
  status: ChatStatus;
  subject: string;
  lastMessage: string;
  unreadAgentCount: number;
  resolution: ResolutionType;
  tags: string[];
  orderId: string | null;
  closedAt: Date | null;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema = new Schema<IChat>(
  {
    customerName: { type: String, required: true },
    customerEmail: { type: String, default: '' },
    customerSocketId: { type: String, default: '' },
    agentId: { type: String, default: null },
    agentName: { type: String, default: null },
    agentSocketId: { type: String, default: null },
    status: {
      type: String,
      enum: ['ai', 'waiting', 'active', 'closed'],
      default: 'ai',
    },
    subject: { type: String, default: 'General Inquiry' },
    lastMessage: { type: String, default: '' },
    unreadAgentCount: { type: Number, default: 0 },
    resolution: {
      type: String,
      enum: ['ai_resolved', 'agent_resolved', 'customer_left', 'auto_closed', null],
      default: null,
    },
    tags: { type: [String], default: [] },
    orderId: { type: String, default: null },
    closedAt: { type: Date, default: null },
    messageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

chatSchema.index({ status: 1, updatedAt: -1 });
chatSchema.index({ agentId: 1, status: 1 });

export const Chat = mongoose.model<IChat>('Chat', chatSchema);
