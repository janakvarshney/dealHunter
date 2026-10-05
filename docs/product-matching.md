# DealHunter — Product Matching Architecture

> See [ADR-004](decisions/ADR-004-product-matching.md) for the architectural decision.  
> **Status:** Draft — implemented in Phase 4 | **Last Updated:** 2026-10-05

---

## The Problem

Different marketplaces represent the same physical product differently:

```
Amazon:   "Apple iPhone 16 256GB - Black (2024)"
Flipkart: "APPLE iPhone16 256 GB Black"
Croma:    "Apple iPhone 16 (256GB, Black)"
```

The matching engine must determine that these are the same product variant — while also correctly determining that "iPhone 16 512GB Black" is a DIFFERENT variant.

---

## Pipeline

```
Raw ProductOffer
    │
    ▼
[1] Text Normalization
    → lowercase, strip punctuation, standardize units
    "Apple iPhone16 256 GB" → "apple iphone 16 256gb"

    │
    ▼
[2] Attribute Extraction
    → brand: "apple"
    → model: "iphone 16"
    → storage: "256gb"
    → color: "black"
    → ram: null (phone RAM not specified)
    
    │
    ▼
[3] Identifier Lookup (Stage 1 — Definitive)
    → Does this offer have GTIN/EAN/UPC/MPN?
    → YES: Query ProductIdentifier table for exact match
    → MATCH: confidence = 1.0 (DEFINITIVE)
    → NO/NO MATCH: proceed to Stage 2
    
    │
    ▼
[4] Structured Attribute Match (Stage 2 — High confidence)
    → brand match (exact after normalization): ✓
    → model match (normalized): ✓
    → storage match (exact): ✓
    → color match (fuzzy allowed): ✓
    → ALL CRITICAL ATTRIBUTES MATCH: confidence = 0.90 (HIGH)
    → ANY CRITICAL ATTRIBUTE MISMATCH: NO_MATCH
    
    │
    ▼
[5] Fuzzy Title Match (Stage 3 — Medium confidence, fallback)
    → Token Sort Ratio on [brand + model tokens]
    → Ratio > 0.85 AND storage values identical
    → confidence = 0.75 (MEDIUM)
    
    │
    ▼
[6] Confidence Decision
    → DEFINITIVE (1.0): group as same product
    → HIGH (0.90): group as same product  
    → MEDIUM (0.75): group, mark as "probable match"
    → LOW (<0.75): do NOT group
```

---

## Key Rules

1. **Storage values must match exactly** — 256GB ≠ 512GB regardless of title similarity
2. **RAM must match exactly** — for phones and laptops
3. **Brand must match exactly** (after normalization)
4. **Model must match** — fuzzy allowed in Stage 3 only
5. **Color mismatch is NOT disqualifying** — some offers don't specify color

---

## Attribute Extraction Details

### Brand Extraction
```typescript
// Match against a known brand dictionary:
const KNOWN_BRANDS = ['apple', 'samsung', 'google', 'oneplus', 'xiaomi', 'realme', ...];
// Find first token that matches a known brand (case-insensitive)
```

### Storage Extraction
```typescript
// Regex: match "256GB", "256 GB", "256gb", "256 gb"
const STORAGE_REGEX = /(\d+)\s*(?:gb|tb)/gi;
// Normalize: "512 GB" → "512GB"
```

### Color Extraction
```typescript
// Match against known color list:
const KNOWN_COLORS = ['black', 'white', 'blue', 'red', 'green', 'midnight', 'starlight', ...];
// Find color tokens in title
```

---

## False Positive Prevention

The system applies **hard stops** — conditions that immediately result in NO_MATCH regardless of title similarity:

| Attribute | Hard Stop |
|---|---|
| Storage | Different storage values → NO_MATCH |
| RAM | Different RAM values → NO_MATCH |
| Brand | Different brand → NO_MATCH |
| Generation/Year | Clear generation mismatch → NO_MATCH |

---

## Confidence Score Interpretation

| Score | Label | Action |
|---|---|---|
| 1.0 | DEFINITIVE | Group. Show "Same product" |
| 0.9 | HIGH | Group. No special indicator |
| 0.75 | MEDIUM | Group. Show "Prices may be for similar products" |
| <0.75 | LOW | Do not group. Show as separate product |

---

*Implementation will be added in Phase 4.*
