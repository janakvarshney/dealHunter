# ADR-005: Deal Scoring Architecture

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-05 |
| **Deciders** | Project owner |
| **Category** | Core Algorithm |

---

## Context

When a user searches for "iPhone 16 256GB", we may have 4–6 offers from different sources:

| Source | Listed Price | Shipping | Discount | Seller Rating | Delivery |
|---|---|---|---|---|---|
| Amazon IN | ₹79,900 | Free | ₹2,000 | 4.8 | 2 days |
| Flipkart | ₹78,500 | ₹99 | ₹1,500 | 4.5 | 3 days |
| Croma | ₹80,000 | Free | ₹3,000 | 4.7 | 1 day |

**The question:** Which is the best deal?

Choosing simply the lowest price is wrong because:
- Flipkart's ₹78,500 + ₹99 shipping = ₹78,599 effective
- Croma's ₹80,000 − ₹3,000 discount + Free shipping = ₹77,000 effective
- Amazon's effective = ₹79,900 − ₹2,000 − Free = ₹77,900

Even after True Cost, Croma wins on price. But:
- If Croma's seller rating were 3.2 (unreliable), the deal is riskier
- If Flipkart delivers in 3 days and the user needs it urgently, that matters
- If the current Croma price is 15% above the 30-day average, it's not actually a discount

**Therefore:** A single-dimension ranking (cheapest price) produces wrong recommendations. We need a multi-factor, transparent, explainable scoring system.

---

## Options Considered

### Option A: Sort by Lowest Price Only *(Not chosen)*
Simple, fast, understandable — but wrong.

**Why rejected:** Ignores shipping, seller quality, historical price context. Users may end up with a "cheap" offer from an unreliable seller with slow delivery.

---

### Option B: Rule-Based Ranking *(Partially incorporated)*
IF cheapest AND seller_rating > 4.0 AND delivery < 5 days → recommend

**Pros:** Fast, explainable, deterministic
**Cons:** Cannot handle continuous trade-offs (e.g., slightly worse price but much better seller)

---

### Option C: Weighted Composite Score *(Chosen)*

Normalize each factor to 0–1, apply configurable weights, sum to get a 0–100 score.

**Pros:**
- Handles continuous trade-offs
- Configurable weights allow product iteration without code changes
- Score is explainable (show contribution of each factor)
- Extends naturally to personalized weights (per-user preferences in Phase 2)
- Industry-standard approach (used by Airbnb, booking.com ranking systems)

**Cons:**
- Weights require tuning (acceptable — they're configurable)
- Not instantly obvious to users how score is calculated (mitigated by transparency panel)

---

### Option D: Machine Learning Ranking *(Not chosen for MVP)*
Train a model to predict user satisfaction based on historical click/purchase data.

**Why rejected:** Requires historical user interaction data that doesn't exist yet. ML ranking is a Phase 3+ feature after real user data is collected.

---

## Decision

**Weighted Composite Deal Score (Option C)**

---

## Formula

### Step 1: True Cost
```
True Cost = Discounted Price 
          + Shipping Cost 
          - Instant Discount 
          - Confirmed Cashback 
          - Valid Coupon Value
```

Rules:
- Only include factors where data is reliably available
- Never subtract a discount that isn't confirmed and currently active
- Clearly label: Listed Price / Discounted Price / True Cost

### Step 2: Factor Score Normalization

Each factor is normalized to [0, 1] using min-max normalization across offers for the same product:

```typescript
// Price score: lower price = higher score
price_score = 1 - (true_cost - min_cost) / (max_cost - min_cost)

// Seller score: higher rating = higher score (with review count weighting)
seller_score = (seller_rating / 5.0) * log_weight(review_count)

// Product rating score
product_rating_score = product_rating / 5.0

// Delivery score: faster = higher score
delivery_score = 1 - (delivery_days - min_days) / (max_days - min_days)

// Return policy score: longer return window = higher score
return_policy_score = min(return_days / 30.0, 1.0)

// Price history score: lower than 30-day average = higher score
history_score = 1 - (true_cost / avg_30d_price)  // clamped to [0, 1]
```

### Step 3: Weighted Sum

```
Deal Score = (
  price_score          × price_weight     (default: 0.35)
  + seller_score       × seller_weight    (default: 0.20)  
  + product_rating_score × rating_weight  (default: 0.15)
  + delivery_score     × delivery_weight  (default: 0.15)
  + return_score       × return_weight    (default: 0.10)
  + history_score      × history_weight   (default: 0.05)
) × 100

// Weights must sum to 1.0
```

### Step 4: Explanation Generation

For each offer, generate an itemized explanation:
```
Deal Score: 87 / 100

✓ Competitive price — 3rd lowest effective price (₹77,200)
✓ Trusted seller — 4.8★ seller with 12,400 reviews
✓ Strong product rating — 4.6★ from 8,200 reviews
✓ Fast delivery — Arrives in 1 day
✓ Good return policy — 10-day returns
✓ Below average price — 8% below 30-day average (₹84,000)
```

---

## Configuration

Weights are defined in `backend/src/ranking/config.ts` and can be overridden via environment variables:

```typescript
export const DEAL_SCORE_WEIGHTS = {
  price:    parseFloat(process.env.WEIGHT_PRICE    ?? '0.35'),
  seller:   parseFloat(process.env.WEIGHT_SELLER   ?? '0.20'),
  rating:   parseFloat(process.env.WEIGHT_RATING   ?? '0.15'),
  delivery: parseFloat(process.env.WEIGHT_DELIVERY ?? '0.15'),
  returns:  parseFloat(process.env.WEIGHT_RETURNS  ?? '0.10'),
  history:  parseFloat(process.env.WEIGHT_HISTORY  ?? '0.05'),
};
```

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Only 1 offer available | Score calculated, but min-max normalization degrades — score becomes 100 (only option) |
| Missing delivery estimate | delivery_score = 0.5 (neutral, no penalty, no bonus) |
| Missing return policy | return_score = 0.5 (neutral) |
| Missing price history | history_score = 0.5 (neutral) |
| Price history incomplete (<7 days) | history_weight factored down proportionally |
| Seller rating below 3.0 | Apply penalty multiplier: score × 0.7 |

---

## Rationale

1. **Price is not everything** (but it's the most important factor at 35%)
2. **Seller quality matters** — buying from a 3-star seller at a lower price is often worse than paying slightly more for a trusted seller
3. **Configurable weights** allow tuning without code changes
4. **Explainability is non-negotiable** — users must understand why a deal was recommended
5. **Graceful degradation** — missing data defaults to neutral (0.5), not zero, to avoid penalizing offers simply for lacking data

---

## Consequences

- ✅ Transparent, explainable recommendations
- ✅ Configurable without code changes
- ✅ Extensible to personalized weights in Phase 2
- ✅ Handles missing data gracefully
- ⚠️ Weight tuning requires A/B testing with real users to validate — will be iterative
- ⚠️ Min-max normalization is sensitive to outliers (a very high-priced offer shifts scores for others) — can address with clipping

---

## Interview Notes

> "We use a weighted composite scoring model with 6 factors. Price has the highest weight at 35%, but we also account for seller reliability, product rating, delivery speed, return policy, and whether the current price is historically favorable. Weights are configurable via environment variables so we can tune them based on user feedback without deploying code. Every score has an itemized explanation so users can see exactly why we made the recommendation."
