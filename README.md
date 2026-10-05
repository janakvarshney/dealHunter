# DealHunter 🔍

> **AI-Powered Product Deal Comparison & Shopping Intelligence Platform for India**

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7+-DC382D?logo=redis&logoColor=white)](https://redis.io)
[![Gemini](https://img.shields.io/badge/Google_Gemini-AI-4285F4?logo=google&logoColor=white)](https://aistudio.google.com)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Non-Goals](#3-goals--non-goals)
4. [Features](#4-features)
5. [Architecture Overview](#5-architecture-overview)
6. [Tech Stack](#6-tech-stack)
7. [Database Architecture](#7-database-architecture)
8. [Connector Architecture](#8-connector-architecture)
9. [Product Matching Engine](#9-product-matching-engine)
10. [Deal Scoring Engine](#10-deal-scoring-engine)
11. [AI System](#11-ai-system)
12. [Search Architecture](#12-search-architecture)
13. [Caching Architecture](#13-caching-architecture)
14. [Security Architecture](#14-security-architecture)
15. [Folder Structure](#15-folder-structure)
16. [Environment Variables](#16-environment-variables)
17. [Local Setup](#17-local-setup)
18. [Docker Setup](#18-docker-setup)
19. [API Reference](#19-api-reference)
20. [Testing](#20-testing)
21. [Deployment](#21-deployment)
22. [Architecture Decisions](#22-architecture-decisions)
23. [Project Roadmap](#23-project-roadmap)
24. [Known Limitations](#24-known-limitations)
25. [Future Improvements](#25-future-improvements)
26. [Contributing](#26-contributing)
27. [License](#27-license)

---

## 1. Project Overview

**DealHunter** is a shopping intelligence platform that aggregates product offers from multiple Indian e-commerce marketplaces, normalizes them into a common schema, applies intelligent deal scoring, and recommends the **single best deal** to the user — with a transparent explanation of why.

It is not a marketplace. It does not process payments. It is a **comparison engine** — users click "Buy Now" and are redirected to the original merchant.

### Core User Journey

```
User searches: "iPhone 16 256GB Blue"
        │
        ▼
AI understands query (optional: natural language → structured query)
        │
        ▼
Connectors retrieve offers from: Amazon IN, Flipkart, Croma, ...
        │
        ▼
Product Matching Engine groups offers that represent the same product
        │
        ▼
Normalization: price, shipping, discounts, seller rating, delivery speed
        │
        ▼
True Cost = Price + Shipping − Discounts − Cashback
        │
        ▼
Deal Score = weighted(price, seller, rating, delivery, return policy, history)
        │
        ▼
Best Deal selected + explanation generated
        │
        ▼
User clicks "Buy Now" → redirected to merchant
```

---

## 2. Problem Statement

Indian consumers shopping online face a fragmented market:

- The same product is listed on Amazon, Flipkart, Croma, Reliance Digital, and others — at different prices, with different shipping costs, seller quality, and return policies.
- There is no single place that shows you the **true cost** of a purchase across all platforms.
- Price comparison tools that exist either have stale data, don't cover all platforms, or don't account for seller quality and delivery in their recommendation.
- Consumers frequently make suboptimal purchase decisions because comparing across platforms is time-consuming and error-prone.

**DealHunter solves this** by doing the comparison work automatically, transparently, and intelligently.

---

## 3. Goals & Non-Goals

### Goals (MVP)

- ✅ Search products across multiple sources
- ✅ Normalize and compare offers from different platforms
- ✅ Identify when two listings represent the same product
- ✅ Calculate True Cost per offer
- ✅ Calculate a Deal Score per offer
- ✅ Recommend the best deal with a transparent explanation
- ✅ Show price history (mocked in MVP, real in Phase 2)
- ✅ Support user accounts (signup/login)
- ✅ Wishlist for authenticated users
- ✅ AI-powered natural language search (Gemini)
- ✅ Review summarization (Gemini)

### Non-Goals (MVP)

- ❌ Processing payments or hosting checkout
- ❌ Real marketplace API integrations (MVP uses mock connectors)
- ❌ Price drop email alerts (Phase 2)
- ❌ Mobile app
- ❌ Fashion/grocery categories (Phase 2)
- ❌ Personalized recommendations (Phase 2)

---

## 4. Features

### Search
- Keyword search with structured filters (brand, price range, store, rating)
- AI natural language query understanding via Google Gemini
- Real-time results with sorting (Best Deal, Lowest Price, Highest Rating, Fastest Delivery)

### Offer Comparison
- Offers from 3 full connectors: Amazon IN, Flipkart, Croma
- 3 scaffolded connectors: Reliance Digital, Myntra, Meesho
- Normalized to a common `ProductOffer` schema
- Grouped by matched product identity

### Deal Intelligence
- **True Cost** = Effective price after discounts, including shipping
- **Deal Score** = Weighted score across price, seller, rating, delivery, return policy, price history
- **Best Deal Recommendation** with itemized explanation
- "Why this is the best deal" transparency panel

### Price History
- Historical price tracking per product per source
- Visual price chart
- Insight: "Is this a good time to buy?"

### User Features
- Signup / Login (JWT in httpOnly cookies)
- Wishlist (save products for later)
- (Phase 2) Price drop alerts

### AI Features (Gemini)
- Natural language search: "laptop under ₹90,000 for development and gaming"
- Query → structured preferences extraction
- Review summarization
- Deal explanation generation

---

## 5. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│           React + TypeScript + Vite + Tailwind CSS          │
│     TanStack Query (server state) + Zustand (client state)  │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP/REST
┌───────────────────────▼─────────────────────────────────────┐
│                     BACKEND API                             │
│              Node.js + Express.js + TypeScript              │
│          Zod validation │ JWT Auth │ Rate Limiting           │
└──┬──────────┬───────────┬──────────┬──────────┬─────────────┘
   │          │           │          │          │
   ▼          ▼           ▼          ▼          ▼
[Services] [Connectors] [Matching] [Ranking] [AI / Gemini]
   │          │           │          │
   ▼          ▼           ▼          ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER                               │
│   PostgreSQL (Prisma ORM)  │  Redis (Cache + Rate Limiting) │
└─────────────────────────────────────────────────────────────┘
   │
   ▼
[Background Workers: node-cron]
  - Price refresh
  - Deal score recalculation
```

---

## 6. Tech Stack

| Component | Technology | Reason Selected | Alternatives Considered |
|---|---|---|---|
| Frontend Framework | React 18 + TypeScript | Industry standard, typed, interview-ready | Vue, Svelte |
| Build Tool | Vite | Fastest HMR, native ESM | CRA (deprecated), Webpack |
| Styling | Tailwind CSS | Utility-first, dark mode, responsive | Vanilla CSS, MUI |
| Server State | TanStack Query | Caching, loading states, deduplication | SWR, Redux Toolkit Query |
| Client State | Zustand | Minimal boilerplate, TypeScript-native | Redux, Jotai |
| Backend | Node.js + Express.js | Team familiarity, large ecosystem | FastAPI (Python), Fastify |
| Language | TypeScript (full-stack) | Type safety end-to-end, fewer runtime bugs | JavaScript |
| Database | PostgreSQL 15 | ACID, relational, powerful queries | MongoDB, MySQL |
| ORM | Prisma | Type-safe queries, migrations, great DX | TypeORM, Drizzle, Sequelize |
| Cache | Redis | Low-latency, pub/sub (future), rate limiting | Memcached |
| AI / LLM | Google Gemini | User's preference, free tier available | OpenAI GPT-4, Anthropic Claude |
| Auth | JWT + httpOnly cookies | Secure, stateless, XSS-resistant | Session cookies, localStorage JWT |
| Validation | Zod | Runtime + type-safe validation, shared schemas | Joi, Yup |
| Background Jobs | node-cron (MVP) | Zero dependency, simple scheduling | BullMQ, Celery |
| Deployment | Vercel + Render | Free tier, easy CI/CD | AWS, Railway, Fly.io |

---

## 7. Database Architecture

See [`docs/database.md`](docs/database.md) for the full ER diagram and schema rationale.

### Core Entities

```
User ──────────────── Wishlist ─────────────── Product
  │                                               │
  └──── PriceAlert                            ProductVariant
                                                  │
                        ┌─────────────────────────┤
                        │                         │
                    ProductOffer            ProductIdentifier
                        │                         │
                     Merchant              ProductAttribute
                        │
                    PriceHistory
                        │
                     DealScore
```

### Key Design Decisions

- **Products vs ProductVariants**: A product (iPhone 16) is separate from its variants (256GB Black, 512GB Blue). This avoids duplicating base product data.
- **ProductIdentifiers**: Store GTIN, EAN, UPC, MPN separately to enable deterministic matching before falling back to fuzzy matching.
- **PriceHistory**: Time-series table — never updated, only appended. Enables historical price analysis.
- **Normalization**: 3NF where practical. Denormalized only where query performance demands it (e.g., DealScore pre-calculated and cached per offer).

---

## 8. Connector Architecture

See [`docs/connectors.md`](docs/connectors.md) for full connector documentation.

All marketplace integrations implement a common `BaseConnector` interface:

```typescript
interface BaseConnector {
  readonly source: SourceName;
  search(query: SearchQuery): Promise<ProductOffer[]>;
  getProduct(externalId: string): Promise<ProductOffer | null>;
  getOffers(productId: string): Promise<ProductOffer[]>;
  isAvailable(): Promise<boolean>;
}
```

Every connector outputs a normalized `ProductOffer`:

```typescript
interface ProductOffer {
  source: SourceName;
  externalProductId: string;
  title: string;
  brand: string;
  model: string;
  category: Category;
  variant: VariantAttributes;
  listedPrice: number;
  discountedPrice: number;
  discount: number;
  shippingCost: number;
  taxEstimate?: number;
  availability: AvailabilityStatus;
  seller: SellerInfo;
  productRating: number;
  reviewCount: number;
  deliveryEstimateDays: number;
  returnPolicyDays: number;
  productUrl: string;
  imageUrls: string[];
  fetchedAt: Date;
}
```

**MVP Connector Status:**

| Connector | Status | Data Source |
|---|---|---|
| Amazon IN | ✅ Full | Mock data |
| Flipkart | ✅ Full | Mock data |
| Croma | ✅ Full | Mock data |
| Reliance Digital | 🔧 Scaffolded | — |
| Myntra | 🔧 Scaffolded | — |
| Meesho | 🔧 Scaffolded | — |

---

## 9. Product Matching Engine

See [`docs/product-matching.md`](docs/product-matching.md) for full algorithm documentation.

The matching pipeline determines whether two offers from different sources represent the same physical product:

```
Raw Offer Title
      │
      ▼
Text Normalization (lowercase, remove punctuation, standardize units)
      │
      ▼
Attribute Extraction (brand, model, storage, RAM, color, etc.)
      │
      ▼
Identifier Lookup (GTIN / EAN / UPC exact match) → Definitive match
      │
      ▼
Structured Attribute Match (brand + model + variant exact match)
      │
      ▼
Fuzzy Name Match (Levenshtein + token sort ratio)
      │
      ▼
Confidence Score → HIGH / MEDIUM / LOW / NO_MATCH
      │
      ▼
Matched Product Group
```

**Why not use LLM for matching?**
LLMs are non-deterministic, expensive per-call, and slow. For product matching, deterministic attribute comparison is faster, cheaper, and more accurate for structured data. LLMs are used only where semantic reasoning is genuinely needed (e.g., natural language search, review summarization).

---

## 10. Deal Scoring Engine

See [`docs/deal-scoring.md`](docs/deal-scoring.md) for full scoring algorithm documentation.

Deal Score is a weighted composite score (0–100):

```
Deal Score = Σ (factor_score × weight) / Σ weights

Factors (configurable weights):
  price_score          × 0.35    — How competitive is the true cost?
  seller_score         × 0.20    — Seller rating + review count
  product_rating_score × 0.15    — Product rating + review count
  delivery_score       × 0.15    — Faster delivery = higher score
  return_policy_score  × 0.10    — Longer return window = higher score
  price_history_score  × 0.05    — Is current price below historical average?
```

**True Cost:**
```
True Cost = Discounted Price + Shipping Cost − Instant Discount − Coupon − Cashback
```

Only confirmed, currently valid discounts are subtracted. No synthetic discounts invented.

---

## 11. AI System

See [`docs/ai-system.md`](docs/ai-system.md) for full AI architecture.

Gemini integration provides two capabilities in MVP:

1. **Natural Language Search**: User query → structured search parameters
2. **Review Summarization**: Raw review snippets → pros/cons summary

The AI layer is **entirely optional** — the platform operates fully without it. If `GEMINI_API_KEY` is missing, AI endpoints return a graceful degraded response.

AI is never used for: pricing, availability, matching (where deterministic data exists).

---

## 12. Search Architecture

See [`docs/search.md`](docs/search.md) for full search design.

MVP uses PostgreSQL full-text search with structured filters. This is sufficient for the expected data scale (thousands of products) and avoids the complexity of Elasticsearch.

**Search pipeline:**
1. Query normalization
2. (Optional) Gemini query → structured attributes
3. PostgreSQL `tsvector` full-text search
4. Structured filter application (brand, price range, category)
5. Deal Score ranking
6. Redis cache (5-minute TTL)

**When to add Elasticsearch:** At ~100,000+ products or when search latency exceeds 200ms consistently.

---

## 13. Caching Architecture

Redis is used for:

| Cache Key Pattern | TTL | Purpose |
|---|---|---|
| `search:{query_hash}` | 5 min | Search result pages |
| `product:{id}` | 10 min | Product detail + offers |
| `offers:{product_id}` | 3 min | Offer aggregation |
| `price_history:{product_id}` | 30 min | Historical price data |
| `rate_limit:{ip}` | 15 min | API rate limiting |

**Cache invalidation:** TTL-based expiry (simpler, sufficient for MVP). Background price refresh automatically overwrites stale cache entries.

---

## 14. Security Architecture

See [`docs/security.md`](docs/security.md) for full security documentation.

| Concern | Implementation |
|---|---|
| Authentication | JWT in httpOnly cookies (XSS-resistant) |
| Password storage | bcrypt (cost factor 12) |
| CORS | Whitelist of allowed origins |
| Rate limiting | Redis-backed, per-IP |
| Input validation | Zod on all request bodies and query params |
| SQL injection | Prevented by Prisma parameterized queries |
| CSRF | SameSite=Strict cookie attribute |
| Secrets | Environment variables only, never in code |
| Dependencies | Regular `npm audit` |

---

## 15. Folder Structure

```
dealhunter/
├── README.md                   # This file
├── REQUIREMENTS.md             # Functional & non-functional requirements
├── ROADMAP.md                  # Development phases and milestones
├── CONTRIBUTING.md             # Contribution guidelines
├── LICENSE                     # MIT License
├── .gitignore
├── .env.example                # Environment variable template
├── docker-compose.yml          # Local development services
│
├── docs/
│   ├── architecture.md         # System architecture deep-dive
│   ├── database.md             # Schema, ER diagram, migrations
│   ├── api.md                  # API endpoint reference
│   ├── product-matching.md     # Matching algorithm documentation
│   ├── deal-scoring.md         # Scoring algorithm documentation
│   ├── connectors.md           # Connector architecture & adding new sources
│   ├── ai-system.md            # AI/Gemini integration design
│   ├── search.md               # Search architecture
│   ├── data-sources.md         # Marketplace research & legal notes
│   ├── security.md             # Security design
│   ├── testing.md              # Testing strategy & patterns
│   ├── deployment.md           # Deployment guide (Vercel + Render)
│   ├── troubleshooting.md      # Common problems & solutions
│   └── decisions/
│       ├── ADR-001-tech-stack.md
│       ├── ADR-002-database.md
│       ├── ADR-003-search.md
│       ├── ADR-004-product-matching.md
│       └── ADR-005-deal-scoring.md
│
├── frontend/                   # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Route-level page components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── store/              # Zustand stores
│   │   ├── services/           # API client functions
│   │   ├── types/              # TypeScript type definitions
│   │   └── utils/              # Frontend utilities
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
│
├── backend/                    # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── api/
│   │   │   ├── routes/         # Express route definitions
│   │   │   └── controllers/    # Request handlers
│   │   ├── connectors/         # Marketplace data connectors
│   │   │   ├── base/           # BaseConnector interface + types
│   │   │   ├── amazon/
│   │   │   ├── flipkart/
│   │   │   ├── croma/
│   │   │   ├── reliance/       # Scaffolded
│   │   │   ├── myntra/         # Scaffolded
│   │   │   └── meesho/         # Scaffolded
│   │   ├── matching/           # Product matching engine
│   │   ├── ranking/            # Deal scoring engine
│   │   ├── ai/                 # Gemini AI integration
│   │   ├── services/           # Business logic layer
│   │   ├── repositories/       # Database access layer (Prisma)
│   │   ├── schemas/            # Zod validation schemas
│   │   ├── middleware/         # Express middleware
│   │   ├── workers/            # Background jobs (node-cron)
│   │   ├── utils/              # Shared utilities
│   │   ├── types/              # TypeScript type definitions
│   │   └── main.ts             # Application entry point
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── migrations/         # Auto-generated migrations
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
│
├── tests/                      # End-to-end tests
│   └── e2e/
│
├── scripts/                    # Utility scripts
│   ├── seed.ts                 # Database seeding with mock data
│   └── generate-mock-data.ts   # Mock offer data generator
│
└── .github/
    └── workflows/
        ├── ci.yml              # CI: lint + test on PR
        └── deploy.yml          # CD: deploy on merge to main
```

---

## 16. Environment Variables

See [`.env.example`](.env.example) for the full list with descriptions.

**Required for basic functionality:**
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`

**Required for AI features:**
- `GEMINI_API_KEY` — Get free at [aistudio.google.com](https://aistudio.google.com)

**Never commit:**
- `.env` or any file containing real secrets

---

## 17. Local Setup

> ⚠️ **Prerequisites:** Node.js 20+, PostgreSQL 15+, Redis 7+, Git

### Step 1 — Clone repository
```bash
git clone https://github.com/yourusername/dealhunter.git
cd dealhunter
```

### Step 2 — Set up environment
```bash
cp .env.example .env
# Edit .env with your actual values
```

### Step 3 — Install backend dependencies
```bash
cd backend
npm install
```

### Step 4 — Run database migrations
```bash
npx prisma migrate dev
npx prisma generate
```

### Step 5 — Seed with mock data
```bash
npx ts-node scripts/seed.ts
```

### Step 6 — Start backend
```bash
npm run dev
# Runs on http://localhost:4000
```

### Step 7 — Install & start frontend
```bash
cd ../frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## 18. Docker Setup

```bash
# Start all services (PostgreSQL, Redis, backend, frontend)
docker-compose up

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down

# Reset everything (including volumes/data)
docker-compose down -v
```

---

## 19. API Reference

See [`docs/api.md`](docs/api.md) for full endpoint documentation.

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/health` | Health check | — |
| POST | `/api/search` | Search products | — |
| POST | `/api/ai/search` | Natural language search | — |
| GET | `/api/products/:id` | Get product detail | — |
| GET | `/api/products/:id/offers` | Get all offers for product | — |
| GET | `/api/products/:id/price-history` | Get price history | — |
| GET | `/api/deals` | Get trending/featured deals | — |
| POST | `/api/auth/signup` | Create account | — |
| POST | `/api/auth/login` | Login | — |
| POST | `/api/auth/logout` | Logout | 🔒 |
| GET | `/api/auth/me` | Get current user | 🔒 |
| GET | `/api/wishlist` | Get user wishlist | 🔒 |
| POST | `/api/wishlist` | Add to wishlist | 🔒 |
| DELETE | `/api/wishlist/:id` | Remove from wishlist | 🔒 |

---

## 20. Testing

See [`docs/testing.md`](docs/testing.md) for full testing strategy.

```bash
# Unit tests
cd backend && npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# End-to-end tests
cd tests && npm test
```

---

## 21. Deployment

See [`docs/deployment.md`](docs/deployment.md) for full deployment guide.

| Service | Platform | URL |
|---|---|---|
| Frontend | Vercel | `https://dealhunter.vercel.app` |
| Backend API | Render | `https://dealhunter-api.onrender.com` |
| Database | Render PostgreSQL | Internal |
| Redis | Render Redis (or Upstash) | Internal |

---

## 22. Architecture Decisions

| ADR | Decision | Status |
|---|---|---|
| [ADR-001](docs/decisions/ADR-001-tech-stack.md) | Backend: Node.js + Express + TypeScript | Accepted |
| [ADR-002](docs/decisions/ADR-002-database.md) | Database: PostgreSQL + Prisma | Accepted |
| [ADR-003](docs/decisions/ADR-003-search.md) | Search: PostgreSQL FTS (MVP), Elasticsearch later | Accepted |
| [ADR-004](docs/decisions/ADR-004-product-matching.md) | Matching: Deterministic first, fuzzy fallback | Accepted |
| [ADR-005](docs/decisions/ADR-005-deal-scoring.md) | Deal Score: Weighted configurable composite | Accepted |

---

## 23. Project Roadmap

See [`ROADMAP.md`](ROADMAP.md) for the full phase-by-phase development plan.

---

## 24. Known Limitations

- **Mock data only**: MVP uses realistic mock connectors. Real marketplace integrations require API/affiliate credentials and legal review per marketplace.
- **Price accuracy**: Since data is mocked, prices are illustrative. Real integration is required for production use.
- **Search scale**: PostgreSQL FTS is sufficient for development and early production. A search engine (Elasticsearch/Typesense) should be introduced at ~100,000+ product records.
- **Product matching**: The matching engine uses deterministic + fuzzy matching. Edge cases exist. Continuous improvement is expected.
- **AI rate limits**: Gemini free tier has rate limits. AI features may throttle under heavy load.

---

## 25. Future Improvements

- [ ] Real marketplace connectors (Amazon Product Advertising API, Flipkart Affiliate API)
- [ ] Price drop email alerts
- [ ] Elasticsearch/Typesense for scale
- [ ] Vector embeddings for semantic product search
- [ ] Personalized recommendations (user preference learning)
- [ ] Fashion & grocery category support
- [ ] Browser extension for price comparison while shopping
- [ ] Mobile app (React Native)
- [ ] Seller trust scoring (based on historical data)
- [ ] "Should I buy now?" AI analysis

---

## 26. Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for contribution guidelines.

---

## 27. License

MIT License — see [`LICENSE`](LICENSE) for details.

---

*Built with ❤️ as an interview-ready, production-quality reference architecture for a real-world shopping intelligence system.*
