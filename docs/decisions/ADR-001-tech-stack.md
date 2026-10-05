# ADR-001: Backend Framework & Language

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-05 |
| **Deciders** | Project owner |
| **Category** | Core Technology |

---

## Context

DealHunter requires a backend API that:
- Handles concurrent requests from connectors and AI services
- Integrates with PostgreSQL and Redis
- Serves a React frontend via REST APIs
- Is deployable to free-tier platforms (Render)
- Is explainable in a software engineering interview

The backend must be written in a language the developer is comfortable with, since this is both a learning and interview-preparation project.

---

## Options Considered

### Option A: Python + FastAPI *(Not chosen)*
**Pros:**
- Exceptional ecosystem for data science, embeddings, and ML (NumPy, scikit-learn, sentence-transformers)
- Native async (asyncio)
- Automatic OpenAPI documentation generation
- Pydantic for data validation (excellent DX)
- Widely used in production at scale
- Strong fit for product matching (NLP libraries)

**Cons:**
- Developer preference is Node.js
- For this project's AI needs (Gemini API calls), Python's ML ecosystem is not actually needed — Gemini handles the heavy lifting via HTTP
- Requires Python environment setup (virtualenv, pip, etc.)

---

### Option B: Node.js + Express.js + TypeScript *(Chosen)*
**Pros:**
- Developer's preferred language
- JavaScript/TypeScript is full-stack (same language as frontend)
- Express.js is battle-tested, widely deployed, with enormous community
- TypeScript provides type safety comparable to Python's Pydantic
- Excellent for I/O-bound tasks (our primary workload: connector calls, DB queries, Redis reads)
- Large pool of interviewers familiar with Node.js Express
- Easy deployment on Render free tier

**Cons:**
- Less natural for heavy ML/NLP tasks (not a concern because Gemini handles AI)
- node-cron is less powerful than Celery for complex job scheduling (acceptable for MVP)
- Callback complexity mitigated entirely by async/await

---

### Option C: Node.js + Fastify + TypeScript *(Not chosen)*
**Pros:**
- ~2–3x faster than Express in benchmarks
- Built-in schema validation, TypeScript support, logging
- More modern architecture

**Cons:**
- Less widely known in interviews than Express
- Smaller community, fewer examples
- Performance difference is irrelevant at MVP scale

---

### Option D: Django + Python *(Not chosen)*
**Pros:**
- Batteries-included (admin, auth, ORM out of the box)
- Django REST Framework is mature

**Cons:**
- Heavier, opinionated framework
- Django's synchronous model requires additional setup for async
- Developer preference is Node.js

---

## Decision

**Node.js + Express.js + TypeScript**

With the following constraints:
- Strict TypeScript mode (`"strict": true`)
- Layered architecture: Controller → Service → Repository
- Zod for all runtime validation
- No `any` types without justification

---

## Rationale

1. **Developer comfort** directly enables faster learning and better code quality in this context.
2. **Interview alignment**: Express.js is the most commonly discussed Node.js framework in SDE interviews. Interviewers expect familiarity with it.
3. **AI integration**: The AI requirement (Gemini) is served via HTTP API calls — no Python ML libraries are needed.
4. **TypeScript** gives us type safety comparable to Python + Pydantic, reducing runtime bugs.
5. **I/O bound workload**: Node.js's event loop is well-suited for our primary operations (HTTP calls to connectors, DB queries, Redis).

---

## Consequences

- ✅ Single language (TypeScript) across frontend and backend — less context switching
- ✅ Type safety end-to-end
- ✅ Interview-ready choice
- ⚠️ If product matching evolves to require heavy NLP (embeddings, cosine similarity at scale), a Python microservice may be added as a sidecar in Phase 2+
- ⚠️ node-cron is less powerful than Celery. For complex job scheduling in Phase 2, BullMQ (Redis-based) should be introduced

---

## What Would Change at Scale

- **At 10,000 users**: Express handles this comfortably. Add Redis rate limiting.
- **At 100,000 users**: Consider Fastify for performance. Add load balancer. Horizontally scale stateless API.
- **At 1M users**: Decompose into microservices. Connector service, matching service, scoring service. Introduce a message queue (Kafka/RabbitMQ) between them.
