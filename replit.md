# Discreen - Search Engine for Data Dumps

## Overview

Discreen is a web application designed for searching through large data dumps, inspired by IntelX. It allows users to apply multiple search criteria (e.g., username, email, IP address) and aggregates results from multiple sources, grouping them by source file. The platform incorporates Supabase for authentication and role-based access control, alongside a modern UI with an emerald green branding theme. The project aims to provide a robust and efficient search solution for data analysis, with future ambitions to expand its integration capabilities and user base.

### Search Modes
The search system supports three modes (checked in this order):
1. **Remote Bridge** (`VPS_SEARCH_URL`): Forwards searches to a VPS running SQLite databases locally
2. **R2 Streaming** (`USE_R2_SEARCH=true`): Streams and searches raw text files directly from Cloudflare R2 (no local storage needed). Files are stored under the `R2_DATA_PREFIX` (default: `data-files/`). Searches 10 files in parallel with 60s timeout.
3. **Local SQLite**: Uses local FTS5 databases in the `data/` directory

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Monorepo Structure
The project is organized as a monorepo containing a React frontend (`client/`), an Express backend (`server/`), and shared TypeScript types/schemas (`shared/`).

### Frontend
- **Framework**: React with TypeScript, bundled by Vite.
- **UI**: `shadcn/ui` components based on Radix UI, styled with Tailwind CSS, supporting dark mode.
- **State Management**: TanStack React Query for server state.
- **Routing**: Wouter for client-side navigation.
- **Theming**: Emerald green (`hsl(158 64% 52%)`) as the primary brand color.
- **Animations**: Framer Motion for UI element transitions.

### Backend
- **Framework**: Express.js with Node.js and TypeScript (using `tsx`).
- **Search Engine**: Utilizes two SQLite FTS5 databases (`index.db` and `incoming.db`) for full-text search, managed via `better-sqlite3`. Searches are performed in parallel, and results are merged server-side.
- **API**: RESTful endpoints defined with Zod for validation.
- **Authentication**: Supabase Auth for user management, JWT validation, and role-based access control.
- **Role System**: Supports roles like `free`, `vip`, `pro`, `business`, `api`, and `admin`, enforcing access permissions across the application.
- **Unique ID System**: Assigns unique, auto-incrementing IDs to users, used for internal tracking and integration with external systems.
- **Security Measures**: CORS with origin whitelist (`FRONTEND_URL` + Replit domains), dedicated rate limiters (heartbeat 10/min, invoice 5/min, search 30/min, global 120/min), Plisio webhook signature validation (HMAC-SHA1 with timing-safe comparison), all payment/sensitive routes require authentication.

### Data Storage
- **PostgreSQL (via Drizzle ORM)**: Used for core application data such as users, subscriptions, and vouches.
- **SQLite (via better-sqlite3)**: Dedicated FTS5 databases for the primary search functionality.

### Core Features
- **Dynamic Search Criteria**: Users can add various search filters (e.g., username, email, IP), which the backend uses for full-text search.
- **Multi-Page Layout**: Includes pages for Home, Search, Documentation, Pricing, Contact, Reviews, Admin, Profile, and Login, with a consistent shared layout for most.
- **User Profile Page** (`/profile`): Account settings page accessible via dropdown menu on username in header. Features: avatar change (URL), display name change (Pro+ only), 2FA with Google Authenticator (TOTP via Supabase MFA), Discord account linking with "Soutien" badge for Discreen guild members with supporter role.
- **NIR Decoder**: An algorithmic feature to decode French Social Security Numbers (NIR), extracting demographic information and validating control keys.
- **Phone Lookup**: A utility to normalize and classify French phone numbers (mobile, landline, VoIP) and identify regions, without external API calls for operator data.
- **API Key Management**: Provides an interface for API-tier users to create, list, and revoke API keys for external access to search functionalities.
- **Subscription & Usage Limits**: Implements a tiered monthly subscription model (30-day expiry) with daily usage limits enforced atomically, including an account freezing mechanism for administrators. A cron job runs every 5 minutes to automatically expire subscriptions. Freezing an account pauses the subscription timer (expiresAt extended on unfreeze). Frozen accounts are excluded from automatic expiry.
- **Abnormal Activity Detection**: When a user reaches 80% of their daily search limit (or 500 for unlimited tiers), a Discord alert is sent pinging a designated role, with an interactive button to freeze the account directly from Discord.
- **Blacklist System**: Users can submit blacklist requests via `/blacklist-request` form. Admins can approve/reject requests from the admin panel, which also manages blacklist entries. Webhook notifications are sent for new requests.

## External Dependencies

- **Supabase**: Primary service for user authentication, authorization, and profile management.
- **PostgreSQL**: The main relational database for structured application data.
- **SQLite**: Local, file-based databases providing the core full-text search capabilities.
- **Cloudflare R2**: Private S3-compatible object storage for database files (`.db`, `.json`, `.txt`). Managed via `server/s3sync.ts` (upload/download/list/delete functions) and `server/r2-cli.ts` (CLI tool for VPS operations). On startup, the backend auto-syncs `.db` files from R2 to local `data/` directory. Secrets: `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.
- **Breach.vip**: External API integrated for additional search capabilities (proxied via `POST /api/breach-search`), with rate limiting based on user subscription tiers.
- **LeakOSINT**: Another external API integrated for extended data searching (proxied via `POST /api/leakosint-search`), subject to tiered daily quotas and external rate limits.
- **External Proxy API**: Third-party API at `http://81.17.101.243:8000/api/search` integrated via `POST /api/external-search`. Authenticated with `X-Proxy-Secret` header using `EXTERNAL_PROXY_SECRET` env var. Accessible in the "Autres Sources" tab of the search page. Uses the same daily quota system as internal search.
- **Discord Bot**: A custom bot (`discord.js`) integrated for a vouches/reviews system and a ticket support system, interacting with PostgreSQL for data storage and Discord for moderation and communication.
- **Discord Webhooks**: Two webhooks — `DISCORD_WEBHOOK_URL` for general logs (admin actions, payments, keys, etc.) and `DISCORD_SEARCH_WEBHOOK_URL` for search-specific logs (internal search, Breach, LeakOSINT, API, phone lookup, GeoIP).
- **npm Packages**: Key libraries include `drizzle-orm`, `better-sqlite3`, `@supabase/supabase-js`, `@tanstack/react-query`, `framer-motion`, `zod`, `wouter`, `nanoid`, `react-icons`, and `openai` (though AI chat integration is currently disabled).