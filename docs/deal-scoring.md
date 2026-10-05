# DealHunter — Deal Scoring Engine

> See [ADR-005](decisions/ADR-005-deal-scoring.md) for the architectural decision.  
> **Status:** Draft — implemented in Phase 5 | **Last Updated:** 2026-10-05

---

## Overview

The Deal Scoring Engine takes a group of matched offers for the same product and produces:
1. A **True Cost** for each offer
2. A **Deal Score** (0–100) for each offer  
3. A **Deal Explanation** for the recommended offer
4. A **Best Deal** recommendation

---

## Step 1: True Cost

```
True Cost = Discounted Price
          + Shipping Cost
          − Instant Discount (if confirmed)
          − Valid Coupon Value (if confirmed)
          − Cashback (if confirmed)
```

### Rules
- **Only subtract confirmed, currently valid discounts**
- If shipping cost is unknown → treat as 0 but flag the offer
- Never subtract "potential" cashback that requires a specific bank card

### Example
```
Amazon offer:
  Listed Price:     ₹79,900
  Discounted Price: ₹77,900 (₹2,000 instant discount applied)
  Shipping:         ₹0 (free)
  Extra coupon:     ₹500 (confirmed HDFC card offer — NOT subtracted, uncertain)
  
  True Cost = ₹77,900 + ₹0 = ₹77,900
  Listed Cost = ₹79,900
  Note: "Additional ₹500 off with HDFC cards — verify at checkout"
```

---

## Step 2: Factor Normalization

Each offer is scored relative to other offers for the same product (min-max normalization):

```typescript
// Price score: lower true cost = higher score
priceScore = 1 - (trueCost - minTrueCost) / (maxTrueCost - minTrueCost)

// When only 1 offer exists: priceScore = 1.0

// Seller score: rating × review_count_weight
sellerScore = (sellerRating / 5.0) * reviewCountWeight(reviewCount)
// reviewCountWeight: log10(reviewCount + 1) / log10(10001) — normalizes review count to 0-1

// Product rating score
productRatingScore = productRating / 5.0

// Delivery score: faster = higher
deliveryScore = 1 - (deliveryDays - minDeliveryDays) / (maxDeliveryDays - minDeliveryDays)

// Return policy score
returnScore = Math.min(returnDays / 30, 1.0)

// Price history score: below 30-day average = higher
historyScore = trueCost < avg30dPrice
  ? 1 - (trueCost / avg30dPrice)  // reward: how far below average
  : 0                              // at or above average: no bonus
```

### Missing Data Handling

| Missing Data | Default Score | Reason |
|---|---|---|
| Delivery estimate | 0.5 | Neutral — no penalty, no bonus |
| Return policy | 0.5 | Neutral |
| Price history | 0.5 | Neutral |
| Seller rating | 0.5 | Neutral |
| Seller review count | 0.5 | Neutral |

---

## Step 3: Weighted Sum

```typescript
const weights = {
  price:    0.35,
  seller:   0.20,
  rating:   0.15,
  delivery: 0.15,
  returns:  0.10,
  history:  0.05,
};

const dealScore = (
  priceScore    * weights.price    +
  sellerScore   * weights.seller   +
  ratingScore   * weights.rating   +
  deliveryScore * weights.delivery +
  returnScore   * weights.returns  +
  historyScore  * weights.history
) * 100;
```

**Score range:** 0–100  
**Display:** Rounded to nearest integer

---

## Step 4: Deal Explanation

Generated for the highest-scoring offer:

```typescript
interface DealExplanation {
  score: number;
  bestOfferSource: SourceName;
  factors: ExplanationFactor[];
}

interface ExplanationFactor {
  factor: string;
  icon: '✓' | '~' | '✗';
  label: string;
  detail: string;
}
```

Example output:
```
Deal Score: 91 / 100

✓ Best price — ₹77,200 effective cost (lowest among 4 offers)
✓ Trusted seller — CloudTail India · 4.8★ · 12,400+ reviews
✓ Strong product rating — 4.6 stars from 8,200 reviews
✓ Fast delivery — Arrives in 1 day (estimated)
~ Return policy — 10-day return window (standard)
✓ Price alert — 8% below 30-day average (avg: ₹83,900)
```

---

## Seller Penalty Rules

| Condition | Penalty |
|---|---|
| Seller rating < 3.0 | Multiply final score × 0.7 |
| Seller review count < 10 | Multiply seller_score × 0.5 |
| Product out of stock | Score = 0 (excluded from ranking) |

---

## Configuration

Default weights are in `backend/src/ranking/config.ts` and can be overridden via environment variables:

```bash
WEIGHT_PRICE=0.35
WEIGHT_SELLER=0.20
WEIGHT_RATING=0.15
WEIGHT_DELIVERY=0.15
WEIGHT_RETURNS=0.10
WEIGHT_HISTORY=0.05
```

---

*Implementation will be added in Phase 5.*
