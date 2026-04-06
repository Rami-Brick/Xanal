# AGENTS.md — Xanal Project Conventions

This file is the Codex/OpenAI Agents equivalent of CLAUDE.md.
It contains the same conventions. See CLAUDE.md for the authoritative version.

## Project

Xanal is a Next.js 15 analytics dashboard for Xpand Solutions (Tunisian e-commerce).
It pulls order and product data from the Converty API, stores it in Supabase,
and presents business intelligence through a French-language dashboard UI.

## Language Convention

- **UI text**: French (labels, buttons, page titles, error messages, toasts)
- **Code**: English (variable names, function names, comments, file names)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router, `src/` directory) |
| Language | TypeScript strict mode |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui (base-nova preset, Radix) |
| Charts | shadcn/ui chart components (Recharts) |
| Database | Supabase (PostgreSQL + RLS) |
| Hosting | Vercel |

## External APIs

### Converty API
- Base URL: `https://api.converty.shop/api/v1`
- OAuth token endpoint: `https://partner.converty.shop/oauth2/token`
- Authentication: OAuth 2.0 Bearer tokens
- Rate limits: 60 req/min (API), 30 req/min (OAuth endpoints)
- **All operations are READ-ONLY**

## File Naming

| Type | Convention | Example |
|------|------------|---------|
| Files/directories | kebab-case | `order-detail-card.tsx` |
| React components | PascalCase | `OrderDetailCard` |
| Functions/variables | camelCase | `fetchOrders` |
| Database columns | snake_case | `order_items` |
| API URL segments | kebab-case | `/api/sync/orders` |

## API Response Format

```typescript
interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
```

## Supabase Client Rules

| Client | File | When to use |
|--------|------|-------------|
| Browser | `src/lib/supabase/client.ts` | `'use client'` components only |
| Server | `src/lib/supabase/server.ts` | Server Components, Route Handlers |
| Admin | `src/lib/supabase/admin.ts` | API routes needing RLS bypass only |

## Git Conventions

- Main branch: `main`
- Feature branches: `feature/phase-N-description`
- Commit style: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`)
- Never commit `.env.local`, `node_modules/`, `.next/`, `.agents/`, `.claude/`, `zResources/`
