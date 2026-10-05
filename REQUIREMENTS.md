# DealHunter — Requirements Document

> **Status:** Active | **Version:** 1.0 | **Last Updated:** 2026-10-05

---

## Table of Contents

1. [Project Context](#1-project-context)
2. [Functional Requirements](#2-functional-requirements)
3. [Non-Functional Requirements](#3-non-functional-requirements)
4. [User Stories](#4-user-stories)
5. [Acceptance Criteria](#5-acceptance-criteria)
6. [Constraints](#6-constraints)
7. [Assumptions](#7-assumptions)
8. [Risks](#8-risks)
9. [Open Questions](#9-open-questions)

---

## 1. Project Context

**Product Name:** DealHunter  
**Purpose:** Interview-ready, production-quality shopping intelligence platform  
**Target Market:** India (INR, Indian marketplaces)  
**Platform:** Web (browser-based)  
**Primary User:** Indian consumer shopping for electronics and home appliances

---

## 2. Functional Requirements

### FR-001 — Product Search
- **FR-001.1** The system shall allow users to search for products using a text query.
- **FR-001.2** The system shall return matching product results from multiple sources.
- **FR-001.3** The system shall support filtering by: price range, brand, store, product rating, availability, category.
- **FR-001.4** The system shall support sorting by: Best Deal Score, Lowest Price, Highest Rating, Fastest Delivery, Biggest Discount.
- **FR-001.5** Search results shall be paginated (default: 20 per page).

### FR-002 — AI Natural Language Search
- **FR-002.1** The system shall accept natural language queries (e.g., "laptop under ₹90,000 for gaming").
- **FR-002.2** The AI shall extract structured attributes from natural language: category, budget, use case, preferences.
- **FR-002.3** The AI search endpoint shall function gracefully without an API key (return structured error, fall back to keyword search).

### FR-003 — Offer Aggregation
- **FR-003.1** The system shall aggregate product offers from at least 3 sources (Amazon IN, Flipkart, Croma).
- **FR-003.2** Each offer shall be normalized to the standard `ProductOffer` schema.
- **FR-003.3** If a connector fails or times out, the system shall continue serving results from available connectors.
- **FR-003.4** Each offer shall display the source, timestamp of data retrieval, and a freshness indicator.

### FR-004 — Product Matching
- **FR-004.1** The system shall group offers from different sources that represent the same product variant.
- **FR-004.2** Matching shall use identifier-based matching (GTIN/EAN/UPC) where available as the primary method.
- **FR-004.3** Matching shall fall back to attribute-based matching (brand + model + variant attributes).
- **FR-004.4** Matching shall fall back to fuzzy text matching as a last resort, with a confidence score.
- **FR-004.5** Matches below a minimum confidence threshold shall not be grouped.

### FR-005 — True Cost Calculation
- **FR-005.1** The system shall calculate True Cost as: Discounted Price + Shipping − Applied Discounts − Confirmed Cashback.
- **FR-005.2** Only confirmed, currently valid discounts shall be subtracted.
- **FR-005.3** The system shall clearly distinguish: Listed Price, Discounted Price, Effective Price.
- **FR-005.4** If shipping cost data is unavailable, it shall be displayed as "Check at merchant."

### FR-006 — Deal Score
- **FR-006.1** Each offer shall receive a Deal Score from 0–100.
- **FR-006.2** The Deal Score shall be calculated from: effective price (35%), seller score (20%), product rating (15%), delivery speed (15%), return policy (10%), price history (5%).
- **FR-006.3** The weights shall be configurable via environment variables or a config file.
- **FR-006.4** The system shall recommend the offer with the highest Deal Score as "Best Deal."

### FR-007 — Deal Explanation
- **FR-007.1** The system shall display an itemized explanation for why a deal was recommended.
- **FR-007.2** The explanation shall list each factor and its contribution.
- **FR-007.3** Example: "✓ Lowest effective price · ✓ Trusted seller · ✓ Free delivery"

### FR-008 — Price History
- **FR-008.1** The system shall store historical price data per product per source.
- **FR-008.2** Price history shall be displayed as a visual chart.
- **FR-008.3** The system shall indicate if the current price is above/below the 30-day average.

### FR-009 — Product Detail Page
- **FR-009.1** The product page shall display: product images, title, specifications, best deal, all sellers, price comparison table, deal score, price history chart, review summary (AI), pros/cons, buy buttons.
- **FR-009.2** "Buy Now" shall redirect to the merchant's product page in a new tab.
- **FR-009.3** The UI shall display the data freshness timestamp on each offer.

### FR-010 — User Authentication
- **FR-010.1** Users shall be able to create an account with email and password.
- **FR-010.2** Users shall be able to log in and log out.
- **FR-010.3** Authentication shall use JWT stored in httpOnly, SameSite=Strict cookies.
- **FR-010.4** Passwords shall be hashed with bcrypt (cost factor 12).
- **FR-010.5** Email addresses shall be validated for correct format.

### FR-011 — Wishlist
- **FR-011.1** Authenticated users shall be able to save products to a wishlist.
- **FR-011.2** Users shall be able to view and remove items from their wishlist.
- **FR-011.3** Wishlist items shall display the current best deal for the saved product.

### FR-012 — Review Summarization (AI)
- **FR-012.1** The system shall provide an AI-generated pros/cons summary of product reviews.
- **FR-012.2** The summary shall clearly indicate it is AI-generated.
- **FR-012.3** This feature shall degrade gracefully if the AI API is unavailable.

### FR-013 — Connector Architecture
- **FR-013.1** All connectors shall implement the `BaseConnector` interface.
- **FR-013.2** Connectors shall be independently togglable.
- **FR-013.3** Connector failures shall be logged and shall not affect results from other connectors.
- **FR-013.4** Each connector shall report its availability status.

---

## 3. Non-Functional Requirements

### NFR-001 — Performance
- **NFR-001.1** Search results shall be returned within 2 seconds for cached queries.
- **NFR-001.2** Search results shall be returned within 5 seconds for uncached queries.
- **NFR-001.3** Product detail pages shall load within 3 seconds.
- **NFR-001.4** The frontend shall achieve Lighthouse Performance score ≥ 80.

### NFR-002 — Scalability
- **NFR-002.1** The system shall be designed to handle 100 concurrent users in MVP without degradation.
- **NFR-002.2** The architecture shall support horizontal scaling of the backend (stateless API).
- **NFR-002.3** Database queries on `PriceHistory` shall use proper indexes for time-range scans.

### NFR-003 — Reliability
- **NFR-003.1** Connector failures shall not cause system-wide downtime.
- **NFR-003.2** The system shall respond with partial results when some connectors fail.
- **NFR-003.3** Database availability target: 99.5% uptime (Render SLA).

### NFR-004 — Security
- **NFR-004.1** No plaintext passwords shall be stored.
- **NFR-004.2** No secrets shall be committed to version control.
- **NFR-004.3** All API inputs shall be validated with Zod schemas.
- **NFR-004.4** SQL injection shall be prevented by Prisma parameterized queries.
- **NFR-004.5** Rate limiting shall be enforced on all public endpoints.

### NFR-005 — Maintainability
- **NFR-005.1** All backend code shall be written in TypeScript (strict mode).
- **NFR-005.2** Functions shall be testable in isolation (dependency injection).
- **NFR-005.3** No marketplace-specific logic shall exist outside its connector module.
- **NFR-005.4** New connectors shall be addable without modifying existing connectors.

### NFR-006 — Transparency
- **NFR-006.1** Every deal recommendation shall have an explainability panel.
- **NFR-006.2** Data freshness shall be visible on every offer.
- **NFR-006.3** AI-generated content shall be labelled as such.

### NFR-007 — Accessibility
- **NFR-007.1** The frontend shall follow WCAG 2.1 AA guidelines.
- **NFR-007.2** All interactive elements shall be keyboard-navigable.

### NFR-008 — Portability
- **NFR-008.1** The system shall be runnable locally via Docker Compose.
- **NFR-008.2** A new developer shall be able to run the project locally following the README in under 30 minutes.

---

## 4. User Stories

### Search & Discovery

| ID | User Story | Priority |
|---|---|---|
| US-001 | As a user, I want to search for a product by name so I can see prices from multiple stores. | P0 |
| US-002 | As a user, I want to use natural language to describe what I need ("laptop for gaming under ₹80,000") so the system understands my intent. | P1 |
| US-003 | As a user, I want to filter search results by price, brand, and store so I can narrow down options. | P0 |
| US-004 | As a user, I want to sort results by "Best Deal" so the system shows me the most intelligent recommendation first. | P0 |

### Comparison

| ID | User Story | Priority |
|---|---|---|
| US-005 | As a user, I want to see all offers for a product side-by-side so I can compare stores. | P0 |
| US-006 | As a user, I want to see the true effective cost of each offer (including shipping, discounts) so I know what I'll actually pay. | P0 |
| US-007 | As a user, I want to see a "Best Deal" recommendation with an explanation so I can trust the recommendation. | P0 |
| US-008 | As a user, I want to see the seller's rating so I can avoid purchasing from unreliable sellers. | P0 |

### Price Intelligence

| ID | User Story | Priority |
|---|---|---|
| US-009 | As a user, I want to see the price history of a product so I know if now is a good time to buy. | P1 |
| US-010 | As a user, I want to see if the current price is above or below the 30-day average. | P1 |

### User Account

| ID | User Story | Priority |
|---|---|---|
| US-011 | As a user, I want to create an account so I can save products for later. | P1 |
| US-012 | As an authenticated user, I want to save products to a wishlist. | P1 |
| US-013 | As an authenticated user, I want to view my wishlist and see the current best deal for each saved product. | P1 |

### AI Features

| ID | User Story | Priority |
|---|---|---|
| US-014 | As a user, I want to see a summary of pros and cons from reviews so I don't have to read hundreds of reviews. | P1 |
| US-015 | As a user, I want the system to understand "I need a phone with good camera under ₹30,000" without me needing to use exact keywords. | P1 |

---

## 5. Acceptance Criteria

### AC-001 — Search
- [ ] Given a search query "iPhone 16 256GB", when the user submits the search, then results appear within 5 seconds.
- [ ] Given a search query, when results appear, they are sorted by Deal Score by default.
- [ ] Given a connector failure (e.g., Croma times out), when results appear, Amazon and Flipkart results are still shown with a note "Croma: Temporarily unavailable."

### AC-002 — Deal Score
- [ ] Given a product with offers from 3 sources, when the Deal Score is calculated, the offer with the lowest effective price, fastest delivery, and highest seller rating ranks highest.
- [ ] Given a Deal Score is displayed, there is a visible "Why this deal?" panel explaining the score.

### AC-003 — Authentication
- [ ] Given a user submits the signup form with a valid email and password ≥8 characters, they are registered and logged in.
- [ ] Given a user is logged in, their JWT is stored in an httpOnly cookie (not accessible via JavaScript).
- [ ] Given an expired/invalid JWT, the API returns 401 Unauthorized.

---

## 6. Constraints

| Constraint | Description |
|---|---|
| **Legal** | We cannot use real marketplace data without proper API/affiliate agreements. MVP uses mock data. |
| **Budget** | Zero budget for infrastructure. Uses free tiers of Render, Vercel, and Gemini. |
| **Team** | Solo developer. Complexity must be manageable. |
| **Timeline** | Milestone-based. No hard deadline. |
| **AI API** | Gemini free tier has rate limits (~60 requests/minute). AI features must handle rate limit errors gracefully. |

---

## 7. Assumptions

| # | Assumption |
|---|---|
| A-001 | Users are primarily on desktop browsers. Mobile responsiveness is required but mobile-first is not the priority. |
| A-002 | MVP product data will be mock data that is realistic and well-structured. |
| A-003 | The Gemini API key will be provided before Phase 9 (AI integration). |
| A-004 | PostgreSQL and Redis will be provisioned on Render free tier. |
| A-005 | Product categories in MVP are limited to: Electronics (phones, laptops, tablets) and Home Appliances (TVs, ACs, washing machines). |
| A-006 | Prices are in INR only. Multi-currency is out of scope for MVP. |
| A-007 | Return policy, warranty data may not be available for all offers. Missing data is displayed as "Not specified." |

---

## 8. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Real marketplace APIs unavailable/restricted | High | High | Use mock connectors in MVP. Document connector interface for easy swap. |
| Gemini API rate limits | Medium | Low | Graceful degradation. Cache AI responses. |
| Product matching false positives | Medium | Medium | Conservative confidence thresholds. Manual review of edge cases. |
| Render free tier cold starts (backend) | High | Medium | Keep-alive ping. Warn users of potential delay. |
| PostgreSQL free tier storage limits | Low | Medium | Monitor usage. Prune old PriceHistory records. |

---

## 9. Open Questions

| # | Question | Status |
|---|---|---|
| OQ-001 | Should the MVP support a product comparison feature (side-by-side comparison of 2–4 products)? | 🔲 Pending decision |
| OQ-002 | What is the target mock dataset size? (e.g., 100 products? 1000?) | 🔲 Pending decision |
| OQ-003 | Should deal weights be configurable per-user, or system-wide only in MVP? | 🔲 System-wide for MVP |
| OQ-004 | Should "Login with Google" (OAuth) be included in MVP auth? | 🔲 Pending decision |
| OQ-005 | Should price history be seeded with historical mock data, or start from scratch? | 🔲 Seed with 90 days of mock history |
