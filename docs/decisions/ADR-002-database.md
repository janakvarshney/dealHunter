# ADR-002: Database

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-05 |
| **Deciders** | Project owner |
| **Category** | Data Storage |

---

## Context

DealHunter requires persistent storage for:
- Product catalog (products, variants, attributes, identifiers)
- Offers from multiple sources (prices, availability, sellers)
- Price history (time-series, append-only)
- User accounts, wishlists
- Deal scores (cached calculations)
- Search queries (analytics)

Key storage requirements:
- **Relational data with complex joins** (product → variants → offers → price history → sellers)
- **ACID transactions** (user account creation, wishlist updates)
- **Efficient range queries** (price history over time windows)
- **Full-text search** (product search, initial MVP)
- **Horizontal scale not required at MVP** (Render free tier PostgreSQL is sufficient)

---

## Options Considered

### Option A: PostgreSQL *(Chosen)*
**Pros:**
- ACID-compliant: safe for financial-adjacent data (prices)
- Excellent for complex relational queries (multi-table joins)
- Native full-text search (`tsvector`, `tsquery`) — eliminates Elasticsearch in MVP
- JSONB support for flexible attribute storage (product specs differ by category)
- Strong indexing: B-tree, GIN (for full-text), BRIN (for time-series)
- Widely used in production; excellent interview topic
- Prisma ORM has first-class PostgreSQL support
- Free tier available on Render

**Cons:**
- Horizontal scaling requires read replicas or partitioning (not needed at MVP scale)
- Schema migrations require care

---

### Option B: MongoDB *(Not chosen)*
**Pros:**
- Flexible schema: no migration needed when product attributes vary
- Horizontal sharding built-in
- Natural fit for document-shaped product data

**Cons:**
- No ACID transactions across multiple collections without explicit sessions
- Complex joins are expensive (no native JOIN — requires `$lookup`)
- Full-text search is less powerful than PostgreSQL's tsvector
- Price history as a growing array in a document is an anti-pattern (document growth, performance)
- Interview expectation: relational DB knowledge is more commonly tested

**Why PostgreSQL wins:** The `JSONB` column type gives us MongoDB-like flexibility for product attributes while preserving relational integrity for the rest of the schema.

---

### Option C: MySQL *(Not chosen)*
**Pros:**
- Widely deployed, well-known
- Good performance

**Cons:**
- Weaker full-text search than PostgreSQL
- JSONB support less mature than PostgreSQL
- PostgreSQL is strictly better for this use case

---

### Option D: SQLite *(Not chosen for production)*
SQLite is not suitable for a server-side multi-user application. It uses file-level locking which causes write contention under concurrent requests.

**Acceptable use:** Local development only, but we will use PostgreSQL locally via Docker to match production exactly.

---

## ORM Decision: Prisma

### Options:
- **Prisma** *(Chosen)*: Type-safe query builder, excellent migrations, auto-generated types
- **TypeORM**: More feature-complete but verbose; decorator-based (messy with strict TypeScript)
- **Drizzle**: Very new, lighter, but smaller ecosystem and community
- **Sequelize**: Mature but less TypeScript-native

**Decision:** Prisma. The generated TypeScript types from `prisma generate` eliminate a class of runtime errors. The migration system is clean and predictable.

---

## Decision

**PostgreSQL 15 + Prisma ORM**

With the following design choices:
- UUIDs as primary keys (avoids sequential ID guessing, easier for distributed systems later)
- `created_at` / `updated_at` timestamps on all entities
- `PriceHistory` is append-only (no UPDATE, only INSERT) — time-series pattern
- `JSONB` column for product attributes (flexible, indexed)
- GIN index on full-text search columns
- B-tree indexes on `price`, `brand`, `category` for filter queries

---

## Rationale

1. **ACID compliance** matters for user data (accounts, wishlists).
2. **Relational integrity** is right for this domain — products, variants, offers, and history are deeply related.
3. **Full-text search** via PostgreSQL's `tsvector` eliminates Elasticsearch complexity in MVP.
4. **Prisma** gives type safety that catches bugs at compile time, not runtime.
5. PostgreSQL is the most commonly discussed database in SDE interviews.

---

## Consequences

- ✅ Type-safe database queries
- ✅ Full-text search without additional infrastructure
- ✅ Clean migration history
- ⚠️ PriceHistory table will grow large over time → partition by date range after ~1M rows
- ⚠️ PostgreSQL free tier on Render has 256MB storage limit → prune history older than 90 days

---

## What Would Change at Scale

- **At 10,000 users**: Add read replica. Route read queries to replica.
- **At 100,000 products**: Add Elasticsearch/Typesense for search. Keep PostgreSQL as source of truth.
- **At 1M price records**: Partition `PriceHistory` table by month. Consider TimescaleDB extension.
- **At 1M users**: Introduce connection pooling (PgBouncer). Consider CockroachDB for distributed writes.
