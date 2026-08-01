# Apply Niro Supabase migrations

Schema lives in `supabase/migrations/`. Apply **in order**:

1. `20260722000000_niro_core.sql` — core profiles, wallets, ledger, P2P, cards, crypto
2. `20260801114923_niro_auth_onboarding_cards_txns.sql` — onboarding, custom cards, custom transactions, settings, storage

## Steps (SQL Editor)

1. Open your project in the [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor**.
3. Paste and run each migration file **from oldest to newest**.
4. Confirm there are no errors.

### What the feature migration adds

| Area | Objects |
|------|---------|
| **Auth / onboarding** | Profile fields (`first_name`, `last_name`, `phone`, `country_code`, `date_of_birth`, `avatar_url`, onboarding flags), updated `handle_new_user`, RPCs `update_onboarding_profile`, `complete_onboarding` |
| **Settings** | `user_settings` + `upsert_user_settings` |
| **Cards** | `nickname`, `color`, `is_custom`; RPCs `create_virtual_card` (enhanced), `create_custom_card`, `update_card_controls` |
| **Transactions** | Ledger `vendor_name`, `vendor_logo_url`, `reference`, `card_id`; RPCs `create_custom_transaction`, `delete_custom_transaction` |
| **Storage** | Public buckets `avatars` and `vendor-logos` with per-user folder RLS |

## After applying

1. Ensure `.env.local` / Vercel env has the names the app reads:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
   (Not `NEXT_SUPABASE_PUBLIC_*` — Next.js only exposes `NEXT_PUBLIC_` vars to the browser.)
2. **Authentication → Providers → Email** — disable **Confirm email** for smoother local demos if desired.
3. Restart the app after env changes.

## Optional (CLI)

If the Supabase CLI is linked to this project:

```bash
supabase db push
```

**Do not delete** migration files once applied remotely — they are the source of truth for schema history.
