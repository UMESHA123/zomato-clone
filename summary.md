# Zomato Clone - Changes Summary

## Overview

This session focused on three main areas: removing all hardcoded/dummy data from frontend pages, building the admin incident management portal, and ensuring the restaurant creation-to-customer listing flow works correctly.

---

## 1. Dummy Data Removed

All frontend pages now fetch real data from backend APIs. No mock/static data remains.

### Files Changed

| File | What Was Removed | Now Fetches From |
|------|-----------------|------------------|
| `frontend-customer/src/app/orders/page.tsx` | `mockPastOrders` (4 hardcoded orders) | `GET /api/orders` via `refreshOrders()` |
| `frontend-restaurant/src/app/reviews/page.tsx` | `mockReviews` (8 hardcoded reviews) | `GET /api/restaurants/:id/reviews` |
| `frontend-driver/src/app/history/page.tsx` | `mockHistory` (12 hardcoded deliveries) | `GET /api/delivery/history` |
| `frontend-restaurant/src/app/page.tsx` | Hardcoded stats (`todayRevenue=12480`, `todayOrders=34`, `avgRating=4.3`, `avgPrepTime=22`) and "Paradise Biryani" name | `GET /api/restaurants/owner/:id` for name/rating, `GET /api/orders` for revenue/order stats |
| `frontend/src/app/(restaurant)/dashboard/orders/page.tsx` | `mockOrders` (7 hardcoded orders) | `GET /api/orders` with auth headers |

### Improvements Added to Each Page
- Loading skeletons (not spinners) while data fetches
- Error states with retry buttons
- Meaningful empty states with CTAs

---

## 2. Admin Incident Management Pages (New)

Two new pages created in the agent portal (`frontend-agent`):

### `/admin/incidents` — Incident List Page
**File:** `frontend-agent/src/app/admin/incidents/page.tsx`

- **Stats dashboard**: Total today, this week, waiting count, active count, AI resolution rate, avg resolution time
- **Search**: By customer name, email, or subject
- **Filters**: By status (AI/Waiting/Active/Closed) and resolution type (AI Resolved/Agent Resolved/Customer Left/Auto Closed)
- **Pagination**: 20 incidents per page with Previous/Next controls
- **Common issues**: Tag frequency display from backend analytics
- **API endpoints used**: `GET /api/chat/incidents`, `GET /api/chat/incidents/stats`

### `/admin/incidents/:id` — Incident Detail Page
**File:** `frontend-agent/src/app/admin/incidents/[id]/page.tsx`

- **Full conversation transcript**: All messages displayed with sender-specific styling (customer=white, AI=blue, agent=red, system=gray centered)
- **Customer info panel**: Name, email, avatar
- **Incident details**: Subject, status, resolution type, related order ID, message count
- **Agent info**: Assigned agent name
- **Tags**: Category labels from AI auto-tagging
- **Timeline**: Created, last updated, closed timestamps with duration calculation
- **API endpoint used**: `GET /api/chat/incidents/:id`

---

## 3. Navigation & Layout Fixes

| File | Change |
|------|--------|
| `frontend-agent/src/app/page.tsx` | Added "Admin" link in TopBar → navigates to `/admin/incidents` |
| `frontend/src/app/(restaurant)/layout.tsx` | Replaced hardcoded "Paradise Biryani" with dynamic restaurant name fetched from `GET /api/restaurants/owner/:id` |

---

## 4. Second Round: Customer UI Hardcoded Data Cleanup

Additional hardcoded values found and removed from customer-facing pages:

| File | What Was Removed | Replacement |
|------|-----------------|-------------|
| `frontend/src/app/(customer)/cart/page.tsx` | Hardcoded `"ZOMATO20"` coupon validation, `(try ZOMATO20)` placeholder | API call to `POST /api/payments/coupons/validate` with loading/error states |
| `frontend-customer/src/app/checkout/page.tsx` | Hardcoded `"ZOMATO20"` coupon validation, `(try ZOMATO20)` placeholder, `"HSR Layout, Bangalore"` address | API call to `POST /api/payments/coupons/validate`; generic "Your current location" label |
| `frontend-customer/src/app/orders/[id]/page.tsx` | `driverNames` array (5 fake names), hardcoded `"HSR Layout, Bangalore"`, hardcoded `"4.8"` driver rating, hardcoded `tel:+919800000000` | Driver name from `order.driverName`, address from `order.deliveryAddress`, rating only shown if available from API, phone button (no hardcoded number) |
| `frontend/src/app/(customer)/orders/[id]/page.tsx` | Hardcoded `"4.8"` driver rating, hardcoded `tel:+919800000000` phone link | Rating only shown if `order.driverRating` exists, phone changed to button (no hardcoded number) |

---

## 5. Restaurant Creation → Customer Listing Flow

**Status: Working correctly — no backend changes needed.**

The flow:
1. Restaurant owner registers on `frontend-restaurant` (port 3001)
2. `AuthContext.ensureRestaurantProfile()` checks `GET /api/restaurants/owner/:ownerId`
3. If no restaurant exists, creates one via `POST /api/restaurants`
4. Customer browses restaurants on `frontend-customer` (port 3000) or `frontend` (port 3000)
5. `GET /api/restaurants` returns all restaurants including the newly created one

Backend endpoints involved:
- `POST /api/restaurants` → Creates restaurant in PostgreSQL (restaurant-service :8082)
- `GET /api/restaurants` → Returns paginated list of all restaurants
- `GET /api/restaurants/owner/:ownerId` → Returns restaurants owned by a specific user

---

## Architecture Reference

| Component | Port | Purpose |
|-----------|------|---------|
| API Gateway | 8080 | Routes all frontend API calls |
| User Service | 8081 | Auth, registration, profiles (Spring Boot + PostgreSQL) |
| Restaurant Service | 8082 | Restaurant CRUD, menus, reviews (Spring Boot + PostgreSQL) |
| Order Service | 8083 | Order lifecycle (Spring Boot + PostgreSQL) |
| Delivery Service | 8084 | Delivery assignment, tracking (Node/Express + MongoDB) |
| Payment Service | 8085 | Payment processing (Node/Express + PostgreSQL) |
| Notification Service | 8086 | Push notifications (Node/Express + Redis) |
| Chat Service | 8087 | Real-time support chat (Node/Express + Socket.IO + MongoDB) |
| Customer Frontend | 3000 | Customer portal (Next.js) |
| Restaurant Frontend | 3001 | Restaurant owner portal (Next.js) |
| Driver Frontend | 3002 | Driver portal (Next.js) |
| Agent Frontend | 3003 | Support agent + admin portal (Next.js) |
