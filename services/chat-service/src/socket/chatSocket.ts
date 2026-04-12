import { Server, type Socket } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { Chat, type ChatStatus } from '../models/Chat.js';
import { Message } from '../models/Message.js';
import { getAIResponse, getWelcomeMessage, clearHistory } from '../services/aiService.js';
import { publishEvent } from '../config/rabbitmq.js';
import { config } from '../config/index.js';

let io: Server;

export function initializeSocket(httpServer: HTTPServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.cors.origins,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // ── Customer Events ──
    socket.on('chat:create', async (data: { customerName: string; customerEmail?: string }) => {
      try {
        const chat = await Chat.create({
          customerName: data.customerName,
          customerEmail: data.customerEmail || '',
          customerSocketId: socket.id,
          status: 'ai',
          subject: 'General Inquiry',
        });

        socket.join(`chat:${chat._id}`);

        const welcomeText = getWelcomeMessage();
        const welcomeMsg = await Message.create({
          chatId: chat._id,
          sender: 'ai',
          senderName: 'Zomi (AI)',
          content: welcomeText,
        });

        await Chat.findByIdAndUpdate(chat._id, { lastMessage: welcomeText });

        socket.emit('chat:created', {
          chatId: chat._id.toString(),
          status: chat.status,
        });

        socket.emit('chat:message', {
          chatId: chat._id.toString(),
          message: {
            _id: welcomeMsg._id,
            sender: welcomeMsg.sender,
            senderName: welcomeMsg.senderName,
            content: welcomeMsg.content,
            timestamp: welcomeMsg.timestamp,
          },
        });
      } catch (error) {
        console.error('Error creating chat:', error);
        socket.emit('chat:error', { message: 'Failed to create chat session' });
      }
    });

    socket.on('chat:message', async (data: { chatId: string; content: string }) => {
      try {
        const chat = await Chat.findById(data.chatId);
        if (!chat) {
          socket.emit('chat:error', { message: 'Chat not found' });
          return;
        }

        const customerMsg = await Message.create({
          chatId: chat._id,
          sender: 'customer',
          senderName: chat.customerName,
          content: data.content,
        });

        io.to(`chat:${chat._id}`).emit('chat:message', {
          chatId: chat._id.toString(),
          message: {
            _id: customerMsg._id,
            sender: customerMsg.sender,
            senderName: customerMsg.senderName,
            content: customerMsg.content,
            timestamp: customerMsg.timestamp,
          },
        });

        await Chat.findByIdAndUpdate(chat._id, {
          lastMessage: data.content,
          unreadAgentCount: chat.status === 'active' ? chat.unreadAgentCount + 1 : 0,
        });

        // If chatting with AI, get AI response
        if (chat.status === 'ai') {
          socket.emit('chat:typing', { chatId: chat._id.toString(), sender: 'ai' });

          const { response, shouldEscalate } = await getAIResponse(
            chat._id.toString(),
            data.content
          );

          const aiMsg = await Message.create({
            chatId: chat._id,
            sender: 'ai',
            senderName: 'Zomi (AI)',
            content: response,
          });

          io.to(`chat:${chat._id}`).emit('chat:message', {
            chatId: chat._id.toString(),
            message: {
              _id: aiMsg._id,
              sender: aiMsg.sender,
              senderName: aiMsg.senderName,
              content: aiMsg.content,
              timestamp: aiMsg.timestamp,
            },
          });

          await Chat.findByIdAndUpdate(chat._id, { lastMessage: response });

          if (shouldEscalate) {
            await escalateChat(chat._id.toString(), socket);
          }
        }

        // Notify agents of new messages in active chats
        if (chat.status === 'active') {
          io.to('agents').emit('agent:chat-updated', {
            chatId: chat._id.toString(),
            lastMessage: data.content,
            customerName: chat.customerName,
          });
        }
      } catch (error) {
        console.error('Error handling message:', error);
        socket.emit('chat:error', { message: 'Failed to send message' });
      }
    });

    socket.on('chat:rejoin', async (data: { chatId: string }) => {
      try {
        const chat = await Chat.findById(data.chatId);
        if (!chat) return;

        if (chat.status === 'closed') {
          // Allow rejoining closed chats in read-only mode (no socket room, no updates)
          socket.emit('chat:rejoined', { chatId: chat._id.toString(), status: 'closed' });
        } else {
          socket.join(`chat:${chat._id}`);
          await Chat.findByIdAndUpdate(chat._id, { customerSocketId: socket.id });
          socket.emit('chat:rejoined', { chatId: chat._id.toString(), status: chat.status });
        }
      } catch (error) {
        console.error('Error rejoining chat:', error);
      }
    });

    socket.on('chat:typing', (data: { chatId: string }) => {
      socket.to(`chat:${data.chatId}`).emit('chat:typing', {
        chatId: data.chatId,
        sender: 'customer',
      });
    });

    socket.on('chat:end', async (data: { chatId: string }) => {
      try {
        const chatBefore = await Chat.findById(data.chatId);
        const resolution = chatBefore?.agentId ? 'customer_left' : 'ai_resolved';
        await Chat.findByIdAndUpdate(data.chatId, {
          status: 'closed',
          resolution,
          closedAt: new Date(),
        });
        clearHistory(data.chatId);

        const systemMsg = await Message.create({
          chatId: data.chatId,
          sender: 'system',
          senderName: 'System',
          content: 'Customer ended the chat.',
        });

        io.to(`chat:${data.chatId}`).emit('chat:message', {
          chatId: data.chatId,
          message: {
            _id: systemMsg._id,
            sender: systemMsg.sender,
            senderName: systemMsg.senderName,
            content: systemMsg.content,
            timestamp: systemMsg.timestamp,
          },
        });

        io.to(`chat:${data.chatId}`).emit('chat:status', {
          chatId: data.chatId,
          status: 'closed',
        });

        io.to('agents').emit('agent:chat-updated', { chatId: data.chatId, status: 'closed' });
        socket.leave(`chat:${data.chatId}`);
      } catch (error) {
        console.error('Error ending chat:', error);
      }
    });

    // ── Agent Events ──
    socket.on('agent:join', async (data: { agentId: string; agentName: string }) => {
      socket.join('agents');
      (socket as any).agentId = data.agentId;
      (socket as any).agentName = data.agentName;
      console.log(`Agent joined: ${data.agentName} (${socket.id})`);

      const waitingChats = await Chat.find({ status: 'waiting' })
        .sort({ createdAt: 1 })
        .lean();
      socket.emit('agent:waiting-chats', waitingChats);
    });

    socket.on('agent:accept', async (data: { chatId: string }) => {
      try {
        const agentId = (socket as any).agentId;
        const agentName = (socket as any).agentName;

        const chat = await Chat.findOneAndUpdate(
          { _id: data.chatId, status: 'waiting' },
          {
            status: 'active',
            agentId,
            agentName,
            agentSocketId: socket.id,
            unreadAgentCount: 0,
          },
          { new: true }
        );

        if (!chat) {
          socket.emit('chat:error', { message: 'Chat no longer available' });
          return;
        }

        socket.join(`chat:${chat._id}`);

        const systemMsg = await Message.create({
          chatId: chat._id,
          sender: 'system',
          senderName: 'System',
          content: `${agentName} has joined the chat. You're now connected with a human agent.`,
        });

        io.to(`chat:${chat._id}`).emit('chat:message', {
          chatId: chat._id.toString(),
          message: {
            _id: systemMsg._id,
            sender: systemMsg.sender,
            senderName: systemMsg.senderName,
            content: systemMsg.content,
            timestamp: systemMsg.timestamp,
          },
        });

        io.to(`chat:${chat._id}`).emit('chat:status', {
          chatId: chat._id.toString(),
          status: 'active',
          agentName,
        });

        io.to('agents').emit('agent:chat-accepted', {
          chatId: chat._id.toString(),
          agentName,
        });

        publishEvent('chat.escalated', {
          chatId: chat._id.toString(),
          agentId,
          agentName,
          customerName: chat.customerName,
        });
      } catch (error) {
        console.error('Error accepting chat:', error);
        socket.emit('chat:error', { message: 'Failed to accept chat' });
      }
    });

    socket.on('agent:message', async (data: { chatId: string; content: string }) => {
      try {
        const agentName = (socket as any).agentName || 'Agent';

        const agentMsg = await Message.create({
          chatId: data.chatId,
          sender: 'agent',
          senderName: agentName,
          content: data.content,
        });

        io.to(`chat:${data.chatId}`).emit('chat:message', {
          chatId: data.chatId,
          message: {
            _id: agentMsg._id,
            sender: agentMsg.sender,
            senderName: agentMsg.senderName,
            content: agentMsg.content,
            timestamp: agentMsg.timestamp,
          },
        });

        await Chat.findByIdAndUpdate(data.chatId, {
          lastMessage: data.content,
          unreadAgentCount: 0,
        });
      } catch (error) {
        console.error('Error sending agent message:', error);
        socket.emit('chat:error', { message: 'Failed to send message' });
      }
    });

    socket.on('agent:typing', (data: { chatId: string }) => {
      socket.to(`chat:${data.chatId}`).emit('chat:typing', {
        chatId: data.chatId,
        sender: 'agent',
      });
    });

    socket.on('agent:close', async (data: { chatId: string }) => {
      try {
        const agentName = (socket as any).agentName || 'Agent';
        await Chat.findByIdAndUpdate(data.chatId, {
          status: 'closed',
          resolution: 'agent_resolved',
          closedAt: new Date(),
        });
        clearHistory(data.chatId);

        const systemMsg = await Message.create({
          chatId: data.chatId,
          sender: 'system',
          senderName: 'System',
          content: `${agentName} has resolved and closed this chat. Thank you for contacting Zomato Support!`,
        });

        io.to(`chat:${data.chatId}`).emit('chat:message', {
          chatId: data.chatId,
          message: {
            _id: systemMsg._id,
            sender: systemMsg.sender,
            senderName: systemMsg.senderName,
            content: systemMsg.content,
            timestamp: systemMsg.timestamp,
          },
        });

        io.to(`chat:${data.chatId}`).emit('chat:status', {
          chatId: data.chatId,
          status: 'closed',
        });

        io.to('agents').emit('agent:chat-updated', { chatId: data.chatId, status: 'closed' });

        publishEvent('chat.resolved', { chatId: data.chatId, agentName });
      } catch (error) {
        console.error('Error closing chat:', error);
      }
    });

    // ── Disconnect ──
    socket.on('disconnect', async () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

async function escalateChat(chatId: string, socket: Socket): Promise<void> {
  await Chat.findByIdAndUpdate(chatId, { status: 'waiting' });

  const systemMsg = await Message.create({
    chatId,
    sender: 'system',
    senderName: 'System',
    content: 'Please wait while we connect you with an available support agent. This usually takes less than a minute.',
  });

  io.to(`chat:${chatId}`).emit('chat:message', {
    chatId,
    message: {
      _id: systemMsg._id,
      sender: systemMsg.sender,
      senderName: systemMsg.senderName,
      content: systemMsg.content,
      timestamp: systemMsg.timestamp,
    },
  });

  io.to(`chat:${chatId}`).emit('chat:status', {
    chatId,
    status: 'waiting' as ChatStatus,
  });

  // Notify all agents
  const chat = await Chat.findById(chatId).lean();
  io.to('agents').emit('agent:new-chat', chat);

  publishEvent('chat.escalated', {
    chatId,
    customerName: chat?.customerName,
    subject: chat?.subject,
  });
}

export function getIO(): Server {
  return io;
}
