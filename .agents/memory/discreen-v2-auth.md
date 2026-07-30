---
name: Discreen V2 auth system
description: Supabase auth replaced by local username/password. How it works and where the code lives.
---

# Discreen V2 — Auth system

## Rule
Never re-introduce Supabase JWT as the primary auth path. The V2 system uses server-side express-session with bcrypt-hashed passwords.

**Why:** The user explicitly removed Supabase from auth flow. Email confirmation was dropped. Only username + password is required.

## How to apply
- `client/src/lib/supabase.ts` — exports `null` as `SupabaseClient | null`. All `if (supabase)` guards in the codebase short-circuit safely.
- `client/src/hooks/use-auth.tsx` — calls `/api/auth/me` (GET, cookie) on mount; `signIn`/`signUp` hit `/api/auth/login` and `/api/auth/register`.
- `server/auth.ts` — registers `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`.
- `server/routes.ts` `requireAuth` — reads `req.session.authUserId` first (V2), falls back to Supabase Bearer token for legacy VPS users.
- `server/index.ts` — express-session middleware added before routes; session name `discreen.sid`; SECRET from `SESSION_SECRET` env var.
- Password hashing: `bcryptjs` with cost 12.

## Session fields (express-session)
- `authUserId: number` — the integer PK from the `users` table
- `authUsername: string`
- `authEmail: string | null`

## Legacy compat
`requireAuth` still accepts Supabase Bearer tokens as a fallback so existing VPS users with Supabase sessions aren't immediately broken.
