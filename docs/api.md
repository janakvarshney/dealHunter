# DealHunter — API Reference

> **Status:** Draft — expanded in Phase 6 | **Last Updated:** 2026-10-05

---

## API Design Principles

1. **REST** — resource-oriented URLs
2. **Consistent response shape** — all responses follow the same envelope
3. **Validation errors are structured** — Zod errors returned as field-level messages
4. **Pagination on all list endpoints** — cursor-based (Phase 2) or offset-based (MVP)
5. **Rate limited** — all endpoints, stricter limits on AI endpoints
6. **Versioned** — `/api/v1/` prefix (future-proof)

---

## Response Envelope

### Success
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "requestId": "req_abc123",
    "responseMs": 245
  }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "query": "Required",
      "minPrice": "Expected number, received string"
    },
    "requestId": "req_abc123"
  }
}
```

### Partial Success (connector failures)
```json
{
  "success": true,
  "data": { "offers": [...] },
  "warnings": [
    { "source": "flipkart", "message": "Temporarily unavailable" }
  ]
}
```

---

## Error Codes

| Code | HTTP Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request body/params failed Zod validation |
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Valid JWT but insufficient permission |
| `NOT_FOUND` | 404 | Resource does not exist |
| `RATE_LIMITED` | 429 | Too many requests |
| `AI_UNAVAILABLE` | 503 | Gemini API unavailable or key missing |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Endpoints

### Health

#### `GET /api/health`
Returns system health status.

**Response:**
```json
{
  "status": "ok",
  "database": "ok",
  "redis": "ok",
  "connectors": {
    "amazon_in": "ok",
    "flipkart": "ok",
    "croma": "ok"
  },
  "version": "0.1.0"
}
```

---

### Search

#### `POST /api/search`
Keyword product search with filters.

**Auth:** Not required

**Request body:**
```json
{
  "query": "iPhone 16 256GB",
  "page": 1,
  "limit": 20,
  "filters": {
    "minPrice": 50000,
    "maxPrice": 100000,
    "brands": ["Apple"],
    "sources": ["amazon_in", "flipkart"],
    "minRating": 4.0,
    "inStockOnly": true,
    "category": "electronics"
  },
  "sortBy": "deal_score",
  "sortOrder": "desc"
}
```

**Sort options:** `deal_score` | `price_asc` | `price_desc` | `rating` | `delivery_speed` | `discount`

**Response:** `ProductSearchResult[]` with DealScore

---

#### `POST /api/ai/search`
Natural language product search via Gemini.

**Auth:** Not required  
**Rate limit:** 5/minute per IP

**Request body:**
```json
{
  "query": "laptop under 90000 for gaming and development, good battery life"
}
```

**Response:**
```json
{
  "parsedQuery": {
    "category": "laptop",
    "maxBudget": 90000,
    "useCases": ["gaming", "software_development"],
    "preferences": { "battery": "high", "performance": "high" }
  },
  "results": [ ... ]
}
```

---

### Products

#### `GET /api/products/:id`
Get product detail with all offers and best deal.

**Auth:** Not required

**Response:**
```json
{
  "product": {
    "id": "uuid",
    "name": "Apple iPhone 16",
    "brand": "Apple",
    "category": "smartphones",
    "variants": [ ... ]
  },
  "bestOffer": { ... },
  "allOffers": [ ... ],
  "dealExplanation": {
    "score": 91,
    "factors": [
      { "factor": "price", "label": "Lowest effective price", "score": 0.95, "icon": "✓" },
      { "factor": "seller", "label": "Trusted seller (4.8★)", "score": 0.96, "icon": "✓" }
    ]
  }
}
```

---

#### `GET /api/products/:id/offers`
Get all offers for a specific product variant.

**Query params:** `?variantId=uuid&sortBy=deal_score`

---

#### `GET /api/products/:id/price-history`
Get price history for a product variant.

**Query params:** `?variantId=uuid&source=amazon_in&days=30`

**Response:**
```json
{
  "variantId": "uuid",
  "history": [
    { "date": "2024-09-01", "price": 79900, "source": "amazon_in" },
    { "date": "2024-09-05", "price": 77900, "source": "amazon_in" }
  ],
  "stats": {
    "currentPrice": 77900,
    "avgPrice30d": 79200,
    "minPrice30d": 75000,
    "maxPrice30d": 82000,
    "isBelowAverage": true,
    "percentBelowAverage": 1.6
  }
}
```

---

#### `GET /api/deals`
Get featured / trending deals.

**Query params:** `?category=electronics&limit=10`

---

### Authentication

#### `POST /api/auth/signup`
Create a new user account.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123!",
  "name": "Priya Sharma"
}
```

**Validation:**
- Email: valid format, max 255 chars
- Password: min 8 chars, max 72 chars (bcrypt limit)
- Name: max 255 chars

---

#### `POST /api/auth/login`
Login and receive JWT cookie.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123!"
}
```

**Response:** Sets `dh_access_token` httpOnly cookie. Returns user info (no token in body).

---

#### `POST /api/auth/logout`
**Auth:** Required  
Clears the JWT cookie.

---

#### `GET /api/auth/me`
**Auth:** Required  
Returns current authenticated user info.

---

### Wishlist

#### `GET /api/wishlist`
**Auth:** Required  
Get authenticated user's wishlist with current best deal for each item.

---

#### `POST /api/wishlist`
**Auth:** Required  
Add product variant to wishlist.

**Request body:**
```json
{
  "variantId": "uuid"
}
```

---

#### `DELETE /api/wishlist/:itemId`
**Auth:** Required  
Remove item from wishlist.

---

## Pagination

MVP uses offset-based pagination:

```
GET /api/search?page=2&limit=20
→ Returns items 21–40

Response meta:
{
  "page": 2,
  "limit": 20,
  "total": 142,
  "totalPages": 8
}
```

Phase 2: Migrate to cursor-based pagination for better performance on large datasets.

---

## Request IDs

Every request receives a unique `X-Request-ID` header in the response. This is also included in error responses and server logs, enabling correlation between client errors and server logs.

---

*Full OpenAPI specification will be generated in Phase 6.*
