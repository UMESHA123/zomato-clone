import { Router } from 'express';
import { Chat } from '../models/Chat.js';
import { Message } from '../models/Message.js';

const router = Router();

/**
 * GET /api/chat/incidents
 * List all incidents (admin view) - includes all chats regardless of status
 */
router.get('/', async (req, res) => {
  try {
    const {
      status,
      resolution,
      agentId,
      from,
      to,
      search,
      page = '0',
      size = '20',
    } = req.query;

    const filter: Record<string, any> = {};

    if (status) filter.status = status;
    if (resolution) filter.resolution = resolution;
    if (agentId) filter.agentId = agentId;

    // Date range
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from as string);
      if (to) filter.createdAt.$lte = new Date(to as string);
    }

    // Search by customer name, email, or subject
    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      filter.$or = [
        { customerName: searchRegex },
        { customerEmail: searchRegex },
        { subject: searchRegex },
      ];
    }

    const pageNum = parseInt(page as string, 10);
    const pageSize = parseInt(size as string, 10);

    const [incidents, total] = await Promise.all([
      Chat.find(filter)
        .sort({ updatedAt: -1 })
        .skip(pageNum * pageSize)
        .limit(pageSize)
        .lean(),
      Chat.countDocuments(filter),
    ]);

    // Add message count for each incident
    const incidentsWithCounts = await Promise.all(
      incidents.map(async (incident) => {
        const msgCount = incident.messageCount || await Message.countDocuments({ chatId: incident._id });
        return {
          ...incident,
          id: incident._id,
          messageCount: msgCount,
        };
      })
    );

    res.json({
      incidents: incidentsWithCounts,
      total,
      page: pageNum,
      size: pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Error listing incidents:', error);
    res.status(500).json({ error: 'Failed to list incidents' });
  }
});

/**
 * GET /api/chat/incidents/stats
 * Incident statistics for admin dashboard
 */
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);

    const thisMonth = new Date();
    thisMonth.setMonth(thisMonth.getMonth() - 1);

    const [
      totalAll,
      totalToday,
      totalWeek,
      totalMonth,
      activeCount,
      waitingCount,
      closedCount,
      aiResolvedCount,
      agentResolvedCount,
    ] = await Promise.all([
      Chat.countDocuments(),
      Chat.countDocuments({ createdAt: { $gte: today } }),
      Chat.countDocuments({ createdAt: { $gte: thisWeek } }),
      Chat.countDocuments({ createdAt: { $gte: thisMonth } }),
      Chat.countDocuments({ status: 'active' }),
      Chat.countDocuments({ status: 'waiting' }),
      Chat.countDocuments({ status: 'closed' }),
      Chat.countDocuments({ resolution: 'ai_resolved' }),
      Chat.countDocuments({ resolution: 'agent_resolved' }),
    ]);

    // Avg resolution time for closed chats (in minutes)
    const closedChats = await Chat.find(
      { status: 'closed', closedAt: { $ne: null } },
      { createdAt: 1, closedAt: 1 }
    ).lean();

    let avgResolutionMinutes = 0;
    if (closedChats.length > 0) {
      const totalMinutes = closedChats.reduce((sum, chat) => {
        const created = new Date(chat.createdAt).getTime();
        const closed = new Date(chat.closedAt!).getTime();
        return sum + (closed - created) / 60000;
      }, 0);
      avgResolutionMinutes = Math.round(totalMinutes / closedChats.length);
    }

    // Unique agents who handled chats
    const agents = await Chat.distinct('agentName', { agentName: { $ne: null } });

    // Agent performance
    const agentStats = await Promise.all(
      agents.map(async (agentName) => {
        const handled = await Chat.countDocuments({ agentName, status: 'closed' });
        const agentChats = await Chat.find(
          { agentName, status: 'closed', closedAt: { $ne: null } },
          { createdAt: 1, closedAt: 1 }
        ).lean();

        let avgTime = 0;
        if (agentChats.length > 0) {
          const total = agentChats.reduce((sum, c) => {
            return sum + (new Date(c.closedAt!).getTime() - new Date(c.createdAt).getTime()) / 60000;
          }, 0);
          avgTime = Math.round(total / agentChats.length);
        }

        return { agentName, ticketsHandled: handled, avgResolutionMinutes: avgTime };
      })
    );

    // Common tags
    const tagAgg = await Chat.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const aiResolutionRate = totalAll > 0
      ? Math.round((aiResolvedCount / (aiResolvedCount + agentResolvedCount || 1)) * 100)
      : 0;

    res.json({
      total: totalAll,
      today: totalToday,
      thisWeek: totalWeek,
      thisMonth: totalMonth,
      active: activeCount,
      waiting: waitingCount,
      closed: closedCount,
      aiResolved: aiResolvedCount,
      agentResolved: agentResolvedCount,
      aiResolutionRate,
      avgResolutionMinutes,
      agentPerformance: agentStats,
      commonTags: tagAgg.map((t) => ({ tag: t._id, count: t.count })),
    });
  } catch (error) {
    console.error('Error fetching incident stats:', error);
    res.status(500).json({ error: 'Failed to fetch incident stats' });
  }
});

/**
 * GET /api/chat/incidents/:id
 * Get full incident details with message history
 */
router.get('/:id', async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id).lean();
    if (!chat) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }

    const messages = await Message.find({ chatId: req.params.id })
      .sort({ timestamp: 1 })
      .lean();

    res.json({
      ...chat,
      id: chat._id,
      messages: messages.map((m) => ({
        ...m,
        id: m._id,
      })),
    });
  } catch (error) {
    console.error('Error fetching incident:', error);
    res.status(500).json({ error: 'Failed to fetch incident' });
  }
});

/**
 * PUT /api/chat/incidents/:id/close
 * Close/resolve an incident
 */
router.put('/:id/close', async (req, res) => {
  try {
    const { resolution } = req.body;

    const chat = await Chat.findByIdAndUpdate(
      req.params.id,
      {
        status: 'closed',
        resolution: resolution || 'agent_resolved',
        closedAt: new Date(),
      },
      { new: true }
    ).lean();

    if (!chat) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }

    res.json({ ...chat, id: chat._id });
  } catch (error) {
    console.error('Error closing incident:', error);
    res.status(500).json({ error: 'Failed to close incident' });
  }
});

/**
 * PUT /api/chat/incidents/:id/tags
 * Update incident tags
 */
router.put('/:id/tags', async (req, res) => {
  try {
    const { tags } = req.body;

    const chat = await Chat.findByIdAndUpdate(
      req.params.id,
      { tags },
      { new: true }
    ).lean();

    if (!chat) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }

    res.json({ ...chat, id: chat._id });
  } catch (error) {
    console.error('Error updating tags:', error);
    res.status(500).json({ error: 'Failed to update tags' });
  }
});

export default router;
