# DealHunter — System Architecture

> **Status:** Living document | **Last Updated:** 2026-10-05

This document provides a deep-dive into the DealHunter system architecture. For the high-level overview, see [README.md](../README.md#5-architecture-overview).

---

## System Components

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           CLIENT TIER                                    │
│                                                                          │
│    Browser                                                               │
│    ┌────────────────────────────────────────────────────────────────┐    │
│    │  React 18 + TypeScript + Vite                                  │    │
│    │  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────┐  │    │
│    │  │  Pages   │  │ TanStack     │  │ Zustand  │  │ Tailwind │  │    │
│    │  │  /search │  │ Query        │  │  Store   │  │   CSS    │  │    │
│    │  │  /product│  │ (server      │  │ (client  │  │          │  │    │
│    │  │  /wish.. │  │  state)      │  │  state)  │  │          │  │    │
│    │  └──────────┘  └──────────────┘  └──────────┘  └──────────┘  │    │
│    └────────────────────────────────────────────────────────────────┘    │
└───────────────────────────┬──────────────────────────────────────────────┘
                            │ HTTPS / REST API
                            │
┌───────────────────────────▼──────────────────────────────────────────────┐
│                         APPLICATION TIER                                 │
│                                                                          │
│    Node.js + Express.js + TypeScript                                     │
│                                                                          │
│    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│    │  Router  │→ │Controller│→ │ Service  │→ │Repository│              │
│    │  (routes)│  │(handlers)│  │(business │  │(DB access│              │
│    │          │  │          │  │ logic)   │  │ via ORM) │              │
│    └──────────┘  └──────────┘  └──────────┘  └──────────┘              │
│                                      │                                   │
│                     ┌────────────────┼────────────────┐                 │
│                     ▼                ▼                 ▼                 │
│               ┌──────────┐  ┌──────────────┐  ┌──────────┐             │
│               │Connectors│  │   Matching   │  │  Ranking │             │
│               │(data src)│  │   Engine     │  │  Engine  │             │
│               └──────────┘  └──────────────┘  └──────────┘             │
│                                                      │                   │
│                                              ┌───────▼──────┐           │
│                                              │  AI / Gemini │           │
│                                              └──────────────┘           │
└──────────────────┬───────────────────────────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────────────────────────┐
│                           DATA TIER                                      │
│                                                                          │
│    ┌─────────────────────────────┐    ┌──────────────────────────┐      │
│    │        PostgreSQL           │    │          Redis            │      │
│    │   (Prisma ORM)              │    │                          │      │
│    │                             │    │  - Search result cache   │      │
│    │  - Products & Variants      │    │  - Product detail cache  │      │
│    │  - Offers & PriceHistory    │    │  - Rate limiting         │      │
│    │  - Users & Wishlists        │    │  - Session (future)      │      │
│    │  - DealScores               │    │                          │      │
│    └─────────────────────────────┘    └──────────────────────────┘      │
└──────────────────────────────────────────────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────────────────────────┐
│                       BACKGROUND WORKERS                                 │
│                                                                          │
│    node-cron (MVP) → BullMQ (Phase 2)                                   │
│                                                                          │
│    - Price refresh (every 30 min)                                        │
│    - Deal score recalculation (triggered by price refresh)               │
│    - Price history recording                                             │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Request Flow: Product Search

```
1. User types "iPhone 16 256GB" in search bar
2. Frontend calls POST /api/search with query
3. Express router → SearchController.search()
4. SearchService:
   a. Check Redis cache → HIT: return cached results
   b. MISS: proceed
   c. (Optional) Call Gemini to parse query → structured params
   d. Call ConnectorRegistry.search(query, params)
   e. ConnectorRegistry dispatches to all active connectors (parallel)
   f. Each connector returns ProductOffer[]
   g. ProductMatchingEngine.group(offers) → grouped by product
   h. DealScoringEngine.score(groups) → adds DealScore to each offer
   i. Sort by DealScore descending
   j. Store result in Redis (TTL: 5 min)
   k. Return to controller
5. Controller formats response → sends to frontend
6. Frontend displays results via TanStack Query
```

---

## Layered Architecture

DealHunter uses a strict 4-layer architecture:

```
Route → Controller → Service → Repository
```

| Layer | Responsibility | Example |
|---|---|---|
| **Route** | URL mapping, middleware application | `router.post('/search', auth?, searchController.search)` |
| **Controller** | Request parsing, response formatting, HTTP concerns | Parse query params, call service, format response |
| **Service** | Business logic, orchestration | Coordinate connectors, matching, scoring |
| **Repository** | Database access only (via Prisma) | `prisma.product.findMany(...)` |

**Rules:**
- Controllers do NOT call repositories directly
- Services do NOT know about HTTP (no req/res objects)
- Repositories do NOT contain business logic
- This separation makes each layer independently testable

---

## Error Handling Architecture

```
Error occurs in any layer
    │
    ▼
Error is thrown as typed AppError (e.g., NotFoundError, ValidationError)
    │
    ▼
Express error handling middleware catches it
    │
    ▼
Formats consistent JSON error response:
{
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product with id '123' not found",
    "statusCode": 404,
    "requestId": "req_abc123"
  }
}
```

---

## Connector Fault Isolation

```
ConnectorRegistry.search(query)
    │
    ├──→ AmazonConnector.search()    → Success: [offer1, offer2]
    ├──→ FlipkartConnector.search()  → Timeout after 5s → Error logged, empty array returned
    └──→ CromaConnector.search()     → Success: [offer3]
    │
    ▼
Result: [offer1, offer2, offer3] + { failedSources: ['flipkart'] }
```

The API response includes a `warnings` field listing failed sources, so the frontend can show "Flipkart: Temporarily unavailable."

---

## Data Flow Diagram

```
External Source (Mock)
    │
    ▼
Connector (source-specific)
    │
    ▼  normalize()
ProductOffer (common schema)
    │
    ▼  group()
MatchedProductGroup
    │
    ▼  score()
ScoredOffer (with DealScore + TrueCost)
    │
    ├──→ Database (PostgreSQL) → PriceHistory record
    │
    └──→ Redis Cache
    │
    ▼
API Response → Frontend
```

---

*This document is updated as the system evolves.*
