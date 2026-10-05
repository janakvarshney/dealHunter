# DealHunter — Connector Architecture

> **Status:** Draft — implemented in Phase 2 | **Last Updated:** 2026-10-05

---

## Overview

A **connector** is a module responsible for retrieving product data from a single marketplace and normalizing it to the common `ProductOffer` schema.

Every connector is:
- **Independent**: connector failures are isolated; other connectors continue working
- **Replaceable**: the rest of the system has no knowledge of how any specific connector works
- **Testable**: each connector is a self-contained module with predictable inputs/outputs
- **Pluggable**: new connectors are added without touching existing code

---

## BaseConnector Interface

```typescript
// backend/src/connectors/base/connector.interface.ts

export interface BaseConnector {
  readonly source: SourceName;
  readonly displayName: string;
  readonly baseUrl: string;
  
  /** Check if this connector is operational */
  isAvailable(): Promise<boolean>;
  
  /** Search products by query */
  search(query: SearchQuery): Promise<ConnectorResult<ProductOffer[]>>;
  
  /** Get a specific product by external ID */
  getProduct(externalId: string): Promise<ConnectorResult<ProductOffer | null>>;
  
  /** Get all offers for a known product variant (by identifiers) */
  getOffersByIdentifiers(identifiers: ProductIdentifiers): Promise<ConnectorResult<ProductOffer[]>>;
}

export type ConnectorResult<T> = {
  success: true;
  data: T;
  fetchedAt: Date;
} | {
  success: false;
  error: ConnectorError;
  fetchedAt: Date;
};

export type ConnectorError = {
  code: 'TIMEOUT' | 'RATE_LIMITED' | 'AUTH_FAILED' | 'NOT_FOUND' | 'UNAVAILABLE' | 'PARSE_ERROR';
  message: string;
};
```

---

## ConnectorRegistry

```typescript
// backend/src/connectors/registry.ts

class ConnectorRegistry {
  private connectors: Map<SourceName, BaseConnector>;
  
  register(connector: BaseConnector): void
  
  /** Search all active connectors in parallel */
  async searchAll(query: SearchQuery): Promise<AggregatedResult>
  
  /** Get connector availability status */
  async healthCheck(): Promise<Record<SourceName, boolean>>
}
```

The registry dispatches search queries to all registered connectors in parallel using `Promise.allSettled()` — so a single connector failure never blocks the others.

---

## Mock Connector Architecture

In MVP, all connectors use mock data. The mock system is designed so that:
1. **Real connector implementation replaces only the data-fetching layer** — normalization logic stays
2. **Mock data is realistic** — products, prices, sellers match real patterns
3. **Each connector's mock data is independent** — Amazon prices ≠ Flipkart prices for same product

### Mock Connector Structure

```
backend/src/connectors/amazon/
├── amazon.connector.ts          ← Implements BaseConnector
├── amazon.normalizer.ts         ← Maps raw data → ProductOffer
├── amazon.mock-data.ts          ← Realistic mock products
└── amazon.connector.test.ts     ← Unit tests
```

---

## Adding a New Connector

To add a new marketplace:

1. Create directory: `backend/src/connectors/{source}/`
2. Create `{source}.connector.ts` implementing `BaseConnector`
3. Create `{source}.normalizer.ts` implementing `normalize(raw): ProductOffer`
4. Add mock data or real API integration
5. Register in `ConnectorRegistry` in `backend/src/connectors/registry.ts`
6. Add `SourceName` to the enum
7. Write unit tests
8. Update `docs/data-sources.md` with legal research

**The existing system requires zero changes.** Only the registry registration is new.

---

## Error Handling & Fault Isolation

```typescript
// In ConnectorRegistry.searchAll():
const results = await Promise.allSettled(
  activeConnectors.map(connector => connector.search(query))
);

const offers: ProductOffer[] = [];
const warnings: ConnectorWarning[] = [];

for (const result of results) {
  if (result.status === 'fulfilled' && result.value.success) {
    offers.push(...result.value.data);
  } else {
    warnings.push({
      source: connector.source,
      message: result.status === 'rejected' 
        ? 'Connector error' 
        : result.value.error.message,
    });
  }
}

return { offers, warnings };
```

---

## Connector Status (MVP)

| Connector | File | Implementation | Data |
|---|---|---|---|
| Amazon IN | `connectors/amazon/` | Full | Mock |
| Flipkart | `connectors/flipkart/` | Full | Mock |
| Croma | `connectors/croma/` | Full | Mock |
| Reliance Digital | `connectors/reliance/` | Scaffolded | — |
| Myntra | `connectors/myntra/` | Scaffolded | — |
| Meesho | `connectors/meesho/` | Scaffolded | — |

---

## Data Freshness

Every offer has `fetchedAt` and `expiresAt` timestamps:

- Mock connectors simulate data that is "30 minutes old" with realistic staleness
- The UI displays "Price checked X minutes ago" on every offer
- Background workers refresh expired offers on a schedule

---

*Connector implementations will be committed in Phase 2.*
