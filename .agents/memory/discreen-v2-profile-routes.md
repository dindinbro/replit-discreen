---
name: Discreen V2 profile routes
description: API routes for updating username/password/email with V2 session auth; where they live and key constraints
---

Three PATCH routes added to `server/auth.ts` (inside `registerAuthRoutes`), all session-gated via `(req.session as any).authUserId`:

- `PATCH /api/auth/profile/username` — validates `/^[a-z0-9_]{3,20}$/`, checks uniqueness via `storage.getUserByUsername`, updates session `authUsername`
- `PATCH /api/auth/profile/password` — requires `currentPassword` (bcrypt.compare) + `newPassword` (min 8 chars), rehashes at cost 12
- `PATCH /api/auth/profile/email` — accepts null (clear email) or valid address; updates session `authEmail`

**Why:** These routes are separate from the old `PATCH /api/profile/*` endpoints which used Bearer tokens for Supabase users. The new ones use session cookies only.

**How to apply:** Frontend calls these with `credentials: "include"`, no Authorization header needed. After a username change the session still holds the old username until `authUsername` is updated in-place — Task #10 tracks full session invalidation on rename.
