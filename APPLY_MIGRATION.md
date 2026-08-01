# Apply Wise cards + transactions schema

Run this SQL once in your Supabase project (the one linked to the **bankingapp / Wise** Vercel project).

**File:** `supabase/migrations/20260801120039_wise_cards_transactions.sql`

## Steps

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**
2. Paste the full contents of the migration file
3. Run it
4. **Authentication → Providers → Email**
   - For demos: turn **off** “Confirm email”
   - Optional: enable **Anonymous** sign-ins for the Continue / guest button

## Env vars (Vercel + local)

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Do **not** use `NEXT_SUPABASE_PUBLIC_*` — those are not exposed to the Next.js client.

## What you get

| Table / RPC | Purpose |
|-------------|---------|
| `profiles` | Created on auth signup |
| `cards` | Virtual + custom cards |
| `transactions` | All activity, including custom vendor txns |
| `create_random_card` | Generate a card |
| `create_custom_card` | Add a custom card |
| `create_custom_transaction` | Amount + vendor name + logo |
| `upsert_transaction` | Sync transfers / conversions / deposits |
| Storage bucket `vendor-logos` | Vendor logo uploads |

## App behavior after migrate

- **Cards → Add card**: random virtual or custom → stored in Supabase when signed in
- **Activity → Add custom transaction**: vendor, amount, logo URL/upload → stored in Supabase
- Transfers, conversions, and add-money also sync via `upsert_transaction`
