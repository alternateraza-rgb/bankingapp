# Niro

Mobile-first fintech PWA — multi-currency wallets, P2P transfers, virtual Visa cards, and live crypto markets. Dark black & white UI. Simulated banking on **Supabase** (no real bank rails).

## Stack

- Next.js 15 (App Router) + React 19
- Tailwind CSS v4 + Framer Motion + Recharts
- Supabase Auth + Postgres (RLS + RPC money moves)
- CoinGecko (proxied) for live crypto prices

## Setup

1. **Env** — `.env.local` (already gitignored):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

2. **Apply schema** — follow [APPLY_MIGRATION.md](./APPLY_MIGRATION.md) (paste `supabase/migrations/20260722000000_niro_core.sql` into the Supabase SQL Editor).

3. **Auth settings** (recommended for demo) — Dashboard → Authentication → Providers → Email → turn **off** “Confirm email” so signups get a session immediately.

4. **Run**

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Try P2P

1. Sign up as `@alice` (and complete session).
2. Sign up as `@bob` in another browser/profile (or sign out first).
3. From Alice: Send → search `bob` → amount → confirm.
4. Both balances and activity update via Realtime.

New users get demo wallets (USD / EUR / GBP) with a welcome top-up.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |

## Notes

- All balance changes go through Postgres RPCs (`transfer_p2p`, `convert_fiat`, `topup_wallet`, `crypto_buy`, etc.) — not client `UPDATE`s.
- Crypto buys/sells are **simulated** against your USD wallet at live market quotes.
- Virtual cards are demo-only (fake PANs).
