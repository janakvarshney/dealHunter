# DealHunter — Project Roadmap

> **Status:** Active | **Current Phase:** 0 — Foundation | **Last Updated:** 2026-10-05

---

## Overview

This roadmap breaks development into clearly scoped phases. Each phase has a defined objective, deliverables, and success criteria. No phase begins until the previous one is reviewed and approved.

---

## Phase Summary

| Phase | Name | Status | Key Deliverable |
|---|---|---|---|
| 0 | Foundation | ✅ **Complete** | Docs, ADRs, folder structure, gitignore |
| 1 | Database Schema | ✅ **Complete** | PostgreSQL schema, Prisma models, migrations |
| 2 | Connector Architecture | 🔲 Next | BaseConnector + Amazon, Flipkart, Croma mocks |
| 3 | Mock Data Engine | 🔲 Pending | Seed script with realistic product/offer data |
| 4 | Product Matching Engine | 🔲 Pending | Deterministic + fuzzy matcher with confidence scores |
| 5 | Deal Scoring Engine | 🔲 Pending | True Cost + weighted Deal Score algorithm |
| 6 | Backend API | 🔲 Pending | Express routes, validation, error handling |
| 7 | Authentication | 🔲 Pending | JWT + httpOnly cookies, signup/login/logout |
| 8 | Frontend Core | 🔲 Pending | Search, results, product page, offer comparison |
| 9 | AI Integration | 🔲 Pending | Gemini NL search + review summarization |
| 10 | Wishlist | 🔲 Pending | Save/manage products (authenticated) |
| 11 | Redis & Caching | 🔲 Pending | Search cache, offer cache, rate limiting |
| 12 | Docker | 🔲 Pending | docker-compose.yml with all services |
| 13 | Deployment | 🔲 Pending | Vercel (frontend) + Render (backend + DB) |
| 14 | Testing | 🔲 Pending | Unit + integration tests for critical paths |
| 15 | Documentation Polish | 🔲 Pending | Complete all docs/, README finalized |

---

## Phase 0 — Foundation ✅

**Objective:** Establish the project skeleton. Everything else is built on this.

**Why this phase first?**
A strong foundation prevents expensive rework later. Documenting decisions before coding forces clarity of thought. The `.gitignore` and `.env.example` protect us from accidentally leaking secrets from day one.

### Deliverables

- [x] `.gitignore` — comprehensive, covers Node.js, Python, secrets, OS files
- [x] `.env.example` — all environment variables documented
- [x] `README.md` — complete project documentation skeleton
- [x] `REQUIREMENTS.md` — functional & non-functional requirements
- [x] `ROADMAP.md` — this file
- [x] `CONTRIBUTING.md` — contribution guidelines
- [x] `docs/` — all documentation files scaffolded
- [x] `docs/decisions/` — ADR-001 through ADR-005
- [x] `docker-compose.yml` — infrastructure skeleton

### Success Criteria
- A new developer can read README.md and understand the system.
- No secrets can be accidentally committed.
- All major architectural decisions are documented.

---

## Phase 1 — Database Schema ✅

**Objective:** Design and implement the complete PostgreSQL database schema.

**Why this phase second?**
The database schema is the single most important design decision after the tech stack. Getting it right early prevents painful migrations later. Every other component (connectors, matching, API, frontend) depends on understanding the data model.

**What you'll learn:**
- Database normalization (1NF, 2NF, 3NF)
- When to denormalize for performance
- Prisma schema design
- Database indexing strategy
- Time-series data patterns (PriceHistory)
- UUID vs auto-increment primary keys

### Deliverables
- [x] `backend/prisma/schema.prisma` — complete Prisma schema (15 entities)
- [x] Prisma Client generation & validation
- [x] `docs/database.md` — ER diagram + design rationale
- [x] `backend/prisma/seed.ts` — seed script skeleton

### Entities to Design
- `User`
- `Product`
- `ProductVariant`
- `ProductIdentifier` (GTIN, EAN, UPC, MPN)
- `ProductAttribute` (key-value pairs for specs)
- `ProductOffer` (one per source per variant)
- `Merchant`
- `Seller`
- `PriceHistory`
- `ProductImage`
- `Category`
- `ProductReviewSummary`
- `Wishlist` / `WishlistItem`
- `DealScore`
- `SearchQuery` (for analytics)

---

## Phase 2 — Connector Architecture 🔲

**Objective:** Build the pluggable connector system and implement 3 mock connectors.

**What you'll learn:**
- Interface-based design (strategy pattern)
- Why we decouple data fetching from business logic
- How to design for extensibility (new connector = new file)
- Error handling and timeouts in connector architecture
- Data normalization

### Deliverables
- [ ] `backend/src/connectors/base/` — `BaseConnector` interface + shared types
- [ ] `backend/src/connectors/amazon/` — Full mock connector
- [ ] `backend/src/connectors/flipkart/` — Full mock connector
- [ ] `backend/src/connectors/croma/` — Full mock connector
- [ ] `backend/src/connectors/reliance/` — Scaffolded (interface only)
- [ ] `backend/src/connectors/myntra/` — Scaffolded
- [ ] `backend/src/connectors/meesho/` — Scaffolded
- [ ] `ConnectorRegistry` — manages and dispatches to all connectors
- [ ] `docs/connectors.md` — updated with implementation details

---

## Phase 3 — Mock Data Engine 🔲

**Objective:** Create rich, realistic mock product and offer data.

**Why realistic mock data matters:**
The product matching engine, deal scoring engine, and frontend all depend on data quality. Synthetic but realistic data makes the system look credible in demos and tests edge cases properly.

### Deliverables
- [ ] `scripts/generate-mock-data.ts` — generator for products, offers, price history
- [ ] `scripts/seed.ts` — database seeder
- [ ] Minimum 50 product variants across categories (phones, laptops, TVs)
- [ ] Each product variant has 2–4 offers from different sources
- [ ] 90 days of price history per offer
- [ ] Realistic price variations, discounts, availability, seller ratings

---

## Phase 4 — Product Matching Engine 🔲

**Objective:** Build the pipeline that groups offers representing the same product.

**What you'll learn:**
- Why deterministic matching must precede fuzzy matching
- String similarity algorithms (Levenshtein, Jaro-Winkler, token sort ratio)
- Confidence scoring
- When NOT to use AI for this problem
- Test-driven development for an algorithm

### Deliverables
- [ ] `backend/src/matching/normalizer.ts` — text/attribute normalization
- [ ] `backend/src/matching/extractor.ts` — brand/model/variant extraction
- [ ] `backend/src/matching/identifier-matcher.ts` — GTIN/EAN exact matching
- [ ] `backend/src/matching/attribute-matcher.ts` — structured attribute matching
- [ ] `backend/src/matching/fuzzy-matcher.ts` — Levenshtein-based fuzzy matching
- [ ] `backend/src/matching/pipeline.ts` — orchestrates the full pipeline
- [ ] Unit tests for all matchers
- [ ] `docs/product-matching.md` — algorithm documentation

---

## Phase 5 — Deal Scoring Engine 🔲

**Objective:** Implement True Cost calculation and the weighted Deal Score algorithm.

**What you'll learn:**
- Normalization of heterogeneous data to 0–1 scale
- Weighted scoring models
- Min-max normalization
- Why configurable weights matter for product iteration
- How to make algorithms explainable

### Deliverables
- [ ] `backend/src/ranking/true-cost.ts` — True Cost calculator
- [ ] `backend/src/ranking/scorer.ts` — Deal Score calculator
- [ ] `backend/src/ranking/explainer.ts` — explanation generator
- [ ] `backend/src/ranking/config.ts` — configurable weights
- [ ] Unit tests for all scoring logic
- [ ] `docs/deal-scoring.md` — algorithm documentation

---

## Phase 6 — Backend API 🔲

**Objective:** Expose all business logic via a well-designed REST API.

**What you'll learn:**
- Express.js route organization
- Zod request/response validation
- Error handling middleware
- Pagination patterns
- API versioning
- Layered architecture (Controller → Service → Repository)

### Deliverables
- [ ] All routes in `backend/src/api/routes/`
- [ ] Zod schemas for all endpoints
- [ ] Error handling middleware with structured error responses
- [ ] Request logging middleware
- [ ] CORS middleware
- [ ] Health check endpoint
- [ ] `docs/api.md` — full endpoint documentation

---

## Phase 7 — Authentication 🔲

**Objective:** Implement secure user authentication.

**What you'll learn:**
- bcrypt and password hashing
- JWT structure (header, payload, signature)
- Why httpOnly cookies are more secure than localStorage
- CSRF protection with SameSite cookies
- Auth middleware pattern

### Deliverables
- [ ] User signup / login / logout
- [ ] JWT generation and verification
- [ ] httpOnly cookie management
- [ ] Auth middleware
- [ ] Protected route pattern
- [ ] `docs/security.md` — updated

---

## Phase 8 — Frontend Core 🔲

**Objective:** Build the user-facing React application.

**Pages to build:**
- Home (search bar, featured deals, categories)
- Search Results (filters, sorting, deal cards)
- Product Detail (offer comparison table, deal score, price history chart, explanation panel)
- Login / Signup

**What you'll learn:**
- TanStack Query for server state
- Zustand for client state
- React Router for navigation
- Tailwind CSS utility patterns
- Dark mode implementation

### Deliverables
- [ ] Complete React app with all pages
- [ ] Responsive layout
- [ ] Light / dark mode toggle
- [ ] Loading states, error states, empty states
- [ ] Price history chart (recharts or chart.js)
- [ ] Deal Score display with explanation panel

---

## Phase 9 — AI Integration 🔲

**Prerequisite:** Gemini API key.

**Objective:** Add Gemini-powered natural language search and review summarization.

**What you'll learn:**
- Prompt engineering for structured output extraction
- JSON mode with Gemini
- Graceful degradation when AI is unavailable
- Rate limiting AI endpoints
- Caching AI responses

### Deliverables
- [ ] `backend/src/ai/gemini.ts` — Gemini client
- [ ] `backend/src/ai/query-parser.ts` — NL query → structured params
- [ ] `backend/src/ai/review-summarizer.ts` — reviews → pros/cons
- [ ] AI rate limiting
- [ ] AI response caching
- [ ] `docs/ai-system.md` — updated

---

## Phase 10 — Wishlist 🔲

**Objective:** Allow authenticated users to save and manage products.

### Deliverables
- [ ] Wishlist API endpoints
- [ ] Wishlist page (frontend)
- [ ] "Save to Wishlist" button on product cards and product page
- [ ] Current best deal shown for each wishlist item

---

## Phase 11 — Redis & Caching 🔲

**Objective:** Add Redis for caching and rate limiting.

**What you'll learn:**
- Cache-aside pattern
- TTL-based cache invalidation
- Redis data structures
- Rate limiting with Redis sliding window

### Deliverables
- [ ] Redis client setup
- [ ] Search result caching
- [ ] Product detail caching
- [ ] Rate limiting middleware
- [ ] Cache hit/miss metrics logging

---

## Phase 12 — Docker 🔲

**Objective:** Containerize all services for reproducible local development.

### Deliverables
- [ ] `docker-compose.yml` with: frontend, backend, postgres, redis
- [ ] `backend/Dockerfile`
- [ ] `frontend/Dockerfile`
- [ ] Health checks for all services
- [ ] `docs/deployment.md` — Docker section

---

## Phase 13 — Deployment 🔲

**Objective:** Deploy to free cloud platforms accessible from any device.

### Deliverables
- [ ] Frontend deployed to Vercel
- [ ] Backend deployed to Render
- [ ] PostgreSQL on Render
- [ ] Redis on Render or Upstash
- [ ] Environment variables configured in deployment platforms
- [ ] Public URL working from any device
- [ ] `docs/deployment.md` — complete

---

## Phase 14 — Testing 🔲

**Objective:** Add tests for critical paths.

### Coverage targets
- Product matching pipeline: unit tests
- Deal scoring engine: unit tests
- True cost calculator: unit tests
- Search endpoint: integration test
- Auth endpoints: integration test
- Connector registry: unit tests

### Deliverables
- [ ] Test runner configured (Jest / Vitest)
- [ ] Unit tests for matching, scoring, connectors
- [ ] Integration tests for API endpoints
- [ ] `docs/testing.md` — complete

---

## Phase 15 — Documentation Polish 🔲

**Objective:** Ensure all documentation is complete, accurate, and interview-ready.

### Deliverables
- [ ] README.md — fully populated (no placeholder sections)
- [ ] All docs/ files complete
- [ ] All ADRs finalized
- [ ] Architecture diagrams (ASCII or Mermaid)
- [ ] CONTRIBUTING.md complete
- [ ] Troubleshooting guide written
- [ ] FAQ populated with real questions

---

## Phase 2+ Future Roadmap

These are post-MVP phases, not planned for immediate implementation:

| Phase | Feature |
|---|---|
| 16 | Real marketplace connectors (Amazon Product Advertising API) |
| 17 | Price drop email alerts |
| 18 | Elasticsearch/Typesense for search at scale |
| 19 | Fashion & grocery category support |
| 20 | Personalized recommendations |
| 21 | Browser extension |
| 22 | React Native mobile app |
| 23 | Vector embeddings for semantic search |

---

*This roadmap is a living document. It is updated as phases are completed or decisions change.*
