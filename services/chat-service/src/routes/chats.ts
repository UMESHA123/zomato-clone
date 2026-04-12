import { Router } from 'express';
import { Chat } from '../models/Chat.js';
import { Message } from '../models/Message.js';

const router = Router();

// List chats (for agent dashboard)
router.get('/', async (req, res) => {
  try {
    const { status, agentId, limit = '50', offset = '0' } = req.query;

    const filter: Record<string, any> = {};
    if (status) filter.status = status;
    if (agentId) filter.agentId = agentId;

    const chats = await Chat.find(filter)
      .sort({ updatedAt: -1 })
      .skip(parseInt(offset as string, 10))
      .limit(parseInt(limit as string, 10))
      .lean();

    const total = await Chat.countDocuments(filter);

    res.json({ chats, total });
  } catch (error) {
    console.error('Error listing chats:', error);
    res.status(500).json({ error: 'Failed to list chats' });
  }
});

// Get chat stats
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalActive, totalWaiting, totalAI, resolvedToday, totalToday] =
      await Promise.all([
        Chat.countDocuments({ status: 'active' }),
        Chat.countDocuments({ status: 'waiting' }),
        Chat.countDocuments({ status: 'ai' }),
        Chat.countDocuments({ status: 'closed', updatedAt: { $gte: today } }),
        Chat.countDocuments({ createdAt: { $gte: today } }),
      ]);

    res.json({
      totalActive,
      totalWaiting,
      totalAI,
      resolvedToday,
      totalToday,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get single chat
router.get('/:id', async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id).lean();
    if (!chat) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }
    res.json(chat);
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
});

// Get messages for a chat
router.get('/:id/messages', async (req, res) => {
  try {
    const messages = await Message.find({ chatId: req.params.id })
      .sort({ timestamp: 1 })
      .lean();
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;
