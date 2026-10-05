# ADR-003: Search Architecture

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-05 |
| **Deciders** | Project owner |
| **Category** | Search |

---

## Context

DealHunter requires product search that:
- Matches user queries against product titles, brands, models, descriptions
- Supports structured filters (brand, price range, category, rating)
- Sorts results by Deal Score, price, rating, delivery
- Handles typos and natural language queries (via AI)
- Is fast enough: <2s for cached, <5s for uncached
- Is operationally simple (MVP has zero budget for infrastructure)

---

## Options Considered

### Option A: PostgreSQL Full-Text Search *(Chosen for MVP)*

PostgreSQL's built-in `tsvector` / `tsquery` system provides full-text search directly in the database.

**How it works:**
```sql
-- Create a search vector column
ALTER TABLE products ADD COLUMN search_vector tsvector;

-- Populate it
UPDATE products SET search_vector = 
  to_tsvector('english', title || ' ' || brand || ' ' || model);

-- Index it
CREATE INDEX products_search_idx ON products USING GIN(search_vector);

-- Query it
SELECT * FROM products 
WHERE search_vector @@ plainto_tsquery('english', 'iPhone 16 256GB')
ORDER BY ts_rank(search_vector, query) DESC;
```

**Pros:**
- Zero additional infrastructure
- Works with Prisma (raw queries)
- Handles stemming, stop words, ranking
- GIN index makes it fast for thousands of products
- Combined with structured filters in a single query

**Cons:**
- Less powerful than Elasticsearch (no fuzzy matching, no synonyms out-of-box)
- Does not scale to millions of documents
- Ranking less sophisticated than BM25

**Scale threshold:** Sufficient for up to ~100,000 product records with a GIN index.

---

### Option B: Elasticsearch / OpenSearch *(Not chosen for MVP)*

**Pros:**
- Industry-standard full-text search
- BM25 ranking (better than PostgreSQL's ts_rank)
- Fuzzy matching, synonyms, autocomplete
- Scales to billions of documents
- Excellent for complex search UX (facets, highlights)

**Cons:**
- Additional service to run, manage, and pay for
- Significant operational complexity
- Overkill for MVP scale (hundreds to thousands of products)
- Requires data synchronization pipeline (PostgreSQL → Elasticsearch)
- Memory-hungry (minimum ~512MB RAM for Elasticsearch)
- Adds latency to the data pipeline: write to PostgreSQL → sync to Elasticsearch

**When to add:** When PostgreSQL FTS becomes the bottleneck (search latency > 200ms consistently, OR product count > 100,000).

---

### Option C: Typesense *(Alternative to Elasticsearch)*

**Pros:**
- Much lighter than Elasticsearch
- Very fast
- Good free tier (Typesense Cloud)
- Easier to operate

**Cons:**
- Still adds operational complexity
- Less battle-tested than Elasticsearch
- Same data sync problem as Elasticsearch

**When to consider:** If Elasticsearch feels too heavy in Phase 2+, Typesense is a good alternative.

---

### Option D: Vector Database (pgvector / Pinecone) *(Not for MVP)*

Vector search enables semantic similarity — finding products that "mean the same thing" even if keywords don't match.

**Use case:** "comfortable gaming chair" should match "ergonomic chair for gamers" even without exact keyword overlap.

**Pros:**
- Semantic understanding
- Works well with Gemini embeddings

**Cons:**
- Requires embedding generation for every product (expensive, slow to build)
- High operational complexity
- Overkill when we have AI query expansion already
- Best combined with keyword search, not as a replacement

**When to consider:** Phase 3+ AI features, when we have enough products to justify embeddings.

---

### Option E: Hybrid Search (Chosen for Phase 2+)

The eventual target architecture:
```
User Query
    │
    ├──→ [Gemini] Natural language → structured attributes
    │
    ├──→ [PostgreSQL FTS] Keyword match on title/brand/model
    │
    ├──→ [Structured Filters] Price range, brand, category
    │
    └──→ [Deal Score Ranking] Sort by intelligence, not just relevance
```

---

## Decision

**MVP:** PostgreSQL Full-Text Search + Structured Filters  
**Phase 2+:** Add Typesense or Elasticsearch when product count exceeds 100,000 or search latency exceeds 200ms

**AI Query Expansion:**
Gemini is used to parse natural language queries into structured attributes *before* hitting PostgreSQL. This compensates for PostgreSQL FTS's lack of semantic understanding, at the cost of an extra LLM call (cached aggressively).

---

## Rationale

1. **YAGNI**: PostgreSQL FTS is sufficient for MVP. Adding Elasticsearch before it's needed introduces operational debt with no benefit.
2. **Simplicity**: One fewer service to run, manage, and debug.
3. **Cost**: Free. Elasticsearch would require paid infrastructure.
4. **AI compensates**: Gemini's query parsing covers the semantic gap that Elasticsearch would otherwise fill.
5. **Clear upgrade path**: When we hit the scale threshold, adding Elasticsearch is a well-understood migration.

---

## Consequences

- ✅ No additional services to manage in MVP
- ✅ Search works with zero extra cost
- ✅ Prisma raw queries give full control over FTS
- ⚠️ Typo tolerance is weaker than Elasticsearch
- ⚠️ No autocomplete/suggest (can add later with PostgreSQL trigram extension)
- ⚠️ Must migrate to Elasticsearch/Typesense before significant scale

---

## Interview Notes

This is an excellent interview discussion point:
> "We started with PostgreSQL full-text search for simplicity. As we scale, we'd add Elasticsearch with a CDC (Change Data Capture) pipeline to keep search index in sync with the primary database. We'd use a hybrid approach: keyword search + vector search + structured filters, with results merged using Reciprocal Rank Fusion."
