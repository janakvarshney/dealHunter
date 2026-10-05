# DealHunter — Contributing Guide

> Thank you for contributing to DealHunter!

---

## Code of Conduct

Be respectful. Be collaborative. No harassment.

---

## Development Setup

See [README.md → Local Setup](README.md#17-local-setup) for full setup instructions.

---

## Branching Strategy

```
main          ← Production-ready code only
  └── develop ← Integration branch
        └── feature/your-feature-name
        └── fix/bug-description
        └── docs/what-you-documented
        └── refactor/what-you-refactored
```

### Branch naming
- `feature/product-matching-engine`
- `fix/deal-score-null-shipping`
- `docs/update-connector-guide`
- `refactor/repository-layer`

---

## Commit Messages

Follow Conventional Commits: https://www.conventionalcommits.org

```
feat: add Croma connector with mock data
fix: handle missing shipping cost in true cost calculator
docs: document deal scoring algorithm
refactor: extract attribute extractor into separate module
test: add unit tests for fuzzy matcher
chore: update dependencies
```

---

## Pull Requests

Before opening a PR:

1. Your code compiles with no TypeScript errors: `npm run typecheck`
2. Lint passes: `npm run lint`
3. All tests pass: `npm test`
4. You've added tests for new business logic
5. You've updated relevant documentation

PR title should follow the same Conventional Commits format.

---

## Architecture Decisions

If you are making a significant architectural change:

1. Create or update the relevant ADR in `docs/decisions/`
2. Discuss in the PR description
3. Wait for approval before merging

---

## Code Standards

- **TypeScript strict mode** — no `any` types without justification
- **Zod validation** on all API inputs
- **No marketplace-specific logic** outside its connector module
- **Functions should be testable** in isolation (avoid hidden side effects)
- **Document public functions** with JSDoc comments

---

## Testing

- Unit tests go in `backend/tests/unit/`
- Integration tests go in `backend/tests/integration/`
- End-to-end tests go in `tests/e2e/`
- Test files are co-located or mirrored: `matching/pipeline.ts` → `tests/unit/matching/pipeline.test.ts`

---

## Never Commit

- `.env` files (real secrets)
- API keys, passwords, tokens
- `node_modules/`
- Build artifacts (`dist/`, `build/`)

---

## Secrets Check

Before committing, verify no secrets are staged:
```bash
git diff --staged | grep -i "api_key\|secret\|password\|token"
```
