import { Router, Request, Response } from 'express';

export interface Order {
  id: string;
  restaurantId: string;
  restaurant: string;
  restaurantAddress: string;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  taxes: number;
  total: number;
  status: string;
  paymentMethod: string;
  customerName: string;
  date: string;
  placedAt: string;
  createdAt: number;
}

// In-memory order store
const orders: Order[] = [];
let orderCounter = 1000;

function generateOrderId(): string {
  orderCounter++;
  return `ORD-${orderCounter}`;
}

// Broadcast function — set by main index
let broadcastFn: (data: object) => void = () => {};
export function setBroadcast(fn: (data: object) => void) {
  broadcastFn = fn;
}

const router = Router();

// Create order
router.post('/', (req: Request, res: Response) => {
  const body = req.body;

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const order: Order = {
    id: generateOrderId(),
    restaurantId: body.restaurantId || '1',
    restaurant: body.restaurant || 'Unknown Restaurant',
    restaurantAddress: body.restaurantAddress || '',
    items: body.items || [],
    subtotal: body.subtotal || 0,
    deliveryFee: body.deliveryFee || 0,
    discount: body.discount || 0,
    taxes: body.taxes || 0,
    total: body.total || 0,
    status: 'confirmed',
    paymentMethod: body.paymentMethod || 'cod',
    customerName: body.customerName || 'Customer',
    date: `Today, ${timeStr}`,
    placedAt: timeStr,
    createdAt: Date.now(),
  };

  orders.unshift(order);
  broadcastFn({ type: 'new_order', order });
  console.log(`New order: ${order.id} from ${order.restaurant}`);
  res.status(201).json(order);
});

// List all orders
router.get('/', (_req: Request, res: Response) => {
  res.json(orders);
});

// Get single order
router.get('/:id', (req: Request, res: Response) => {
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  res.json(order);
});

// Update order status
router.patch('/:id/status', (req: Request, res: Response) => {
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const { status } = req.body;
  if (!status) {
    res.status(400).json({ error: 'Status is required' });
    return;
  }

  order.status = status;
  broadcastFn({ type: 'order_updated', order });
  console.log(`Order ${order.id} status → ${status}`);
  res.json(order);
});

export default router;
