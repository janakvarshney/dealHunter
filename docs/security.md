# DealHunter — Security Architecture

> **Status:** Living document | **Last Updated:** 2026-10-05

---

## Security Principles

1. **Defense in depth** — Multiple layers of protection
2. **Least privilege** — Services only access what they need
3. **Secrets never in code** — Environment variables only
4. **Input validation at every boundary** — Never trust client input
5. **Fail securely** — Errors reveal no sensitive information

---

## Authentication: JWT + httpOnly Cookies

### Why httpOnly cookies instead of localStorage?

```
localStorage JWT:
  - Accessible via JavaScript: document.cookie, localStorage.getItem()
  - Vulnerable to XSS: if attacker injects JS, they steal the token
  - Token can be read and sent to attacker's server

httpOnly cookie JWT:
  - NOT accessible via JavaScript (browser enforces this)
  - XSS cannot steal it
  - Automatically sent by browser with each request to same domain
  - Still needs CSRF protection (handled by SameSite=Strict)
```

### Cookie Configuration

```typescript
res.cookie('dh_access_token', token, {
  httpOnly: true,          // Not accessible via JavaScript
  secure: true,            // HTTPS only (in production)
  sameSite: 'strict',      // CSRF protection: only sent for same-site requests
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
  path: '/',
});
```

### JWT Payload

```typescript
interface JWTPayload {
  sub: string;       // User UUID (never email or PII)
  iat: number;       // Issued at
  exp: number;       // Expires at
  // No role, email, or sensitive data in payload
}
```

### Token Validation Flow

```
Request with cookie
    │
    ▼
JWT middleware extracts token from httpOnly cookie
    │
    ▼
Verify signature using JWT_SECRET
    │
    ▼
Check expiry
    │
    ▼
Look up user by sub (UUID) in DB
    │
    ▼
Attach user to req.user
    │
    ▼
Route handler executes
```

---

## Password Security

```typescript
// On signup:
const hash = await bcrypt.hash(password, 12);
// Cost factor 12: ~250ms hashing time (strong enough for 2024)

// On login:
const isValid = await bcrypt.compare(password, storedHash);
```

**Why bcrypt?**
- Adaptive: cost factor can be increased as hardware improves
- Salted by design: same password produces different hash every time
- Industry standard for web applications

**Never store:** plaintext passwords, MD5/SHA1 hashes

---

## Input Validation (Zod)

All API inputs are validated with Zod before reaching business logic:

```typescript
// Example: search endpoint
const SearchSchema = z.object({
  query: z.string().min(1).max(200).trim(),
  page: z.coerce.number().int().min(1).max(100).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().max(10_000_000).optional(),
  brand: z.string().max(100).optional(),
  source: z.enum(['amazon_in', 'flipkart', 'croma']).optional(),
});

// Validation middleware:
const validate = (schema: ZodSchema) => (req, res, next) => {
  const result = schema.safeParse(req.body ?? req.query);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }
  req.validated = result.data;
  next();
};
```

---

## SQL Injection Prevention

Prisma uses parameterized queries by default. Direct SQL injection via Prisma's query builder is not possible.

```typescript
// Safe — Prisma parameterizes automatically:
await prisma.product.findMany({
  where: { brand: userInput }  // userInput is never interpolated into SQL
});

// Raw queries (if needed) must use tagged template literals:
await prisma.$queryRaw`SELECT * FROM products WHERE brand = ${userInput}`;
// NOT: prisma.$queryRawUnsafe(`SELECT * FROM products WHERE brand = '${userInput}'`)
```

---

## CORS

```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL,   // Exact origin, not '*'
  credentials: true,                   // Required for httpOnly cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Request-ID'],
}));
```

---

## Rate Limiting

```typescript
// Global rate limit
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,    // 15 minutes
  max: 100,                      // 100 requests per window
  standardHeaders: true,
  store: new RedisStore({ client: redis }),  // Distributed rate limiting
}));

// AI endpoints: stricter limit (Gemini costs money)
app.use('/api/ai/', rateLimit({
  windowMs: 60 * 1000,          // 1 minute
  max: 5,                        // 5 AI requests per minute
}));
```

---

## Error Response Security

Never expose internal details in error responses:

```typescript
// BAD — reveals internal implementation:
res.status(500).json({ error: err.message });  // Could expose SQL, file paths, etc.

// GOOD — safe, structured error:
res.status(500).json({
  error: {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred. Please try again.',
    requestId: req.requestId,   // For internal tracing only
  }
});
```

Detailed errors are logged server-side only, not returned to clients.

---

## Secrets Management

### Rules
1. All secrets in `.env` — never hardcoded
2. `.env` is in `.gitignore` — never committed
3. `.env.example` contains placeholder values only
4. Production secrets set in Render/Vercel dashboard
5. No secrets in logs

### Secret Rotation
- JWT_SECRET: Rotate by changing env variable (all existing tokens immediately invalidated)
- GEMINI_API_KEY: Rotate in Google AI Studio + update env variable
- DATABASE_URL: Rotate via Render dashboard (requires app restart)

---

## Security Checklist

Before each deployment:
- [ ] No secrets in `.env` files committed
- [ ] `npm audit` passes (or known vulnerabilities documented)
- [ ] All API inputs validated with Zod
- [ ] Rate limiting configured
- [ ] CORS restricted to known frontend URL
- [ ] Error responses reveal no internal details
- [ ] JWT cookie is httpOnly + Secure + SameSite=Strict
- [ ] bcrypt cost factor is ≥ 12

---

## Known Limitations (MVP)

- **No refresh token**: JWT expires in 7 days; user must re-login
- **No account lockout**: Rate limiting is by IP, not by account (could be improved)
- **No 2FA**: Not in MVP scope
- **No audit log**: Security events are logged but not in a dedicated audit log
