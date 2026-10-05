# DealHunter — Search Architecture

> See [ADR-003](decisions/ADR-003-search.md) for the decision record.  
> **Status:** Draft | **Last Updated:** 2026-10-05

---

## MVP Search: PostgreSQL Full-Text Search

### Why
- Zero additional infrastructure
- Sufficient for thousands of products
- Native to our existing database
- Combined with filters in a single query

### How It Works

PostgreSQL `tsvector` creates a searchable index over product text:

```sql
-- Products have a search_vector column (maintained by trigger)
ALTER TABLE products ADD COLUMN search_vector tsvector;
CREATE INDEX products_search_idx ON products USING GIN(search_vector);

-- Search query
SELECT p.*, ts_rank(p.search_vector, query) AS rank
FROM products p,
     plainto_tsquery('english', $1) query
WHERE p.search_vector @@ query
  AND p.brand = ANY($2::text[])       -- Brand filter
  AND EXISTS (
    SELECT 1 FROM product_offers po
    WHERE po.variant_id IN (
      SELECT id FROM product_variants WHERE product_id = p.id
    )
    AND po.discounted_price BETWEEN $3 AND $4
  )
ORDER BY rank DESC, best_deal_score DESC
LIMIT $5 OFFSET $6;
```

---

## Search Pipeline (with AI)

```
User Query: "laptop for gaming under 90000"
    │
    ▼
[1] AI Query Parser (Gemini — optional)
    Input:  "laptop for gaming under 90000"
    Output: { category: "laptop", maxBudget: 90000, useCases: ["gaming"] }
    │
    ▼
[2] Redis Cache Check
    Key: "search:{sha256(normalized_query + filters)}"
    HIT:  Return cached results immediately
    MISS: Proceed
    │
    ▼
[3] PostgreSQL Full-Text Search
    - Apply search vector against normalized keywords
    - Apply structured filters (category, price range, brand)
    │
    ▼
[4] Offer Aggregation
    - For each matching product variant, fetch best offer + all offers
    - Apply ConnectorRegistry to get fresh offers (or use DB cache)
    │
    ▼
[5] Deal Score Ranking
    - Apply DealScoringEngine to rank offers
    │
    ▼
[6] Redis Cache Store (TTL: 5 minutes)
    │
    ▼
[7] Return paginated results
```

---

## Filter Implementation

Filters are applied as SQL predicates, not post-processing:

| Filter | SQL |
|---|---|
| Price range | `po.discounted_price BETWEEN $min AND $max` |
| Brand | `p.brand = ANY($brands)` |
| Source | `po.merchant_id IN (SELECT id FROM merchants WHERE slug = ANY($sources))` |
| In stock only | `po.availability = 'in_stock'` |
| Min rating | `po.product_rating >= $minRating` |
| Category | `p.category_id IN (SELECT id FROM categories WHERE slug = $category)` |

---

## Cache Key Design

```typescript
function buildCacheKey(query: string, filters: SearchFilters, page: number): string {
  const normalized = {
    q: query.toLowerCase().trim(),
    ...filters,
    page
  };
  const hash = sha256(JSON.stringify(normalized));
  return `search:${hash}`;
}
```

---

## Phase 2+ Upgrade Path

When to add Typesense or Elasticsearch:
- Search latency consistently > 200ms
- Product count > 100,000
- Need: fuzzy matching, synonyms, autocomplete

Migration strategy:
1. Add search engine as additional index (not replacement)
2. Write to PostgreSQL (source of truth) + search engine
3. Read from search engine
4. Verify accuracy → cut over fully

---

*This document will be expanded during Phase 1 and Phase 6.*
