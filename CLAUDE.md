# Zomato Clone - Claude Instructions

## Mandatory: Read spec.md First

Before creating or editing ANY file in this project, you MUST read and follow `/spec.md`.
The spec defines all data models, API contracts, frontend requirements, and UX standards.

## Key Rules

1. **No dummy/mock/static data** in frontend pages. All data comes from backend APIs.
2. **All API calls** go through `frontend/src/services/api.ts` — never call fetch directly in components.
3. **Every page** must have loading skeleton, error state, and empty state.
4. **Authentication** is required for all write operations and portals (except customer browsing).
5. **Chat/support conversations** are persisted in MongoDB. Admin can view all incidents (open + closed).

## Architecture

- Microservices: user (8081), restaurant (8082), order (8083), delivery (8084), payment (8085), notification (8086), chat (8087)
- API Gateway: 8080 (all frontend API calls route through here)
- Frontends: customer (3000), restaurant (3001), driver (3002), agent (3003)

## Tech Stack

- Frontend: Next.js + TypeScript + Tailwind CSS
- Java services: Spring Boot 3 + PostgreSQL
- Node services: Express + TypeScript + MongoDB/PostgreSQL
- Messaging: RabbitMQ
- Real-time: Socket.IO (chat service)
- Cache: Redis
