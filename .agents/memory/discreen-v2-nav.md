---
name: Discreen V2 nav
description: Current nav section layout in Layout.tsx after cleanup
---

Single `SEARCH_MODULES` array consolidates all lookup tools. The separate `LOOKUP_MODULES` const and the `"lookup"` NAV_SECTION were deleted.

Current SEARCH section order: Paramétrique, Username OSINT (VIP), Gaming (VIP), Google OSINT (PRO), Wanted (PRO), DisX IA (PRO), Téléphone, GeoIP, NIR.

Telegram Lookup was removed entirely (was `disabled: true, comingSoon: true`).

**Why:** User requested simplification — no separate "DONNÉES & LOOKUP" section, no Telegram entry.

**How to apply:** To add new lookup tools, append to `SEARCH_MODULES` in `client/src/components/Layout.tsx`. Do not recreate LOOKUP_MODULES.
