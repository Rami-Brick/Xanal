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
- `zResources/XANAL-STATUS.md` for the current project snapshot
- `zResources/XANAL-ROADMAP.md` for the current product direction
- `zResources/XANAL-CHATBOT-HANDOFF.md` for current implemented context
- `zResources/PHASE1.md` for the validated backend execution plan
- `zResources/CONVERTY-API-SUMMARY.md` for the vendor OAuth/API reference actually used in this repo
- `DESIGN.md` for UI direction, visual language, and design constraints
- `supabase/migrations/001_initial.sql` for the current database schema

Historical notes may still exist under `zResources/old/`, but prefer the files above unless a task explicitly needs older planning context.

## Converty Integration Rules

- Converty is read-only for this project
- Use `https://api.converty.shop/api/v1` for API calls
- Use `https://partner.converty.shop/oauth2/token` for token exchange and refresh
- Tokens live only in Supabase and server-side environment variables
- Never expose access tokens or refresh tokens to the browser
- Use the existing token helper and retry pattern before inventing a new auth flow

Current working behavior:
- `converty_tokens` stores one token row per `store_id`
- sync orchestration can be store-aware through `converty_tokens`
- business tables currently rely on globally unique Converty IDs rather than `store_id`

Do not silently redesign the business tables around store ownership unless the data model is being changed intentionally.

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
- reference `DESIGN.md` before making visual decisions
- keep UI copy concise and operational; avoid long explanatory text blocks unless the task clearly needs them
- for dashboards and store surfaces, favor clean, high-signal composition over verbose labels or helper copy

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
1. backend sync hardening and cleanup
2. sync observability and status endpoints
3. reliable incremental and backfill behavior
4. build the primary single-store `/store` surface as the default authenticated landing page
5. keep legacy dashboard pages available as secondary surfaces

Long-term direction:
- Supabase should be the fast read layer
- Converty should be the upstream sync source
- refreshing should eventually be a mix of manual trigger, scheduled sync, and smart freshness checks
