# Apply Niro core migration

The Supabase schema for Niro lives in:

`supabase/migrations/20260722000000_niro_core.sql`

## Steps

1. Open your project in the [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor**.
3. Create a new query.
4. Open `supabase/migrations/20260722000000_niro_core.sql` from this repo and **paste the entire file** into the editor.
5. Run the query (or “Run” / Cmd+Enter).
6. Confirm there are no errors. You should see tables such as `profiles`, `wallets`, `ledger_entries`, `contacts`, `cards`, `crypto_holdings`, plus RPCs like `transfer_p2p`, `convert_fiat`, `crypto_buy`, etc.

## After applying

1. Ensure `.env.local` has:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. **Authentication → Providers → Email** — disable **Confirm email** for smoother local demos (otherwise signup may require inbox confirmation).
3. Restart `npm run dev`.
4. Sign up a user — the migration’s profile/wallet triggers should provision balances.

## Optional (CLI)

If the Supabase CLI is linked to this project:

```bash
supabase db push
```

Prefer the SQL Editor paste if you are not using a linked remote project yet.

**Do not delete** `supabase/migrations/20260722000000_niro_core.sql` — it is the source of truth for the Niro schema.
