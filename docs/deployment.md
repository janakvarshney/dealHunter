# DealHunter — Deployment Guide

> **Status:** Draft — finalized in Phase 13 | **Last Updated:** 2026-10-05

---

## Deployment Architecture

```
User Browser
    │
    ▼
Vercel (Frontend: React + Vite)
    │  API calls
    ▼
Render (Backend: Node.js + Express)
    │                    │
    ▼                    ▼
Render PostgreSQL    Render Redis (or Upstash)
```

---

## Frontend: Vercel

### Why Vercel?
- Free tier, no credit card required
- Automatic deploys on git push
- Global CDN
- Zero configuration for Vite apps

### Setup Steps
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project" → Import from GitHub
3. Select your repository → set root directory to `frontend/`
4. Framework: Vite (auto-detected)
5. Environment variables:
   ```
   VITE_API_URL=https://your-backend.onrender.com
   ```
6. Deploy

Every commit to `main` triggers automatic redeployment.

---

## Backend: Render

### Why Render?
- Free tier (with limitations: sleeps after 15 min of inactivity)
- Managed PostgreSQL and Redis on free tier
- Simple deployment from GitHub

### Backend Setup
1. Go to [render.com](https://render.com) and sign in
2. "New" → "Web Service" → Connect GitHub
3. Select repository → Root directory: `backend/`
4. Runtime: Node
5. Build command: `npm install && npm run build`
6. Start command: `npm start`
7. Environment variables: (see `.env.example` for full list)
   ```
   NODE_ENV=production
   DATABASE_URL=<from Render PostgreSQL>
   REDIS_URL=<from Render Redis>
   JWT_SECRET=<generate random>
   GEMINI_API_KEY=<from Google AI Studio>
   FRONTEND_URL=https://your-app.vercel.app
   ```

### PostgreSQL on Render
1. "New" → "PostgreSQL"
2. Free tier: 1GB storage, 90-day auto-delete (set calendar reminder)
3. Copy Internal Database URL → paste as `DATABASE_URL` in backend service

### Redis on Render
1. "New" → "Redis"
2. Free tier: 25MB (sufficient for MVP)
3. Copy Internal Redis URL → paste as `REDIS_URL`

---

## Free Tier Limitations

| Service | Limitation | Impact | Mitigation |
|---|---|---|---|
| Render (free) | Sleeps after 15 min | First request after sleep: ~30s | Keep-alive ping service, or upgrade |
| Render PostgreSQL | 90-day expiry | DB deleted after 90 days | Note in calendar; backup before expiry |
| Render Redis | 25MB | Sufficient for MVP | Monitor usage |
| Vercel | 100GB bandwidth/month | Unlikely to hit | Fine for development/demo |
| Gemini | 1,500 req/day | Could hit with active use | Cache responses aggressively |

---

## Environment Variables for Production

| Variable | Where to set | Notes |
|---|---|---|
| `DATABASE_URL` | Render backend service | Use "Internal" URL for same-region |
| `REDIS_URL` | Render backend service | Use "Internal" URL |
| `JWT_SECRET` | Render backend service | Generate: `openssl rand -hex 64` |
| `GEMINI_API_KEY` | Render backend service | From aistudio.google.com |
| `FRONTEND_URL` | Render backend service | Your Vercel URL |
| `NODE_ENV` | Render backend service | `production` |
| `VITE_API_URL` | Vercel frontend | Your Render backend URL |

---

## Running Database Migrations on Render

After first deploy, run migrations via Render Shell:
```bash
cd backend && npx prisma migrate deploy
```

---

## Docker (Local Development)

```bash
# Start all services
docker-compose up

# Backend runs on: http://localhost:4000
# Frontend runs on: http://localhost:5173
# PostgreSQL: localhost:5432
# Redis: localhost:6379

# Stop
docker-compose down

# Reset all data
docker-compose down -v
```

---

*Full deployment configuration will be completed in Phase 13.*
