"use client";

import { tryCreateClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { signOutSupabase } from "@/services/auth";
import type { Card, CurrencyCode, Transaction, TransactionType } from "@/types";

export { isSupabaseConfigured, signOutSupabase };

type DbCard = {
  id: string;
  cardholder_name: string;
  last4: string;
  full_number: string;
  expiry: string;
  cvv: string;
  network: string;
  status?: string;
  // Wise-style columns
  spending_limit?: number;
  spending_used?: number;
  // Niro-style columns
  spend_limit_daily?: number;
  spend_limit_monthly?: number;
  spent_today?: number;
  spent_month?: number;
  online_payments: boolean;
  contactless: boolean;
  foreign_transactions: boolean;
  nickname?: string;
  color?: string;
  is_custom?: boolean;
};

type DbLedger = {
  id: string;
  type: string;
  status: string;
  title: string;
  subtitle: string;
  amount: number;
  currency: string;
  vendor_name?: string | null;
  vendor_logo_url?: string | null;
  reference?: string | null;
  card_id?: string | null;
  meta?: Record<string, unknown> | null;
  created_at: string;
};

type DbTxn = {
  id: string;
  type: string;
  status: string;
  title: string;
  subtitle: string;
  amount: number;
  currency: string;
  converted_amount: number | null;
  converted_currency: string | null;
  fee: number;
  fee_currency: string;
  exchange_rate: number | null;
  reference: string;
  merchant_or_recipient: string;
  vendor_name: string | null;
  vendor_logo_url: string | null;
  icon: string | null;
  is_custom: boolean;
  card_id: string | null;
  occurred_at: string;
};

function mapCard(row: DbCard): Card {
  const limit = Number(
    row.spending_limit ?? row.spend_limit_monthly ?? row.spend_limit_daily ?? 2500
  );
  const used = Number(row.spending_used ?? row.spent_month ?? row.spent_today ?? 0);
  return {
    id: row.id,
    cardholderName: row.cardholder_name,
    last4: row.last4,
    fullNumber: row.full_number,
    expiry: row.expiry,
    cvv: row.cvv,
    network: (row.network as Card["network"]) || "visa",
    frozen: row.status === "frozen",
    spendingLimit: limit,
    spendingUsed: used,
    onlinePayments: row.online_payments,
    contactless: row.contactless,
    foreignTransactions: row.foreign_transactions,
    nickname: row.nickname ?? "",
    color: row.color ?? "#163300",
    isCustom: Boolean(row.is_custom),
  };
}

function mapLedgerType(type: string): TransactionType {
  if (type === "transfer_out" || type === "transfer_in") return "transfer";
  if (type === "topup") return "deposit";
  if (
    type === "custom" ||
    type === "purchase" ||
    type === "income" ||
    type === "refund" ||
    type === "card" ||
    type === "conversion" ||
    type === "deposit" ||
    type === "withdrawal" ||
    type === "fee"
  ) {
    return type;
  }
  return "custom";
}

function mapLedger(row: DbLedger): Transaction {
  const meta = row.meta ?? {};
  return {
    id: row.id,
    type: mapLedgerType(row.type),
    status: row.status as Transaction["status"],
    title: row.title,
    subtitle: row.subtitle,
    amount: Number(row.amount),
    currency: row.currency as CurrencyCode,
    fee: 0,
    feeCurrency: row.currency as CurrencyCode,
    reference: row.reference || row.id,
    date: row.created_at,
    merchantOrRecipient: row.vendor_name || row.title,
    vendorName: row.vendor_name ?? undefined,
    vendorLogoUrl: row.vendor_logo_url ?? undefined,
    icon: row.vendor_logo_url ?? undefined,
    cardId: row.card_id ?? undefined,
    isCustom: Boolean(meta.custom) || row.type === "custom",
    convertedAmount:
      typeof meta.to_amount === "number" ? meta.to_amount : undefined,
    convertedCurrency: (meta.to_currency as CurrencyCode) || undefined,
    exchangeRate: typeof meta.rate === "number" ? meta.rate : undefined,
  };
}

function mapTxn(row: DbTxn): Transaction {
  return {
    id: row.id,
    type: row.type as TransactionType,
    status: row.status as Transaction["status"],
    title: row.title,
    subtitle: row.subtitle,
    amount: Number(row.amount),
    currency: row.currency as CurrencyCode,
    convertedAmount:
      row.converted_amount == null ? undefined : Number(row.converted_amount),
    convertedCurrency: (row.converted_currency as CurrencyCode) || undefined,
    fee: Number(row.fee),
    feeCurrency: row.fee_currency as CurrencyCode,
    exchangeRate:
      row.exchange_rate == null ? undefined : Number(row.exchange_rate),
    reference: row.reference,
    date: row.occurred_at,
    merchantOrRecipient: row.merchant_or_recipient,
    vendorName: row.vendor_name ?? undefined,
    vendorLogoUrl: row.vendor_logo_url ?? undefined,
    icon: row.icon ?? row.vendor_logo_url ?? undefined,
    cardId: row.card_id ?? undefined,
    isCustom: row.is_custom,
  };
}

async function requireAuthedClient() {
  const supabase = tryCreateClient();
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated");
  return { supabase, userId: data.user.id };
}

async function getPrimaryWalletId(currency = "USD") {
  const { supabase, userId } = await requireAuthedClient();
  const { data: existing } = await supabase
    .from("wallets")
    .select("id")
    .eq("user_id", userId)
    .eq("currency", currency)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  // Fallback: any wallet for the user (Niro always seeds USD/EUR/GBP)
  const { data: anyWallet, error } = await supabase
    .from("wallets")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!anyWallet?.id) {
    throw new Error("No wallet found for this account. Apply the Niro core migration.");
  }
  return anyWallet.id as string;
}

export async function createRandomCardCloud(input: {
  cardholderName?: string;
  network?: string;
  nickname?: string;
  color?: string;
  spendingLimit?: number;
}): Promise<Card | null> {
  const { supabase } = await requireAuthedClient();

  // Prefer Niro RPC (wallet-linked)
  try {
    const walletId = await getPrimaryWalletId("USD");
    const { data, error } = await supabase.rpc("create_virtual_card", {
      p_wallet_id: walletId,
      p_daily_limit: input.spendingLimit ?? 1000,
      p_monthly_limit: input.spendingLimit ?? 5000,
      p_nickname: input.nickname ?? "",
      p_color: input.color ?? "#1A1F36",
      p_network: input.network ?? "visa",
    });
    if (!error && data) return mapCard(data as DbCard);
  } catch {
    // fall through to Wise-style RPC
  }

  const { data, error } = await supabase.rpc("create_random_card", {
    p_cardholder_name: input.cardholderName ?? null,
    p_network: input.network ?? "visa",
    p_nickname: input.nickname ?? "",
    p_color: input.color ?? "#163300",
    p_spending_limit: input.spendingLimit ?? 2500,
  });
  if (error) throw new Error(error.message);
  return data ? mapCard(data as DbCard) : null;
}

export async function createCustomCardCloud(input: {
  cardholderName: string;
  network?: string;
  fullNumber?: string;
  expiry?: string;
  cvv?: string;
  nickname?: string;
  color?: string;
  spendingLimit?: number;
}): Promise<Card | null> {
  const { supabase } = await requireAuthedClient();
  const walletId = await getPrimaryWalletId("USD");

  const { data, error } = await supabase.rpc("create_custom_card", {
    p_wallet_id: walletId,
    p_cardholder_name: input.cardholderName,
    p_network: input.network ?? "visa",
    p_full_number: input.fullNumber ?? null,
    p_expiry: input.expiry ?? null,
    p_cvv: input.cvv ?? null,
    p_nickname: input.nickname ?? "",
    p_color: input.color ?? "#1A1F36",
    p_daily_limit: input.spendingLimit ?? 1000,
    p_monthly_limit: input.spendingLimit ?? 5000,
  });

  // Wise schema overload without wallet_id
  if (error?.message?.toLowerCase().includes("wallet") || error?.code === "PGRST202") {
    const retry = await supabase.rpc("create_custom_card", {
      p_cardholder_name: input.cardholderName,
      p_network: input.network ?? "visa",
      p_full_number: input.fullNumber ?? null,
      p_expiry: input.expiry ?? null,
      p_cvv: input.cvv ?? null,
      p_nickname: input.nickname ?? "",
      p_color: input.color ?? "#163300",
      p_spending_limit: input.spendingLimit ?? 2500,
    });
    if (retry.error) throw new Error(retry.error.message);
    return retry.data ? mapCard(retry.data as DbCard) : null;
  }

  if (error) throw new Error(error.message);
  return data ? mapCard(data as DbCard) : null;
}

export async function setCardFrozenCloud(cardId: string, frozen: boolean) {
  const { supabase } = await requireAuthedClient();
  const rpc = await supabase.rpc("set_card_frozen", {
    p_card_id: cardId,
    p_frozen: frozen,
  });
  if (!rpc.error && rpc.data) return mapCard(rpc.data as DbCard);

  const statusRpc = await supabase.rpc("set_card_status", {
    p_card_id: cardId,
    p_status: frozen ? "frozen" : "active",
  });
  if (!statusRpc.error && statusRpc.data) return mapCard(statusRpc.data as DbCard);

  const { data, error } = await supabase
    .from("cards")
    .update({ status: frozen ? "frozen" : "active" })
    .eq("id", cardId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapCard(data as DbCard);
}

export async function updateCardCloud(
  cardId: string,
  patch: Partial<{
    onlinePayments: boolean;
    contactless: boolean;
    foreignTransactions: boolean;
    spendingLimit: number;
    nickname: string;
    color: string;
    frozen: boolean;
  }>
) {
  const { supabase } = await requireAuthedClient();
  const row: Record<string, unknown> = {};
  if (patch.onlinePayments !== undefined) row.online_payments = patch.onlinePayments;
  if (patch.contactless !== undefined) row.contactless = patch.contactless;
  if (patch.foreignTransactions !== undefined)
    row.foreign_transactions = patch.foreignTransactions;
  if (patch.spendingLimit !== undefined) {
    row.spending_limit = patch.spendingLimit;
    row.spend_limit_monthly = patch.spendingLimit;
  }
  if (patch.nickname !== undefined) row.nickname = patch.nickname;
  if (patch.color !== undefined) row.color = patch.color;
  if (patch.frozen !== undefined) row.status = patch.frozen ? "frozen" : "active";
  if (Object.keys(row).length === 0) return null;

  const { data, error } = await supabase
    .from("cards")
    .update(row)
    .eq("id", cardId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapCard(data as DbCard);
}

export async function persistTransactionCloud(txn: Transaction) {
  const { supabase } = await requireAuthedClient();

  // Niro: store in ledger via custom transaction RPC (works for syncing demo activity)
  const direction = txn.amount < 0 ? "debit" : "credit";
  const { data, error } = await supabase.rpc("create_custom_transaction", {
    p_amount: Math.abs(txn.amount),
    p_currency: txn.currency,
    p_vendor_name: txn.vendorName || txn.merchantOrRecipient || txn.title,
    p_direction: direction,
    p_type: txn.type === "transfer" ? "custom" : txn.type,
    p_vendor_logo_url: txn.vendorLogoUrl ?? txn.icon ?? null,
    p_title: txn.title,
    p_subtitle: txn.subtitle,
    p_status: txn.status,
    p_affect_balance: false,
    p_card_id:
      txn.cardId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        txn.cardId
      )
        ? txn.cardId
        : null,
    p_meta: {
      local_reference: txn.reference,
      synced_from_client: true,
      original_type: txn.type,
    },
    p_occurred_at: txn.date,
  });

  if (!error && data) return mapLedger(data as DbLedger);

  // Wise schema fallback
  const upsert = await supabase.rpc("upsert_transaction", {
    p_id: null,
    p_type: txn.type,
    p_status: txn.status,
    p_title: txn.title,
    p_subtitle: txn.subtitle,
    p_amount: txn.amount,
    p_currency: txn.currency,
    p_converted_amount: txn.convertedAmount ?? null,
    p_converted_currency: txn.convertedCurrency ?? null,
    p_fee: txn.fee,
    p_fee_currency: txn.feeCurrency,
    p_exchange_rate: txn.exchangeRate ?? null,
    p_reference: txn.reference,
    p_merchant_or_recipient: txn.merchantOrRecipient,
    p_vendor_name: txn.vendorName ?? txn.merchantOrRecipient,
    p_vendor_logo_url: txn.vendorLogoUrl ?? txn.icon ?? null,
    p_icon: txn.icon ?? txn.vendorLogoUrl ?? null,
    p_is_custom: Boolean(txn.isCustom),
    p_card_id: null,
    p_meta: { local_id: txn.id },
    p_occurred_at: txn.date,
  });
  if (upsert.error) throw new Error(upsert.error.message || error?.message);
  return upsert.data ? mapTxn(upsert.data as DbTxn) : null;
}

function coerceRpcRow<T>(data: unknown): T | null {
  if (!data) return null;
  if (Array.isArray(data)) return (data[0] as T) ?? null;
  if (typeof data === "object") return data as T;
  return null;
}

export async function createCustomTransactionCloud(input: {
  amount: number;
  currency: string;
  vendorName: string;
  direction: "debit" | "credit";
  vendorLogoUrl?: string;
  title?: string;
  subtitle?: string;
  type?: string;
  cardId?: string;
}): Promise<Transaction> {
  const { supabase, userId } = await requireAuthedClient();
  const cardId =
    input.cardId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      input.cardId
    )
      ? input.cardId
      : null;

  const signed =
    input.direction === "debit"
      ? -Math.abs(input.amount)
      : Math.abs(input.amount);
  const title = input.title?.trim() || input.vendorName;
  const subtitle =
    input.subtitle?.trim() ||
    (input.direction === "debit" ? "Custom purchase" : "Custom credit");

  // 1) Preferred: Niro/Wise RPC
  const rpc = await supabase.rpc("create_custom_transaction", {
    p_amount: Math.abs(input.amount),
    p_currency: input.currency,
    p_vendor_name: input.vendorName,
    p_direction: input.direction,
    p_type: input.type ?? "custom",
    p_vendor_logo_url: input.vendorLogoUrl ?? null,
    p_title: title,
    p_subtitle: subtitle,
    p_status: "completed",
    p_affect_balance: true,
    p_card_id: cardId,
  });

  if (!rpc.error && rpc.data) {
    const row = coerceRpcRow<DbLedger & DbTxn>(rpc.data);
    if (row) {
      if ("occurred_at" in row && row.occurred_at) return mapTxn(row as DbTxn);
      return mapLedger(row as DbLedger);
    }
  }

  // 2) Fallback: direct ledger_entries insert + wallet update (needs INSERT policy or will fail)
  const walletId = await getPrimaryWalletId(input.currency).catch(() => null);
  if (walletId) {
    if (input.direction === "debit") {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("id", walletId)
        .single();
      const balance = Number(wallet?.balance ?? 0);
      if (balance < Math.abs(input.amount)) {
        throw new Error("Insufficient funds");
      }
      const { error: wErr } = await supabase
        .from("wallets")
        .update({ balance: balance - Math.abs(input.amount) })
        .eq("id", walletId);
      if (wErr) {
        // RLS blocked wallet write — continue to try ledger insert via service path below
        console.warn("Wallet update blocked", wErr.message);
      }
    } else {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("id", walletId)
        .single();
      const balance = Number(wallet?.balance ?? 0);
      await supabase
        .from("wallets")
        .update({ balance: balance + Math.abs(input.amount) })
        .eq("id", walletId);
    }

    const { data: entry, error: ledgerErr } = await supabase
      .from("ledger_entries")
      .insert({
        user_id: userId,
        wallet_id: walletId,
        card_id: cardId,
        type: input.type ?? "custom",
        status: "completed",
        amount: signed,
        currency: input.currency.toUpperCase(),
        title,
        subtitle,
        vendor_name: input.vendorName,
        vendor_logo_url: input.vendorLogoUrl ?? null,
        meta: {
          custom: true,
          direction: input.direction,
          affect_balance: true,
        },
      })
      .select("*")
      .single();

    if (!ledgerErr && entry) return mapLedger(entry as DbLedger);
  }

  // 3) Wise transactions table fallback
  const { data: txn, error: txnErr } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      type: input.type ?? "custom",
      status: "completed",
      title,
      subtitle,
      amount: signed,
      currency: input.currency.toUpperCase(),
      fee: 0,
      fee_currency: input.currency.toUpperCase(),
      reference: `CTX-${Date.now().toString(36).toUpperCase()}`,
      merchant_or_recipient: input.vendorName,
      vendor_name: input.vendorName,
      vendor_logo_url: input.vendorLogoUrl ?? null,
      icon: input.vendorLogoUrl ?? null,
      is_custom: true,
      card_id: cardId,
      occurred_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (!txnErr && txn) return mapTxn(txn as DbTxn);

  const detail =
    rpc.error?.message ||
    txnErr?.message ||
    "create_custom_transaction RPC missing — run the cards/custom-txn SQL migration";
  throw new Error(detail);
}

/** Pull USD (and other) wallet balances from Supabase into UI shape. */
export async function fetchWalletBalances(): Promise<
  Partial<Record<CurrencyCode, number>>
> {
  const wallets = await fetchCloudWallets();
  const out: Partial<Record<CurrencyCode, number>> = {};
  for (const w of wallets as Array<{ currency: string; balance: number }>) {
    out[w.currency as CurrencyCode] = Number(w.balance);
  }
  return out;
}

/**
 * Ensure Supabase USD wallet has the $5500 opening balance (once),
 * then return live wallet balances. This is the source of truth for money RPCs.
 */
export async function ensureAndFetchBalances(
  amount = 5500
): Promise<Partial<Record<CurrencyCode, number>>> {
  const { supabase } = await requireAuthedClient();

  const { error } = await supabase.rpc("ensure_starting_balance", {
    p_amount: amount,
  });
  if (error) {
    // Fallback: if RPC not installed yet, try to read wallets anyway
    console.warn("ensure_starting_balance failed", error.message);
  }

  return fetchWalletBalances();
}

/** Top up via Niro RPC when available; keeps Supabase wallet in sync with UI. */
export async function topUpWalletCloud(currency: string, amount: number) {
  const { supabase } = await requireAuthedClient();
  const { data, error } = await supabase.rpc("topup_wallet", {
    p_currency: currency,
    p_amount: amount,
  });
  if (error) throw new Error(error.message);
  return data as { balance?: number; currency?: string } | null;
}

export async function uploadVendorLogo(file: File): Promise<string | null> {
  const { supabase, userId } = await requireAuthedClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("vendor-logos")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("vendor-logos").getPublicUrl(path);
  return data.publicUrl;
}

export async function fetchCloudCards(): Promise<Card[]> {
  const { supabase } = await requireAuthedClient();
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as DbCard[]).map(mapCard);
}

export async function fetchCloudTransactions(): Promise<Transaction[]> {
  const { supabase } = await requireAuthedClient();

  // Niro primary: ledger_entries
  const ledger = await supabase
    .from("ledger_entries")
    .select("*")
    .order("created_at", { ascending: false });
  if (!ledger.error && ledger.data) {
    return (ledger.data as DbLedger[])
      .filter((row) => {
        // Hide legacy "demo funds to explore niro" welcome rows
        const blob = `${row.title} ${row.subtitle}`.toLowerCase();
        return !blob.includes("demo funds") && !blob.includes("explore niro");
      })
      .map(mapLedger);
  }

  // Wise fallback: transactions table
  const txns = await supabase
    .from("transactions")
    .select("*")
    .order("occurred_at", { ascending: false });
  if (txns.error) throw new Error(txns.error.message || ledger.error?.message);
  return (txns.data as DbTxn[]).map(mapTxn);
}

export async function fetchCloudWallets() {
  const { supabase } = await requireAuthedClient();
  const { data, error } = await supabase.from("wallets").select("*");
  if (error) {
    // Wise schema may not have wallets
    return [];
  }
  return data ?? [];
}
