---
name: V2 profile API routes
description: Profile update endpoints that work for V2 local users (session-based), not just legacy Supabase users.
---

# V2 Profile API Routes

## Rule
Profile mutation routes must check `parseInt(user.id)` to detect V2 users and use `storage.updateUser()` rather than `supabaseAdmin.auth.admin.updateUserById()`.

**Why:** V2 users have integer IDs from the local `users` table. Supabase is null for them. Old routes bailed with 500 if `!supabaseAdmin`.

## How to apply
- `PATCH /api/profile/avatar` — saves `avatarUrl` to `users` table for V2, falls back to Supabase for legacy
- `PATCH /api/profile/username` — updates `username` in `users` table (all V2 users allowed, checks uniqueness)
- `PATCH /api/profile/password` — verifies `current_password` with bcrypt, hashes and stores `new_password`
- `PATCH /api/profile/display-name` — updated to support V2 (admin-only for V2, same as before; use `/username` for all users)
- `avatar_url` column added to `users` table via `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT` in startup migrations (routes.ts)

## Client-side pattern
All profile fetch calls use `credentials: "include"` (cookie session) instead of `Authorization: Bearer ${getAccessToken()}` (which returns null for V2 users).

## 2FA
2FA enrollment (startEnroll/verifyEnroll) calls Supabase MFA directly — not available for V2 users. The UI shows "Non disponible pour les comptes locaux" when `!supabase`.
