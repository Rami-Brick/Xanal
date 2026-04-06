# CLAUDE.md — Xanal Project Conventions

This file instructs Claude Code on conventions for this project.
Read this before making any changes.

## Project

Xanal is a Next.js 15 analytics dashboard for Xpand Solutions (Tunisian e-commerce).
It pulls order and product data from the Converty API, stores it in Supabase,
and presents business intelligence through a French-language dashboard UI.

## Language Convention

- **UI text**: French (labels, buttons, page titles, error messages, toasts)
- **Code**: English (variable names, function names, comments, file names)

```tsx
// Correct: English code, French UI
const fetchOrders = async () => { ... }
return <Button>Actualiser</Button>

// Wrong: French variable names
const récupérerCommandes = async () => { ... }
```

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
- **All operations are READ-ONLY** — never write/update/delete via Converty API

## File Naming

| Type | Convention | Example |
|------|------------|---------|
| Files/directories | kebab-case | `order-detail-card.tsx` |
| React components | PascalCase | `OrderDetailCard` |
| Functions/variables | camelCase | `fetchOrders` |
| Database columns | snake_case | `order_items` |
| API URL segments | kebab-case | `/api/sync/orders` |

## Directory Structure

```
src/
  app/
    (auth)/           # Login page (no sidebar)
    (dashboard)/      # Dashboard pages (with sidebar)
    api/
      auth/callback/  # Converty OAuth callback
      sync/           # Manual sync triggers
      cron/sync/      # Vercel Cron endpoint
  components/
    ui/               # shadcn/ui components — do not hand-edit
    layout/           # Sidebar, header, mobile nav
    dashboard/        # KPI cards, charts
    orders/           # Orders table, filters, detail
    products/         # Products table, stats
  lib/
    supabase/
      client.ts       # Browser client (use in 'use client' components)
      server.ts       # Server client with cookie auth (use in RSC / Route Handlers)
      admin.ts        # Service role client — bypasses RLS, API routes only
    converty/
      client.ts       # Converty API wrapper (Phase 2)
      auth.ts         # Token management: getValidToken, refreshToken (Phase 2)
      types.ts        # TypeScript types for Converty API responses (Phase 2)
  hooks/              # React custom hooks
  types/
    index.ts          # Shared app types
    database.ts       # Supabase generated types (Phase 2)
supabase/
  migrations/         # SQL migration files (001_initial.sql, etc.)
```

## API Response Format

All `/api/*` routes return:

```typescript
interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
```

```typescript
// Success
return Response.json({ success: true, data: orders })

// Error
return Response.json({ success: false, error: 'Token expired' }, { status: 401 })
```

## Supabase Client Rules

| Client | File | When to use |
|--------|------|-------------|
| Browser | `src/lib/supabase/client.ts` | `'use client'` components only |
| Server | `src/lib/supabase/server.ts` | Server Components, Route Handlers (session-aware) |
| Admin | `src/lib/supabase/admin.ts` | API routes needing RLS bypass (sync, OAuth callback) |

**Never import `admin.ts` in components or client-side code.**

## Data Architecture

- Dashboard reads: anon key + RLS policies (user must be authenticated)
- Sync writes: service role key (bypasses RLS)
- Never store raw Converty API responses — flatten and normalize before inserting
- Ignore the `combinations` field on products/cart items (deeply nested, not needed)
- Currency: TND with 3 decimal places (`DECIMAL(10,3)`)

## Component Guidelines

- Prefer React Server Components for data-fetching pages
- Use `'use client'` only when interactivity is required (forms, charts, dropdowns)
- Use shadcn/ui primitives — do not rebuild what shadcn provides
- All pages must be responsive down to 375px width

## Git Conventions

- Main branch: `main`
- Feature branches: `feature/phase-N-description`
- Commit style: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`)
- Never commit `.env.local` — it is gitignored
- Never commit `node_modules/`, `.next/`, `.agents/`, `.claude/`, `zResources/`
