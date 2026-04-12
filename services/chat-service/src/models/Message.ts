import mongoose, { Schema, type Document } from 'mongoose';

export type SenderType = 'customer' | 'ai' | 'agent' | 'system';

export interface IMessage extends Document {
  chatId: mongoose.Types.ObjectId;
  sender: SenderType;
  senderName: string;
  content: string;
  timestamp: Date;
}

const messageSchema = new Schema<IMessage>({
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
  sender: {
    type: String,
    enum: ['customer', 'ai', 'agent', 'system'],
    required: true,
  },
  senderName: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

messageSchema.index({ chatId: 1, timestamp: 1 });

// Auto-increment messageCount on Chat when a message is created
messageSchema.post('save', async function (doc) {
  try {
    await mongoose.model('Chat').findByIdAndUpdate(doc.chatId, {
      $inc: { messageCount: 1 },
      lastMessage: doc.content,
    });
  } catch {
    // Silent - don't block message creation
  }
});

export const Message = mongoose.model<IMessage>('Message', messageSchema);
