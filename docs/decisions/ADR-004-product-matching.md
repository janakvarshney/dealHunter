# ADR-004: Product Matching Architecture

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-05 |
| **Deciders** | Project owner |
| **Category** | Core Algorithm |

---

## Context

Different marketplaces represent the same physical product differently:

| Source | Listing |
|---|---|
| Amazon IN | "Apple iPhone 16 256GB - Black (2024)" |
| Flipkart | "APPLE iPhone16 256 GB Black" |
| Croma | "Apple iPhone 16 (256GB, Black)" |

The system must reliably determine that these three listings represent the same product variant.

This is the **Product Matching Problem** — one of the hardest problems in e-commerce data engineering.

**Why it's hard:**
- No universal product ID standard across all platforms
- Titles are marketing text, not structured data
- The same product may have different model names in different regions
- Typos, abbreviations, and inconsistent spacing
- Similar products (256GB vs 512GB) must NOT be matched

**Why it's critical:**
- False positives (wrong match) → incorrect price comparison (comparing apples to oranges)
- False negatives (missed match) → fragmented results (showing the same product as 3 separate products)

---

## Options Considered

### Option A: LLM-based Matching Only *(Not chosen)*

Send both listings to an LLM and ask: "Are these the same product?"

**Pros:**
- High accuracy for edge cases
- Handles abbreviations, synonyms naturally

**Cons:**
- Expensive ($0.01+ per comparison — with N products and M sources, this is O(N×M) LLM calls)
- Slow (~1–2 seconds per comparison)
- Non-deterministic (same input may give different output)
- Cannot be run at bulk during indexing without massive cost
- Interview critique: "You're using a sledgehammer for a screw"

**Why rejected:** For deterministic data (brand, storage size, model number), exact matching is faster, cheaper, and more reliable than LLM inference. LLMs add no value when the answer can be computed deterministically.

---

### Option B: Pure Fuzzy String Matching *(Not chosen)*

Use Levenshtein distance or similar string similarity to match titles.

**Pros:**
- Fast
- Works without structured data
- Handles typos

**Cons:**
- High false positive rate: "iPhone 16 256GB Black" vs "iPhone 16 512GB Black" are similar strings but different products
- Similarity on the full title doesn't account for what matters (storage ≠ color)
- Needs careful thresholds that are hard to tune

**Why rejected:** Pure fuzzy matching cannot distinguish variants (256GB vs 512GB) reliably.

---

### Option C: Deterministic-First Pipeline *(Chosen)*

A staged pipeline that tries the most reliable method first and falls back progressively:

```
Stage 1: Identifier Match (GTIN / EAN / UPC / MPN)
  → If exact match found → confidence: DEFINITIVE (1.0)
  → No cost, no ambiguity

Stage 2: Structured Attribute Match
  brand (exact) + model (normalized) + key variant attributes (storage, RAM, color)
  → All match → confidence: HIGH (0.90)

Stage 3: Fuzzy Title Match (after attribute extraction)
  Match on: brand + model tokens only (not full title)
  Threshold: >0.85 similarity
  → confidence: MEDIUM (0.75)
  Additional rule: storage values must match exactly

Stage 4: No Match
  confidence: LOW (<0.75) → products not grouped
```

**Pros:**
- Deterministic where possible
- Cheap: identifier matching is a database lookup
- Fast: structured matching is string comparison
- Accurate: attributes that differ (256GB vs 512GB) prevent false positives
- Auditable: confidence score explains the decision
- Testable: each stage has clear inputs/outputs

**Cons:**
- Requires attribute extraction (non-trivial for noisy titles)
- Edge cases exist (especially in Stage 3)

---

## Decision

**Deterministic-First Matching Pipeline (Option C)**

**Pipeline stages:**

```
Raw Offer
    │
    ▼
[1] Text Normalization
    - Lowercase
    - Remove punctuation
    - Standardize units: "256gb" → "256GB", "5.9"" → "5.9inch"
    - Expand abbreviations: "16pro" → "16 pro"
    │
    ▼
[2] Attribute Extraction
    - Brand: lookup against known brand list
    - Model: regex + brand-specific patterns
    - Storage: regex (e.g., /(\d+)\s*gb/i)
    - RAM: regex (e.g., /(\d+)\s*gb\s*ram/i)
    - Color: lookup against known color list
    - Display size: regex (e.g., /(\d+\.?\d*)\s*inch/i)
    │
    ▼
[3] Identifier Lookup
    If offer has GTIN/EAN/UPC/MPN:
      → Query ProductIdentifier table
      → Exact match → confidence: DEFINITIVE
    │
    ▼
[4] Structured Attribute Match
    brand_match = brand_a === brand_b
    model_match = normalized_model_a === normalized_model_b
    storage_match = storage_a === storage_b (if applicable)
    ram_match = ram_a === ram_b (if applicable)
    color_match = color_a === color_b (if applicable, fuzzy)
    
    score = weighted sum of matches
    → score > 0.9 → confidence: HIGH
    │
    ▼
[5] Fuzzy Title Match (fallback)
    Compare: brand + model tokens only
    Algorithm: Token Sort Ratio (handles word order variations)
    → ratio > 0.85 AND storage values match → confidence: MEDIUM
    │
    ▼
[6] Confidence Decision
    DEFINITIVE (1.0): Same product — group
    HIGH (0.90): Same product — group
    MEDIUM (0.75): Probable match — group with flag
    LOW (<0.75): Different product — do not group
```

---

## Rationale

1. **Deterministic first**: Identifier matching (GTIN/EAN) is 100% accurate when available.
2. **Attribute-based second**: Storage size, RAM, and model number are the most discriminating features — they should always match exactly.
3. **Fuzzy last**: Only for cases where structured data is unavailable.
4. **LLM not used**: The pipeline is deterministic, fast, cheap, and auditable. LLM would add cost and non-determinism with no accuracy benefit over Stage 4.
5. **Confidence scores**: Enable the system to treat uncertain matches differently (e.g., show a "Possibly same product" indicator).

---

## Consequences

- ✅ Fast: identifier lookup is a single DB query; attribute matching is O(1) string comparison
- ✅ Cheap: no LLM calls for matching
- ✅ Auditable: every match has an explainable confidence score
- ✅ Testable: each stage is a pure function
- ⚠️ Attribute extraction quality directly affects matching quality — investment in the extractor pays off
- ⚠️ New product categories (fashion, groceries) will require new attribute extractors
- ⚠️ Some edge cases (e.g., regional product variants) may produce false negatives — acceptable in MVP

---

## Interview Notes

> "Our matching pipeline is staged: we first try deterministic identifier matching (GTIN/UPC), then structured attribute matching (brand + model + storage), then fuzzy string matching as a last resort. We deliberately avoid LLMs for matching because the problem is largely deterministic — you either have a 256GB iPhone or you don't — and LLMs would add latency and cost with no accuracy benefit over exact attribute comparison."
