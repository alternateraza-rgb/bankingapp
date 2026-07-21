import { createClient } from "@/lib/supabase/client";
import type { CardRow, CryptoHolding, LedgerEntry, Profile, Wallet } from "@/types/database";

export async function getSessionUser() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getWallets(): Promise<Wallet[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .order("currency");
  if (error) throw error;
  return data ?? [];
}

export async function getLedger(limit = 40): Promise<LedgerEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ledger_entries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function topupWallet(currency: string, amount: number) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("topup_wallet", {
    p_currency: currency,
    p_amount: amount,
  });
  if (error) throw error;
  return data as Wallet;
}

export async function convertFiat(from: string, to: string, amount: number) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("convert_fiat", {
    p_from: from,
    p_to: to,
    p_amount: amount,
  });
  if (error) throw error;
  return data;
}

export async function transferP2P(
  toHandle: string,
  currency: string,
  amount: number,
  note = ""
) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("transfer_p2p", {
    p_to_handle: toHandle,
    p_currency: currency,
    p_amount: amount,
    p_note: note,
  });
  if (error) throw error;
  return data;
}

export async function searchProfiles(query: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("search_profiles", {
    p_query: query,
  });
  if (error) throw error;
  return data ?? [];
}

export async function getContacts() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select(
      "id, contact_user_id, created_at, profiles:contact_user_id(id, handle, full_name, avatar_initials)"
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as {
    id: string;
    contact_user_id: string;
    created_at: string;
    profiles: {
      id: string;
      handle: string;
      full_name: string;
      avatar_initials: string;
    } | null;
  }[];
}

export async function getCards(): Promise<CardRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createVirtualCard(
  walletId: string,
  dailyLimit = 1000,
  monthlyLimit = 5000
) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_virtual_card", {
    p_wallet_id: walletId,
    p_daily_limit: dailyLimit,
    p_monthly_limit: monthlyLimit,
  });
  if (error) throw error;
  return data as CardRow;
}

export async function setCardStatus(cardId: string, status: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("set_card_status", {
    p_card_id: cardId,
    p_status: status,
  });
  if (error) throw error;
  return data as CardRow;
}

export async function updateCardLimits(
  cardId: string,
  daily: number,
  monthly: number
) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("update_card_limits", {
    p_card_id: cardId,
    p_daily: daily,
    p_monthly: monthly,
  });
  if (error) throw error;
  return data as CardRow;
}

export async function simulateCardSpend(
  cardId: string,
  amount: number,
  merchant = "Demo Merchant"
) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("simulate_card_spend", {
    p_card_id: cardId,
    p_amount: amount,
    p_merchant: merchant,
  });
  if (error) throw error;
  return data;
}

export async function getCryptoHoldings(): Promise<CryptoHolding[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("crypto_holdings").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function cryptoBuy(
  asset: string,
  fiatAmount: number,
  quotePrice: number,
  quotedAt: string
) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("crypto_buy", {
    p_asset: asset,
    p_fiat_amount: fiatAmount,
    p_quote_price: quotePrice,
    p_quoted_at: quotedAt,
  });
  if (error) throw error;
  return data;
}

export async function cryptoSell(
  asset: string,
  quantity: number,
  quotePrice: number,
  quotedAt: string
) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("crypto_sell", {
    p_asset: asset,
    p_quantity: quantity,
    p_quote_price: quotePrice,
    p_quoted_at: quotedAt,
  });
  if (error) throw error;
  return data;
}

export async function getFxRates() {
  const supabase = createClient();
  const { data, error } = await supabase.from("fx_rates").select("*");
  if (error) throw error;
  return data ?? [];
}
