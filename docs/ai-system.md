# DealHunter — AI System

> **Status:** Draft — implemented in Phase 9 | **Last Updated:** 2026-10-05

---

## Overview

DealHunter uses Google Gemini for two AI capabilities in MVP:

1. **Natural Language Search** — transforms user's free-text into structured search parameters
2. **Review Summarization** — condenses product reviews into bullet-point pros/cons

AI is **entirely optional** — the platform functions without a Gemini API key. AI features degrade gracefully when the key is missing or the API is unavailable.

---

## Principle: AI Where It Adds Value

We use AI only where **semantic reasoning** provides genuine value:

| Task | Approach | Why |
|---|---|---|
| Product price | Structured data | Exact, no AI needed |
| Brand extraction | Regex + dictionary | Deterministic, faster |
| Product matching | Attribute matching | Cheaper, faster, more accurate |
| Review summarization | **Gemini** | Semantic understanding of sentiment |
| NL query parsing | **Gemini** | Language understanding |
| Deal recommendation | Algorithm | Deterministic, explainable |

---

## Feature 1: Natural Language Search

### User Input
```
"laptop under 90000 for gaming and software development, good battery life, no RGB"
```

### Gemini Prompt
```
You are a shopping assistant that extracts structured search parameters from user queries.

Given this query: "{userQuery}"

Extract and return JSON matching this schema:
{
  "category": string,           // "laptop" | "phone" | "tv" | etc.
  "maxBudget": number | null,   // in INR
  "minBudget": number | null,
  "useCases": string[],         // e.g., ["gaming", "software_development"]
  "brands": string[],           // specific brands if mentioned
  "preferences": {
    "battery": "high" | "medium" | "low" | null,
    "performance": "high" | "medium" | "low" | null,
    "portability": "high" | "medium" | "low" | null,
    "display": "high" | "medium" | "low" | null,
    "rgb": "low" | null         // "low" means user doesn't want RGB
  },
  "keywords": string[]          // remaining important keywords
}

Return ONLY valid JSON. No explanation.
```

### Gemini Response
```json
{
  "category": "laptop",
  "maxBudget": 90000,
  "minBudget": null,
  "useCases": ["gaming", "software_development"],
  "brands": [],
  "preferences": {
    "battery": "high",
    "performance": "high",
    "portability": null,
    "display": null,
    "rgb": "low"
  },
  "keywords": ["good battery", "no rgb"]
}
```

### This JSON Then Drives
1. Category filter: `category = "laptop"`
2. Price filter: `maxPrice = 90000`
3. Tag/attribute filter: `battery_life = high`, `performance = high`
4. Keyword search: `"laptop gaming development"`

---

## Feature 2: Review Summarization

### Input
Raw review text (first 50 reviews or 4000 tokens, whichever is smaller)

### Prompt
```
Summarize the following product reviews into:
- 5 pros (things users like most)
- 5 cons (most common complaints)
- Overall sentiment (positive / mixed / negative)

Reviews:
{reviews}

Return JSON:
{
  "pros": string[],
  "cons": string[],
  "overallSentiment": "positive" | "mixed" | "negative",
  "reviewCount": number
}

Base the summary only on information in the reviews. Do not add your own opinions.
```

---

## Graceful Degradation

```typescript
try {
  const result = await geminiClient.parseQuery(userQuery);
  return result;
} catch (error) {
  if (error.code === 'API_KEY_MISSING') {
    // Fall back to keyword search
    return { keywords: [userQuery], isAiFallback: true };
  }
  if (error.code === 'RATE_LIMITED') {
    // Use cache or fall back
    return cached ?? { keywords: [userQuery], isAiFallback: true };
  }
  throw error;
}
```

The frontend shows "AI search unavailable — showing keyword results" when falling back.

---

## Caching AI Responses

AI calls are expensive and rate-limited. We cache:

| Cache | Key | TTL |
|---|---|---|
| Query parse | `ai:query:{hash(query)}` | 30 minutes |
| Review summary | `ai:reviews:{variantId}` | 24 hours |

Reviews don't change frequently — 24-hour cache is appropriate.

---

## Rate Limiting AI Endpoints

```
/api/ai/search: 5 requests/minute per IP
/api/ai/summarize: 10 requests/minute per IP
```

Higher limits are acceptable because we cache responses aggressively.

---

## API Key Setup

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Sign in with Google account
3. Click "Get API key" → "Create API key"
4. Copy the key
5. Add to `.env`: `GEMINI_API_KEY=your_key_here`

Free tier limits (as of 2024): 60 requests/minute, 1,500 requests/day for Gemini 1.5 Flash.

---

*Implementation will be added in Phase 9.*
