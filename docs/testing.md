# DealHunter — Testing Strategy

> **Status:** Draft — implemented in Phase 14 | **Last Updated:** 2026-10-05

---

## Testing Philosophy

Test what matters. Don't test framework code. Test your own logic.

Priority order:
1. **Business logic** — matching, scoring, true cost (highest priority)
2. **API endpoints** — integration tests for critical routes
3. **Connectors** — verify normalization and error handling
4. **Frontend** — component tests for critical UI

---

## Test Types

### Unit Tests
- Pure functions with clear inputs/outputs
- No database, no HTTP
- Fast (< 5ms per test)
- Located at: `backend/tests/unit/`

**What to unit test:**
- `normalizer.ts` — text normalization rules
- `extractor.ts` — attribute extraction from titles
- `identifier-matcher.ts` — GTIN/EAN matching
- `attribute-matcher.ts` — structured attribute matching
- `fuzzy-matcher.ts` — Levenshtein scoring
- `true-cost.ts` — True Cost formula
- `scorer.ts` — Deal Score formula
- `explainer.ts` — explanation generation

### Integration Tests
- Test API endpoints with a real database (test DB)
- Use supertest to make HTTP requests
- Reset DB before each test suite
- Located at: `backend/tests/integration/`

**What to integration test:**
- `POST /api/search` — returns results, handles connector failure
- `POST /api/auth/signup` — creates user, sets cookie
- `POST /api/auth/login` — validates credentials, sets cookie
- `GET /api/products/:id/price-history` — returns correct data
- `POST /api/wishlist` — requires auth, adds item

### End-to-End Tests
- Full browser-level flow
- Located at: `tests/e2e/`
- Tool: Playwright

**What to E2E test:**
- Search flow: query → results → product page
- Auth flow: signup → login → wishlist

---

## Test Examples

### Unit: True Cost Calculator
```typescript
describe('TrueCostCalculator', () => {
  it('should include shipping cost in true cost', () => {
    const offer = { discountedPrice: 79900, shippingCost: 99, discount: 0 };
    expect(calculateTrueCost(offer)).toBe(79999);
  });

  it('should subtract instant discounts', () => {
    const offer = { discountedPrice: 77900, shippingCost: 0, instantDiscount: 2000 };
    expect(calculateTrueCost(offer)).toBe(75900);
  });

  it('should NOT subtract bank card cashback (uncertain)', () => {
    const offer = { discountedPrice: 77900, shippingCost: 0, bankCashback: 500 };
    // bankCashback is uncertain — should NOT be subtracted
    expect(calculateTrueCost(offer)).toBe(77900);
  });
});
```

### Unit: Product Matching — Hard Stop
```typescript
describe('AttributeMatcher', () => {
  it('should NOT match offers with different storage', () => {
    const offer1 = { brand: 'apple', model: 'iphone 16', storage: '256gb' };
    const offer2 = { brand: 'apple', model: 'iphone 16', storage: '512gb' };
    const result = matchAttributes(offer1, offer2);
    expect(result.isMatch).toBe(false);
    expect(result.reason).toBe('STORAGE_MISMATCH');
  });
});
```

---

## Test Runner

- **Backend:** Jest + ts-jest
- **Frontend:** Vitest (built into Vite)
- **E2E:** Playwright

## Commands

```bash
# Unit tests
cd backend && npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# E2E
cd tests && npx playwright test
```

## Coverage Targets

| Module | Target |
|---|---|
| matching/ | ≥ 90% |
| ranking/ | ≥ 90% |
| connectors/ | ≥ 80% |
| api/ (routes) | ≥ 70% |
| services/ | ≥ 80% |

---

*Tests will be written in Phase 14.*
