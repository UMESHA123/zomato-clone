# Zomato Clone - Project Specification

> **This document is the single source of truth for the Zomato Clone project.**
> All code changes, new features, and architectural decisions MUST align with this spec.
> Read this file before creating or editing anything in the project.

---

## 1. Overview

A full-stack food delivery platform (Zomato clone) built with a microservice architecture. The system supports four user roles:

| Role | Portal | Port | Description |
|------|--------|------|-------------|
| **Customer** | frontend-customer | 3000 | Browse restaurants, order food, track deliveries, get support |
| **Restaurant** | frontend-restaurant | 3001 | Manage menu, handle orders, view reviews & analytics |
| **Driver** | frontend-driver | 3002 | Accept deliveries, navigate routes, track earnings |
| **Support Agent** | frontend-agent | 3003 | Handle escalated chats, manage support tickets |

**Admin** capabilities are embedded within the Agent portal (role-based).

---

## 2. Architecture

### 2.1 System Diagram

```
[Customers]  [Restaurants]  [Drivers]  [Agents/Admin]
     |             |            |            |
     +------+------+-----+------+------+-----+
            |                   |
      [API Gateway :8080]  [Socket.IO :8087]
            |                   |
   +--------+--------+         |
   |  |  |  |  |  |  |         |
  US  RS OS DS PS NS  CS--------+
```

### 2.2 Services

| Service | Port | Stack | Database | Description |
|---------|------|-------|----------|-------------|
| **API Gateway** | 8080 | Node/Express | Redis (cache) | Routes, auth validation, rate limiting |
| **User Service** | 8081 | Java/Spring Boot | PostgreSQL (zomato_users) | Auth, registration, profiles |
| **Restaurant Service** | 8082 | Java/Spring Boot | PostgreSQL (zomato_restaurants) | Restaurant CRUD, menus, reviews |
| **Order Service** | 8083 | Java/Spring Boot | PostgreSQL (zomato_orders) | Order lifecycle management |
| **Delivery Service** | 8084 | Node/Express | MongoDB (zomato_delivery) | Delivery assignment, tracking |
| **Payment Service** | 8085 | Node/Express | PostgreSQL (zomato_payments) | Payment processing |
| **Notification Service** | 8086 | Node/Express | Redis | Push notifications, email triggers |
| **Chat Service** | 8087 | Node/Express + Socket.IO | MongoDB (zomato_chat) | Real-time support chat, AI + human agents |

### 2.3 Infrastructure

| Component | Image | Port | Purpose |
|-----------|-------|------|---------|
| PostgreSQL 16 | postgres:16-alpine | 5432 | Relational data (users, restaurants, orders, payments) |
| MongoDB 7 | mongo:7 | 27017 | Document data (deliveries, chats) |
| Redis 7 | redis:7-alpine | 6379 | Caching, sessions, pub/sub |
| RabbitMQ 3 | rabbitmq:3-management-alpine | 5672/15672 | Async messaging between services |

### 2.4 Communication Patterns

- **Synchronous**: REST via API Gateway for CRUD operations
- **Asynchronous**: RabbitMQ for event-driven workflows (order placed, payment confirmed, delivery assigned)
- **Real-time**: Socket.IO for chat, delivery tracking, order status updates

---

## 3. Data Models

### 3.1 User Service (PostgreSQL)

```sql
-- Users table
CREATE TABLE users (
  id          BIGSERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,  -- BCrypt hashed
  role        VARCHAR(20) NOT NULL,   -- CUSTOMER, RESTAURANT, DELIVERY, ADMIN
  phone       VARCHAR(20),
  address     TEXT,
  latitude    DOUBLE PRECISION,
  longitude   DOUBLE PRECISION,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);
```

**Roles**: `CUSTOMER`, `RESTAURANT`, `DELIVERY`, `ADMIN`

### 3.2 Restaurant Service (PostgreSQL)

```sql
-- Restaurants table
CREATE TABLE restaurants (
  id            BIGSERIAL PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  description   TEXT,
  address       VARCHAR(500) NOT NULL,
  phone         VARCHAR(20),
  email         VARCHAR(255),
  cuisine_type  VARCHAR(50),    -- INDIAN, CHINESE, ITALIAN, etc.
  rating        DECIMAL(2,1) DEFAULT 0.0,
  review_count  INTEGER DEFAULT 0,
  image_url     VARCHAR(500),
  is_active     BOOLEAN DEFAULT true,
  opening_time  TIME,
  closing_time  TIME,
  owner_id      BIGINT NOT NULL,  -- FK to users
  latitude      DOUBLE PRECISION,
  longitude     DOUBLE PRECISION,
  delivery_time VARCHAR(20),     -- e.g. "30-35 min"
  price_range   VARCHAR(50),     -- e.g. "300 for two"
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- Menu items table
CREATE TABLE menu_items (
  id            BIGSERIAL PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  description   TEXT,
  price         DECIMAL(10,2) NOT NULL,
  category      VARCHAR(50),    -- BIRYANI, CURRIES, STARTERS, etc.
  image_url     VARCHAR(500),
  is_available  BOOLEAN DEFAULT true,
  is_veg        BOOLEAN DEFAULT false,
  is_bestseller BOOLEAN DEFAULT false,
  rating        DECIMAL(2,1) DEFAULT 0.0,
  restaurant_id BIGINT NOT NULL REFERENCES restaurants(id),
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- Reviews table
CREATE TABLE reviews (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL,
  user_name     VARCHAR(100),
  rating        INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  reply         TEXT,          -- Restaurant owner reply
  restaurant_id BIGINT NOT NULL REFERENCES restaurants(id),
  created_at    TIMESTAMP DEFAULT NOW()
);
```

### 3.3 Order Service (PostgreSQL)

```sql
-- Orders table
CREATE TABLE orders (
  id                BIGSERIAL PRIMARY KEY,
  order_number      VARCHAR(20) UNIQUE NOT NULL,  -- e.g. ORD-1234
  customer_id       BIGINT NOT NULL,
  restaurant_id     BIGINT NOT NULL,
  restaurant_name   VARCHAR(200),
  restaurant_address VARCHAR(500),
  delivery_address  TEXT,
  delivery_latitude  DOUBLE PRECISION,
  delivery_longitude DOUBLE PRECISION,
  subtotal          DECIMAL(10,2) NOT NULL,
  delivery_fee      DECIMAL(10,2) DEFAULT 0,
  discount          DECIMAL(10,2) DEFAULT 0,
  taxes             DECIMAL(10,2) DEFAULT 0,
  total             DECIMAL(10,2) NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'PLACED',
  -- Statuses: PLACED, CONFIRMED, PREPARING, READY, PICKED_UP, ON_THE_WAY, DELIVERED, CANCELLED
  payment_status    VARCHAR(20) DEFAULT 'PENDING',
  payment_method    VARCHAR(20),
  coupon_code       VARCHAR(50),
  driver_id         BIGINT,
  driver_name       VARCHAR(100),
  estimated_delivery_time TIMESTAMP,
  actual_delivery_time    TIMESTAMP,
  rating            INTEGER,
  feedback          TEXT,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

-- Order items table
CREATE TABLE order_items (
  id            BIGSERIAL PRIMARY KEY,
  order_id      BIGINT NOT NULL REFERENCES orders(id),
  menu_item_id  BIGINT NOT NULL,
  name          VARCHAR(200) NOT NULL,
  price         DECIMAL(10,2) NOT NULL,
  quantity      INTEGER NOT NULL DEFAULT 1,
  is_veg        BOOLEAN DEFAULT false
);
```

### 3.4 Delivery Service (MongoDB)

```javascript
// Delivery document
{
  _id: ObjectId,
  orderId: String,           // References order
  orderNumber: String,
  restaurantName: String,
  restaurantAddress: String,
  restaurantLocation: { lat: Number, lng: Number },
  customerName: String,
  customerAddress: String,
  customerLocation: { lat: Number, lng: Number },
  driverId: String,
  driverName: String,
  driverLocation: { lat: Number, lng: Number },
  items: [{ name: String, quantity: Number }],
  total: Number,
  earning: Number,
  distance: String,
  estimatedTime: String,
  status: String,  // PENDING, ASSIGNED, PICKED_UP, ON_THE_WAY, DELIVERED, CANCELLED
  createdAt: Date,
  pickedUpAt: Date,
  deliveredAt: Date,
  completedAt: Date,
  rating: Number,
  feedback: String
}
```

### 3.5 Payment Service (PostgreSQL)

```sql
-- Payments table
CREATE TABLE payments (
  id              BIGSERIAL PRIMARY KEY,
  order_id        BIGINT NOT NULL,
  order_number    VARCHAR(20) NOT NULL,
  customer_id     BIGINT NOT NULL,
  amount          DECIMAL(10,2) NOT NULL,
  method          VARCHAR(20) NOT NULL,  -- COD, UPI, CARD, WALLET
  status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  -- Statuses: PENDING, PROCESSING, COMPLETED, FAILED, REFUNDED
  transaction_id  VARCHAR(100),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

### 3.6 Chat Service (MongoDB)

```javascript
// Chat document
{
  _id: ObjectId,
  customerName: String,
  customerEmail: String,
  customerSocketId: String,
  agentId: String,
  agentName: String,
  agentSocketId: String,
  status: String,        // 'ai', 'waiting', 'active', 'closed'
  subject: String,
  lastMessage: String,
  unreadAgentCount: Number,
  resolution: String,    // 'ai_resolved', 'agent_resolved', 'customer_left', null
  tags: [String],        // e.g. ['refund', 'order-issue', 'payment']
  orderId: String,       // Related order if applicable
  createdAt: Date,
  updatedAt: Date,
  closedAt: Date
}

// Message document
{
  _id: ObjectId,
  chatId: ObjectId,      // References Chat
  sender: String,        // 'customer', 'ai', 'agent', 'system'
  senderName: String,
  content: String,
  timestamp: Date
}
```

---

## 4. API Contracts

All APIs are accessed via the API Gateway at `http://localhost:8080`.

### 4.1 Authentication APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/users/auth/register` | Register new user | No |
| POST | `/api/users/auth/login` | Login, returns JWT | No |
| GET | `/api/users/auth/me` | Get current user profile | Yes |
| PUT | `/api/users/auth/me` | Update profile | Yes |

**JWT Token**: Sent as `Authorization: Bearer <token>` header.

**Register Request**:
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "role": "CUSTOMER | RESTAURANT | DELIVERY | ADMIN",
  "phone": "string (optional)"
}
```

**Auth Response**:
```json
{
  "token": "jwt-string",
  "user": {
    "id": 1,
    "name": "string",
    "email": "string",
    "role": "string"
  }
}
```

### 4.2 Restaurant APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/restaurants` | List restaurants (with filters) | No |
| GET | `/api/restaurants/:id` | Get restaurant details | No |
| POST | `/api/restaurants` | Create restaurant | Yes (RESTAURANT) |
| PUT | `/api/restaurants/:id` | Update restaurant | Yes (RESTAURANT) |
| GET | `/api/restaurants/:id/menu` | Get menu items | No |
| POST | `/api/restaurants/:id/menu` | Add menu item | Yes (RESTAURANT) |
| PUT | `/api/restaurants/:id/menu/:itemId` | Update menu item | Yes (RESTAURANT) |
| DELETE | `/api/restaurants/:id/menu/:itemId` | Delete menu item | Yes (RESTAURANT) |
| GET | `/api/restaurants/:id/reviews` | Get reviews | No |
| POST | `/api/restaurants/:id/reviews` | Add review | Yes (CUSTOMER) |
| GET | `/api/restaurants/owner/me` | Get owner's restaurant | Yes (RESTAURANT) |
| GET | `/api/restaurants/owner/me/stats` | Get dashboard stats | Yes (RESTAURANT) |

**Query parameters for listing**: `?cuisine=INDIAN&sort=rating&page=0&size=20&search=biryani`

### 4.3 Order APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/orders` | Place new order | Yes (CUSTOMER) |
| GET | `/api/orders/my` | Get customer's orders | Yes (CUSTOMER) |
| GET | `/api/orders/:id` | Get order details | Yes |
| PUT | `/api/orders/:id/status` | Update order status | Yes (RESTAURANT/DRIVER) |
| PUT | `/api/orders/:id/cancel` | Cancel order | Yes (CUSTOMER) |
| PUT | `/api/orders/:id/rate` | Rate order | Yes (CUSTOMER) |
| GET | `/api/orders/restaurant/active` | Get restaurant's active orders | Yes (RESTAURANT) |
| GET | `/api/orders/restaurant/history` | Get restaurant's order history | Yes (RESTAURANT) |

**Place Order Request**:
```json
{
  "restaurantId": 1,
  "restaurantName": "string",
  "restaurantAddress": "string",
  "deliveryAddress": "string",
  "deliveryLatitude": 12.9716,
  "deliveryLongitude": 77.6412,
  "items": [
    { "menuItemId": 1, "name": "string", "price": 299, "quantity": 2, "isVeg": true }
  ],
  "couponCode": "string (optional)",
  "paymentMethod": "COD | UPI | CARD"
}
```

### 4.4 Delivery APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/delivery/available` | Get available deliveries | Yes (DELIVERY) |
| POST | `/api/delivery/:id/accept` | Accept a delivery | Yes (DELIVERY) |
| GET | `/api/delivery/active` | Get driver's active delivery | Yes (DELIVERY) |
| PUT | `/api/delivery/:id/status` | Update delivery status | Yes (DELIVERY) |
| PUT | `/api/delivery/:id/location` | Update driver location | Yes (DELIVERY) |
| GET | `/api/delivery/history` | Get driver's delivery history | Yes (DELIVERY) |
| GET | `/api/delivery/stats` | Get driver earnings/stats | Yes (DELIVERY) |

### 4.5 Payment APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/payments` | Initiate payment | Yes |
| GET | `/api/payments/:id` | Get payment status | Yes |
| POST | `/api/payments/:id/confirm` | Confirm payment (webhook) | Internal |
| POST | `/api/payments/:id/refund` | Initiate refund | Yes (ADMIN) |

### 4.6 Chat APIs (REST + Socket.IO)

**REST Endpoints**:

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/chat/chats` | List chats (filter by status) | Yes (AGENT/ADMIN) |
| GET | `/api/chat/chats/stats` | Get chat statistics | Yes (AGENT/ADMIN) |
| GET | `/api/chat/chats/:id` | Get chat details | Yes (AGENT/ADMIN) |
| GET | `/api/chat/chats/:id/messages` | Get chat messages | Yes (AGENT/ADMIN) |
| PUT | `/api/chat/chats/:id/close` | Close/resolve a chat | Yes (AGENT/ADMIN) |
| GET | `/api/chat/incidents` | List all incidents (admin) | Yes (ADMIN) |
| GET | `/api/chat/incidents/:id` | Get incident details with full history | Yes (ADMIN) |
| GET | `/api/chat/incidents/stats` | Get incident statistics | Yes (ADMIN) |

**Socket.IO Events**:

| Event | Direction | Description |
|-------|-----------|-------------|
| `chat:create` | Client -> Server | Customer starts new chat |
| `chat:created` | Server -> Client | Chat created confirmation |
| `chat:message` | Bidirectional | Send/receive messages |
| `chat:status` | Server -> Client | Chat status changed |
| `chat:typing` | Client -> Server | Typing indicator |
| `chat:end` | Client -> Server | Customer ends chat |
| `agent:join` | Client -> Server | Agent connects |
| `agent:accept` | Client -> Server | Agent accepts waiting chat |
| `agent:waiting-chats` | Server -> Client | Updated waiting chat list |
| `agent:new-chat` | Server -> Client | New chat needs attention |

---

## 5. Frontend Specifications

### 5.1 General Rules

1. **NO hardcoded/mock/dummy data** in any frontend page. All data MUST come from API calls.
2. Every page that fetches data MUST show:
   - **Loading skeleton** while fetching
   - **Error state** if the API fails (with retry button)
   - **Empty state** if no data exists (with helpful CTA)
3. **Authentication**: All portals (except customer browsing) require login. Store JWT in localStorage/cookies.
4. **API base URL**: Use `NEXT_PUBLIC_API_URL` environment variable (defaults to `http://localhost:8080`).
5. **Responsive**: All pages must work on mobile (375px) through desktop (1440px+).
6. **Dark mode**: Support system preference and manual toggle.

### 5.2 Customer Portal (port 3000)

**Pages**:

| Route | Description | Data Source |
|-------|-------------|-------------|
| `/` | Landing page with role selection | Static (OK) |
| `/restaurants` | Restaurant listing with filters/sort | `GET /api/restaurants` |
| `/restaurants/:id` | Restaurant detail with menu | `GET /api/restaurants/:id` + `/menu` + `/reviews` |
| `/cart` | Shopping cart | Local state (AppContext) + coupon validation via API |
| `/orders` | Order history | `GET /api/orders/my` |
| `/orders/:id` | Live order tracking | `GET /api/orders/:id` + WebSocket for live updates |

**Cart behavior**:
- Cart state managed in AppContext (client-side) - this is OK
- Switching restaurant clears cart (with confirmation dialog)
- Delivery fee: free above 500 INR, else 40 INR
- Taxes: 5% GST on (subtotal - discount)
- Coupon validation should call API (not hardcode "ZOMATO20")

**Order tracking**:
- Status progression: PLACED -> CONFIRMED -> PREPARING -> READY -> PICKED_UP -> ON_THE_WAY -> DELIVERED
- Real-time updates via WebSocket/polling
- Map shows restaurant, driver, and customer locations
- Driver location updates in real-time

### 5.3 Restaurant Portal (port 3001)

**Pages**:

| Route | Description | Data Source |
|-------|-------------|-------------|
| `/dashboard` | Overview with stats and live orders | `GET /api/restaurants/owner/me/stats` + `GET /api/orders/restaurant/active` |
| `/dashboard/menu` | Menu management (CRUD) | `GET/POST/PUT/DELETE /api/restaurants/:id/menu` |
| `/dashboard/orders` | Order history | `GET /api/orders/restaurant/history` |
| `/dashboard/reviews` | Customer reviews with replies | `GET /api/restaurants/:id/reviews` |

**Dashboard stats** (from API, not hardcoded):
- Today's revenue, order count, average rating, average prep time
- Comparison with previous day/period

**Live orders**:
- New orders get audio notification + visual ping
- Restaurant can: Accept (CONFIRMED), Mark Preparing, Mark Ready
- Status updates sent via API + RabbitMQ event

### 5.4 Driver Portal (port 3002)

**Pages**:

| Route | Description | Data Source |
|-------|-------------|-------------|
| `/deliveries` | Available delivery requests | `GET /api/delivery/available` |
| `/deliveries/active` | Current active delivery with map | `GET /api/delivery/active` |
| `/deliveries/history` | Completed deliveries | `GET /api/delivery/history` |

**Available deliveries**:
- Auto-refresh every 15 seconds
- 30-second acceptance timer per delivery
- Show restaurant name, pickup/drop address, distance, ETA, earning
- Accept sends `POST /api/delivery/:id/accept`

**Active delivery**:
- Real-time map with route
- Driver can update status: PICKED_UP -> ON_THE_WAY -> DELIVERED
- Location updates sent to server every 10 seconds

### 5.5 Agent Portal (port 3003)

**Pages**:

| Route | Description | Data Source |
|-------|-------------|-------------|
| `/` | Agent login + chat dashboard | Socket.IO + REST APIs |
| `/admin/incidents` | All incidents (admin only) | `GET /api/chat/incidents` |
| `/admin/incidents/:id` | Incident detail with full chat history | `GET /api/chat/incidents/:id` |

---

## 6. Support & Incident Management

### 6.1 Chat Flow

```
Customer opens chat
  -> AI (Zomi) handles initial queries
  -> If escalation keyword detected OR customer requests
    -> Status: 'waiting' (queued for human agent)
    -> Agent accepts chat -> Status: 'active'
    -> Agent resolves -> Status: 'closed'
  -> If AI resolves
    -> Customer closes chat -> Status: 'closed' (resolution: 'ai_resolved')
```

### 6.2 AI Agent (Zomi)

- Powered by Claude API (with fallback to built-in responses)
- Handles: order tracking, refunds, delivery issues, payments, food quality, account issues, promotions
- Escalation triggers: explicit request for human agent, or complex issues
- All AI conversations are persisted in MongoDB

### 6.3 Incident Lifecycle

Every chat session is an **incident/ticket**. Stored permanently in MongoDB.

**Incident fields**:
- Ticket ID (auto-generated)
- Customer info (name, email)
- Subject/category
- Status: `ai` -> `waiting` -> `active` -> `closed`
- Resolution type: `ai_resolved`, `agent_resolved`, `customer_left`, `auto_closed`
- Assigned agent (if escalated)
- Tags (auto-tagged by AI: refund, order-issue, payment, etc.)
- Related order ID (if applicable)
- Full message history (all messages from customer, AI, agent, system)
- Timestamps: created, updated, closed
- Duration (time to resolution)

### 6.4 Admin Incident View

Admin dashboard shows:

1. **Incident List** (filterable):
   - All incidents (open + closed)
   - Filter by: status, resolution type, agent, date range, tags
   - Sort by: newest, oldest, unresolved first
   - Search by: customer name, email, ticket ID, message content

2. **Incident Detail**:
   - Full conversation thread (customer, AI, agent messages with timestamps)
   - Customer info
   - Agent info (who handled it)
   - Resolution details
   - Related order info
   - Timeline of status changes

3. **Statistics Dashboard**:
   - Total incidents (today, this week, this month)
   - AI resolution rate (% resolved without human)
   - Average response time
   - Average resolution time
   - Agent performance (tickets handled, avg resolution time)
   - Common issues (tag frequency)
   - Customer satisfaction (if rated)

---

## 7. UX Requirements

### 7.1 Authentication Flow

- Landing page (`/`) allows role selection without login
- Restaurant, Driver, and Agent portals require login
- Customer browsing (restaurants, menus) works without login
- Cart and ordering require login (prompt login when adding to cart if not authenticated)
- JWT stored in httpOnly cookie or localStorage
- Auto-redirect to login if token expired

### 7.2 Loading States

- Use skeleton screens (not spinners) for content areas
- Skeleton should match the layout of the actual content
- Show skeleton for minimum 300ms to avoid flash

### 7.3 Error Handling

- Network errors: show retry button with error message
- 401/403: redirect to login
- 404: show "not found" page
- 500: show generic error with support contact
- Form validation: inline errors below fields, real-time validation

### 7.4 Empty States

Every list/grid page needs a meaningful empty state:
- Restaurants: "No restaurants in your area yet"
- Orders: "No orders yet. Browse restaurants to get started!"
- Deliveries: "No deliveries available. Stay online!"
- Cart: "Your cart is empty. Browse restaurants."
- Reviews: "No reviews yet"

### 7.5 Notifications & Feedback

- Toast notifications for actions (order placed, delivery accepted, etc.)
- Sound notification for new orders (restaurant portal)
- Confirmation dialogs for destructive actions (cancel order, delete menu item)
- Success/error feedback for all form submissions

### 7.6 Real-time Updates

- Order status changes: WebSocket or polling every 10s
- Delivery location: WebSocket every 5s during active delivery
- New order notifications: WebSocket to restaurant portal
- Chat messages: Socket.IO (already implemented)

### 7.7 Accessibility

- All interactive elements must be keyboard accessible
- Proper ARIA labels on icons and buttons
- Color contrast meeting WCAG AA
- Focus management on modals and dialogs

---

## 8. Non-functional Requirements

### 8.1 Performance
- First Contentful Paint < 1.5s
- API response time < 500ms (p95)
- Image lazy loading for restaurant/menu images
- Pagination for all list endpoints (20 items per page)

### 8.2 Security
- Passwords hashed with BCrypt (min 10 rounds)
- JWT expiration: 24 hours
- Input sanitization on all endpoints
- CORS restricted to known frontend origins
- Rate limiting on auth endpoints (5 req/min)
- No secrets in frontend code

### 8.3 Reliability
- Health check endpoints on all services (`/health` or `/api/{service}/health`)
- Graceful degradation: if a service is down, show appropriate error (not crash)
- Database connection pooling
- RabbitMQ message acknowledgment and retry

### 8.4 Observability
- Structured logging (JSON) on all services
- Request ID propagation through API gateway
- Error tracking with stack traces

---

## 9. Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_CHAT_SERVICE_URL=http://localhost:8087
```

### Backend (docker-compose)
```
POSTGRES_USER=zomato
POSTGRES_PASSWORD=zomato_secret
MONGO_USER=zomato
MONGO_PASSWORD=zomato_secret
REDIS_PASSWORD=zomato_secret
RABBITMQ_USER=zomato
RABBITMQ_PASSWORD=zomato_secret
JWT_SECRET=zomato-jwt-secret-change-in-production
ANTHROPIC_API_KEY=<optional, for AI chat>
```

---

## 10. Development Guidelines

1. **No mock/dummy data**: All frontend data comes from APIs. If an API doesn't exist yet, build it.
2. **Type safety**: TypeScript strict mode. Define interfaces for all API responses.
3. **Error boundaries**: Wrap route segments in error boundaries.
4. **Consistent styling**: Tailwind CSS. Follow existing color palette (red-500 primary, zinc for dark mode).
5. **Component reuse**: Extract shared UI into `src/components/` (buttons, cards, skeletons, modals).
6. **API layer**: All API calls go through `src/services/api.ts`. Never call fetch directly in components.
7. **State management**: AppContext for cart/auth. Server state via API calls (no global store for server data).
8. **Git**: Feature branches, descriptive commits, no force-push to main.
