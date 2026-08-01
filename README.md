# Wise

Money without borders — send, spend, and receive internationally.

A mobile-first personal finance PWA inspired by the Wise dark-mode iOS experience: multi-currency balances, transfers, conversion, cards, and recipients.

## Tech stack

- Next.js 15 (App Router) + TypeScript (strict)
- Tailwind CSS v4
- Zustand + localStorage (UI state)
- Supabase (cards + transactions persistence)
- React Hook Form + Zod
- Framer Motion, Recharts, Lucide React
- `@ducanh2912/next-pwa`

## Getting started

```bash
npm install
cp .env.example .env.local   # add Supabase URL + anon key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Supabase schema

Run `supabase/migrations/20260801120039_wise_cards_transactions.sql` in the SQL Editor.  
See `APPLY_MIGRATION.md` for env var names and Auth settings.

### Sign in

| Field | Value |
| --- | --- |
| Email | `raza@wise.com` |
| Password | `wise1234` |

Or tap **Continue** on the login screen (uses Anonymous auth if enabled).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Development server (Turbopack) |
| `npm run build` | Production build + service worker |
| `npm start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |

## Project structure

```
src/
  app/           # Routes (auth + app shell)
  components/    # UI and feature components
  data/          # Seed balances, recipients, transactions
  lib/           # Formatting, FX, motion, validators
  services/      # Simulated async helpers
  store/         # Zustand client state
  types/         # Shared TypeScript models
public/
  brand/         # Wise logos
  icons/         # PWA icons
  manifest.webmanifest
```

## Main routes

`/`, `/login`, `/signup`, `/onboarding`, `/home`, `/send`, `/convert`, `/balances/[currency]`, `/activity`, `/cards`, `/recipients`, `/payments`, `/profile`, `/help`, `/offline`

## PWA

Production builds register a service worker. On iPhone Safari: Share → **Add to Home Screen**. Theme color is black (`#000000`) to match the dark UI.

## Notes

- Balances, transfers, and card actions persist in `localStorage` under `wise-storage`.
- Exchange rates are deterministic mock mid-market figures for a stable demo.
- No real banking APIs or payments are connected.
