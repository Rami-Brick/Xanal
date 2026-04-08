# CLAUDE.md

## Project

Xanal is a Next.js 16 analytics dashboard for Xpand Solutions, a Tunisian e-commerce business using Converty.

The app:
- connects to Converty with OAuth 2.0
- stores tokens and synced data in Supabase
- syncs products and orders from Converty
- presents business analytics through a French-language UI

Current status:
- OAuth is working
- tokens are stored in `converty_tokens`
- product sync is working
- order sync is working
- order item sync is working

Do not assume the app is still scaffold-only. Read the current codebase before making architectural decisions.

## Core Stack

- Next.js 16 App Router with `src/`
- TypeScript strict mode
- Tailwind CSS v4
- shadcn/ui
- Supabase
- Vercel

## Language Rules

- UI text must be in French
- Code, identifiers, comments, and filenames must be in English

## Source Of Truth Files

Always read these before making major decisions:
- `zResources/XANAL.md` for the long-term product and architecture direction
- `zResources/CONVERTY.md` for the vendor OAuth/API reference
- `zResources/XANAL-STATUS.md` for current implemented status
- `supabase/migrations/001_initial.sql` for the current database schema

Treat `CONVERTY.md` as vendor documentation. Do not rewrite it unless explicitly asked.

## Converty Integration Rules

- Converty is read-only for this project
- Use `https://api.converty.shop/api/v1` for API calls
- Use `https://partner.converty.shop/oauth2/token` for token exchange and refresh
- Tokens live only in Supabase and server-side environment variables
- Never expose access tokens or refresh tokens to the browser
- Use the existing token helper and retry pattern before inventing a new auth flow

Current working behavior:
- the app currently behaves as a single connected store integration
- one connected store is selected during OAuth
- sync routes use the token saved for that store

Do not silently redesign the project into multi-store mode without first making the data model explicit.

## Supabase Rules

Use the correct client for the correct job:
- `src/lib/supabase/admin.ts` for server-side write operations and sync routes
- do not use the service role in client-side code

The database already contains:
- `converty_tokens`
- `products`
- `orders`
- `order_items`
- `sync_log`
- `profiles`

Before changing schema assumptions, read the migration file first.

## Coding Rules

- Prefer simple, explicit server-side code over clever abstractions
- Keep the current repo structure consistent
- Reuse existing Converty helpers instead of duplicating request logic
- For sync logic, prioritize correctness and debuggability before optimization
- For `order_items`, replacement-per-order is acceptable unless explicitly redesigned
- Do not add speculative infrastructure that is not needed yet

## Frontend Rules

When building UI, use the installed skills:
- `frontend-design` for visual direction and polished UI work
- `vercel-react-best-practices` for React/Next.js implementation quality

If the task is a page, dashboard, settings screen, or control panel:
1. Read `.agents/skills/frontend-design/SKILL.md`
2. Read `.agents/skills/vercel-react-best-practices/SKILL.md`
3. Apply both

Frontend expectations:
- avoid generic AI-looking UI
- keep visual direction intentional and distinctive
- preserve performance and clean data flow
- prefer server-driven data reads where possible
- use French copy in the interface

## Workflow Expectations

Before coding:
- inspect the current implementation
- confirm what already works
- avoid reintroducing solved problems

When making changes:
- keep them incremental
- prefer end-to-end useful slices
- verify with typecheck and build when practical

When summarizing work:
- state what changed
- state what was verified
- state any remaining risks or next steps

## Current Recommended Direction

The backend integration foundation is already working.

Near-term priorities should generally be:
1. internal app controls and status UI
2. sync observability
3. dashboard pages backed by Supabase data
4. scheduled sync and refresh ergonomics later

Long-term direction:
- Supabase should be the fast read layer
- Converty should be the upstream sync source
- refreshing should eventually be a mix of manual trigger, scheduled sync, and smart freshness checks
