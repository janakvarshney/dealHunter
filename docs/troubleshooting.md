# DealHunter — Troubleshooting Guide

> **Last Updated:** 2026-10-05

---

## Common Issues

### Backend won't start

**Error:** `Cannot connect to database`
```
Solution:
1. Check DATABASE_URL in .env
2. Ensure PostgreSQL is running: docker-compose up postgres
3. Run migrations: cd backend && npx prisma migrate dev
```

**Error:** `JWT_SECRET is not defined`
```
Solution:
1. Copy .env.example to .env
2. Fill in JWT_SECRET with a long random string
3. Generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

### Prisma errors

**Error:** `Cannot find module '@prisma/client'`
```
Solution: cd backend && npx prisma generate
```

**Error:** `Migration failed`
```
Solution:
1. Check that PostgreSQL is running
2. Check DATABASE_URL is correct
3. Reset dev DB: npx prisma migrate reset (WARNING: deletes all data)
```

---

### AI features not working

**Error:** `Gemini API key missing`
```
Solution:
1. Get key at: https://aistudio.google.com
2. Add to .env: GEMINI_API_KEY=your_key_here
3. Restart backend

Note: AI features gracefully degrade without the key — 
search still works via keyword matching.
```

**Error:** `Gemini rate limit exceeded`
```
Solution:
1. Gemini free tier: 60 req/min, 1,500 req/day
2. AI responses are cached — wait for cache to warm up
3. For heavy testing, use ENABLE_AI_SEARCH=false
```

---

### Frontend can't reach backend

**Error:** `Network Error` / `CORS error`
```
Solution:
1. Check VITE_API_URL in frontend/.env (should be http://localhost:4000 in dev)
2. Check FRONTEND_URL in backend/.env (should be http://localhost:5173 in dev)
3. Ensure backend is running on port 4000
4. Check CORS config in backend allows your frontend URL
```

---

### Render deployment issues

**Problem:** Backend sleeps and first request is slow (~30s)
```
Solution:
1. This is expected on Render free tier (sleeps after 15 min)
2. A loading indicator in the frontend helps UX
3. Upgrade to paid tier ($7/mo) to prevent sleeping
4. Or use a keep-alive service (e.g., UptimeRobot pinging /api/health)
```

**Problem:** Database deleted on Render
```
Solution:
Render PostgreSQL free tier deletes databases after 90 days.
Set a calendar reminder 2 weeks before expiry to:
1. Export data: pg_dump
2. Re-create the database
3. Re-run migrations and seed
```

---

### Docker issues

**Problem:** Port already in use
```
Solution:
1. Check what's using the port: netstat -ano | findstr :5432
2. Stop the process, or change the port in docker-compose.yml
```

**Problem:** Container won't start
```
Solution:
1. Check logs: docker-compose logs backend
2. Verify .env file exists
3. Try: docker-compose down -v && docker-compose up --build
```

---

*Add new issues here as they are discovered during development.*
