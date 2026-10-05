# DealHunter — Database Schema

> **Status:** Draft — to be finalized in Phase 1 | **Last Updated:** 2026-10-05

This document explains the database design decisions. The Prisma schema will be the authoritative source of truth once Phase 1 begins.

---

## Design Principles

1. **Normalize data** — avoid redundancy where joins are cheap
2. **Denormalize selectively** — only when query performance demands it
3. **Append-only for history** — PriceHistory is never updated, only inserted
4. **JSONB for flexible attributes** — product specs differ by category
5. **UUID primary keys** — avoids sequential ID enumeration attacks
6. **Timestamps everywhere** — `created_at` and `updated_at` on all entities

---

## Entity Relationship Overview

```
Category (1) ──────────── (N) Product
                                  │
                         (1)──────┘
                                  │
                Product (1) ─── (N) ProductVariant
                                        │
                                (1)─────┘
                                        │
                 ┌──────────────────────┼──────────────────────┐
                 │                      │                       │
                 ▼                      ▼                       ▼
         ProductIdentifier      ProductAttribute         ProductImage
         (GTIN, EAN, UPC,       (key-value specs)       (image URLs)
          MPN, ISBN)
                 
                 ProductVariant (1) ── (N) ProductOffer
                                               │
                         ┌─────────────────────┼──────────────────────┐
                         │                     │                      │
                         ▼                     ▼                      ▼
                      Merchant             PriceHistory            DealScore
                         │
                     (1)─┘
                         │
                      Seller

User (1) ──────────── (N) WishlistItem ───── (1) ProductVariant
User (1) ──────────── (N) PriceAlert ──────── (1) ProductVariant
User (1) ──────────── (N) SearchQuery
```

---

## Entity Definitions

### User
```
id            UUID PK
email         VARCHAR(255) UNIQUE NOT NULL
password_hash VARCHAR(255) NOT NULL
name          VARCHAR(255)
created_at    TIMESTAMP
updated_at    TIMESTAMP
```

### Category
```
id          UUID PK
name        VARCHAR(100) NOT NULL
slug        VARCHAR(100) UNIQUE NOT NULL
parent_id   UUID FK → Category (for hierarchical categories)
created_at  TIMESTAMP
```

### Product (base product — not variant-specific)
```
id              UUID PK
category_id     UUID FK → Category
brand           VARCHAR(100)
name            VARCHAR(500)          -- Base product name (e.g., "Apple iPhone 16")
description     TEXT
search_vector   TSVECTOR              -- For PostgreSQL full-text search
created_at      TIMESTAMP
updated_at      TIMESTAMP

INDEXES:
  GIN(search_vector)                  -- Full-text search
  BTREE(brand)                        -- Filter by brand
  BTREE(category_id)                  -- Filter by category
```

### ProductVariant (specific variant — what is actually bought)
```
id              UUID PK
product_id      UUID FK → Product
name            VARCHAR(500)          -- Full variant name (e.g., "Apple iPhone 16 256GB Midnight")
storage         VARCHAR(50)           -- e.g., "256GB"
ram             VARCHAR(50)           -- e.g., "8GB"
color           VARCHAR(100)          -- e.g., "Midnight Black"
size            VARCHAR(50)           -- For appliances
attributes      JSONB                 -- Flexible additional attributes
created_at      TIMESTAMP
updated_at      TIMESTAMP

INDEXES:
  BTREE(product_id)
```

### ProductIdentifier (for deterministic matching)
```
id              UUID PK
variant_id      UUID FK → ProductVariant
type            ENUM('gtin', 'ean', 'upc', 'mpn', 'isbn', 'asin')
value           VARCHAR(100) NOT NULL
source          VARCHAR(100)          -- Which source provided this identifier
created_at      TIMESTAMP

UNIQUE(type, value)                   -- An EAN is unique globally
INDEXES:
  BTREE(value)                        -- Fast identifier lookup
  BTREE(type, value)
```

### Merchant (e.g., "Amazon.in")
```
id              UUID PK
name            VARCHAR(100) UNIQUE NOT NULL
slug            VARCHAR(100) UNIQUE NOT NULL  -- e.g., "amazon_in"
logo_url        VARCHAR(500)
base_url        VARCHAR(500)
is_active       BOOLEAN DEFAULT TRUE
created_at      TIMESTAMP
```

### Seller (e.g., "Cloudtail India" on Amazon)
```
id              UUID PK
merchant_id     UUID FK → Merchant
external_id     VARCHAR(200)          -- Platform's seller ID
name            VARCHAR(300)
rating          DECIMAL(3,2)          -- 0.00 to 5.00
review_count    INT DEFAULT 0
created_at      TIMESTAMP
updated_at      TIMESTAMP

INDEXES:
  BTREE(merchant_id)
```

### ProductOffer (one row per variant per source, updated on each refresh)
```
id                  UUID PK
variant_id          UUID FK → ProductVariant
merchant_id         UUID FK → Merchant
seller_id           UUID FK → Seller (nullable)
external_product_id VARCHAR(500)      -- Platform's product ID
product_url         VARCHAR(1000)
listed_price        DECIMAL(12,2)     -- MRP
discounted_price    DECIMAL(12,2)     -- Current selling price
discount_percent    DECIMAL(5,2)
shipping_cost       DECIMAL(10,2) DEFAULT 0
is_free_delivery    BOOLEAN DEFAULT FALSE
availability        ENUM('in_stock', 'out_of_stock', 'limited_stock', 'unknown')
product_rating      DECIMAL(3,2)
review_count        INT DEFAULT 0
delivery_days       SMALLINT
return_policy_days  SMALLINT DEFAULT 0
fetched_at          TIMESTAMP NOT NULL
expires_at          TIMESTAMP            -- When this data should be re-fetched
raw_data            JSONB                -- Original connector response (for debugging)

INDEXES:
  BTREE(variant_id)
  BTREE(merchant_id)
  BTREE(fetched_at)
  BTREE(discounted_price)              -- Price range queries
```

### PriceHistory (append-only time-series)
```
id                UUID PK
offer_id          UUID FK → ProductOffer
price             DECIMAL(12,2) NOT NULL
shipping_cost     DECIMAL(10,2) DEFAULT 0
availability      ENUM
recorded_at       TIMESTAMP NOT NULL

-- NO updated_at — this table is APPEND ONLY
INDEXES:
  BTREE(offer_id, recorded_at)        -- Range queries: "price in last 30 days"
  BRIN(recorded_at)                    -- Efficient for time-series range scans
```

**Why append-only?**
Price history must be immutable. If we UPDATE rows, we lose history. The pattern is: INSERT a new row every time the price is checked.

### DealScore (cached, recalculated by background worker)
```
id                UUID PK
offer_id          UUID FK → ProductOffer UNIQUE  -- One score per offer
score             DECIMAL(5,2)          -- 0.00 to 100.00
true_cost         DECIMAL(12,2)
price_score       DECIMAL(5,4)
seller_score      DECIMAL(5,4)
rating_score      DECIMAL(5,4)
delivery_score    DECIMAL(5,4)
return_score      DECIMAL(5,4)
history_score     DECIMAL(5,4)
explanation       JSONB                 -- Itemized explanation for UI
calculated_at     TIMESTAMP NOT NULL

INDEXES:
  BTREE(offer_id)
  BTREE(score DESC)                    -- Sort by best deal
```

### WishlistItem
```
id              UUID PK
user_id         UUID FK → User
variant_id      UUID FK → ProductVariant
added_at        TIMESTAMP NOT NULL

UNIQUE(user_id, variant_id)           -- Can't add same product twice
```

### SearchQuery (analytics)
```
id              UUID PK
user_id         UUID FK → User (nullable — anonymous users)
query           TEXT NOT NULL
result_count    INT
response_ms     INT                   -- Latency tracking
created_at      TIMESTAMP
```

---

## Normalization Decisions

### Why separate Product and ProductVariant?

The iPhone 16 as a product has one description, one brand, one set of reviews. But it comes in 256GB Black, 512GB Blue, 1TB White — each a different variant with a different price. Separating them avoids:
- Storing the same brand/description 6 times
- Update anomalies when a product description changes

### Why JSONB for attributes?

A phone has "storage", "RAM", "display". A TV has "screen_size", "panel_type", "refresh_rate". A laptop has "processor", "graphics_card", "battery_life". These differ by category. JSONB lets us store arbitrary key-value pairs without adding 50 nullable columns.

The JSONB column is indexed with a GIN index so attribute queries (e.g., "storage = 256GB") remain efficient.

### Why UUID primary keys?

- Not guessable (no `/api/users/1`, `/api/users/2` enumeration)
- Safe to expose in URLs
- Better for future distributed architectures

Trade-off: Slightly larger than integers, and random UUIDs can cause index fragmentation. Use UUID v7 (time-sortable) or `gen_random_uuid()` in PostgreSQL.

---

## Indexing Strategy

| Table | Index | Query Pattern |
|---|---|---|
| Product | GIN(search_vector) | Full-text search |
| Product | BTREE(brand) | Filter by brand |
| ProductOffer | BTREE(variant_id) | Get all offers for a variant |
| ProductOffer | BTREE(discounted_price) | Price range filter |
| PriceHistory | BTREE(offer_id, recorded_at) | Price history over time |
| PriceHistory | BRIN(recorded_at) | Recent price queries |
| DealScore | BTREE(score DESC) | Sort by best deal |
| ProductIdentifier | BTREE(type, value) | Identifier lookup for matching |

---

*Full Prisma schema will be committed in Phase 1.*
