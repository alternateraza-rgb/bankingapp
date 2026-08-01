"use client";

import { tryCreateClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Card, CurrencyCode, Transaction, TransactionType } from "@/types";

export { isSupabaseConfigured };

type DbCard = {
  id: string;
  cardholder_name: string;
  last4: string;
  full_number: string;
  expiry: string;
  cvv: string;
  network: string;
  status: string;
  spending_limit: number;
  spending_used: number;
  online_payments: boolean;
  contactless: boolean;
  foreign_transactions: boolean;
  nickname: string;
  color: string;
  is_custom: boolean;
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
  return {
    id: row.id,
    cardholderName: row.cardholder_name,
    last4: row.last4,
    fullNumber: row.full_number,
    expiry: row.expiry,
    cvv: row.cvv,
    network: (row.network as Card["network"]) || "visa",
    frozen: row.status === "frozen",
    spendingLimit: Number(row.spending_limit),
    spendingUsed: Number(row.spending_used),
    onlinePayments: row.online_payments,
    contactless: row.contactless,
    foreignTransactions: row.foreign_transactions,
    nickname: row.nickname ?? "",
    color: row.color ?? "#163300",
    isCustom: row.is_custom,
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

export async function ensureSupabaseSession(opts?: {
  email?: string;
  password?: string;
  fullName?: string;
}) {
  const supabase = tryCreateClient();
  if (!supabase) return { ok: false as const, reason: "not_configured" as const };

  const { data: existing } = await supabase.auth.getSession();
  if (existing.session) {
    return { ok: true as const, userId: existing.session.user.id };
  }

  const email = opts?.email?.trim();
  const password = opts?.password ?? "";

  if (email && password) {
    const signIn = await supabase.auth.signInWithPassword({ email, password });
    if (!signIn.error && signIn.data.user) {
      return { ok: true as const, userId: signIn.data.user.id };
    }

    const signUp = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: opts?.fullName ?? email.split("@")[0],
        },
      },
    });
    if (!signUp.error && signUp.data.user) {
      // If email confirmation is off, session may already exist
      if (signUp.data.session) {
        return { ok: true as const, userId: signUp.data.user.id };
      }
      const retry = await supabase.auth.signInWithPassword({ email, password });
      if (!retry.error && retry.data.user) {
        return { ok: true as const, userId: retry.data.user.id };
      }
      return {
        ok: false as const,
        reason: "confirm_email" as const,
        message:
          retry.error?.message ?? "Check email to confirm your account",
      };
    }

    return {
      ok: false as const,
      reason: "auth_failed" as const,
      message:
        signIn.error?.message ?? signUp.error?.message ?? "Auth failed",
    };
  }

  // Guest / continue: anonymous if enabled, else ephemeral demo user
  const anon = await supabase.auth.signInAnonymously();
  if (!anon.error && anon.data.user) {
    return { ok: true as const, userId: anon.data.user.id };
  }

  const stamp = Date.now().toString(36);
  const guestEmail = `wise.guest.${stamp}@example.com`;
  const guestPassword = `Wise-${stamp}-demo!`;
  const guest = await supabase.auth.signUp({
    email: guestEmail,
    password: guestPassword,
    options: { data: { full_name: "Wise Guest" } },
  });
  if (!guest.error && guest.data.session?.user) {
    return { ok: true as const, userId: guest.data.session.user.id };
  }
  if (!guest.error && guest.data.user) {
    const retry = await supabase.auth.signInWithPassword({
      email: guestEmail,
      password: guestPassword,
    });
    if (!retry.error && retry.data.user) {
      return { ok: true as const, userId: retry.data.user.id };
    }
  }

  return {
    ok: false as const,
    reason: "auth_failed" as const,
    message:
      anon.error?.message ??
      guest.error?.message ??
      "Could not create cloud session",
  };
}

export async function signOutSupabase() {
  const supabase = tryCreateClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function createRandomCardCloud(input: {
  cardholderName?: string;
  network?: string;
  nickname?: string;
  color?: string;
  spendingLimit?: number;
}): Promise<Card | null> {
  const supabase = tryCreateClient();
  if (!supabase) return null;
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
  const supabase = tryCreateClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("create_custom_card", {
    p_cardholder_name: input.cardholderName,
    p_network: input.network ?? "visa",
    p_full_number: input.fullNumber ?? null,
    p_expiry: input.expiry ?? null,
    p_cvv: input.cvv ?? null,
    p_nickname: input.nickname ?? "",
    p_color: input.color ?? "#163300",
    p_spending_limit: input.spendingLimit ?? 2500,
  });
  if (error) throw new Error(error.message);
  return data ? mapCard(data as DbCard) : null;
}

export async function setCardFrozenCloud(cardId: string, frozen: boolean) {
  const supabase = tryCreateClient();
  if (!supabase) return null;
  // Prefer RPC when available; fall back to direct update
  const rpc = await supabase.rpc("set_card_frozen", {
    p_card_id: cardId,
    p_frozen: frozen,
  });
  if (!rpc.error && rpc.data) return mapCard(rpc.data as DbCard);

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
  const supabase = tryCreateClient();
  if (!supabase) return null;
  const row: Record<string, unknown> = {};
  if (patch.onlinePayments !== undefined) row.online_payments = patch.onlinePayments;
  if (patch.contactless !== undefined) row.contactless = patch.contactless;
  if (patch.foreignTransactions !== undefined)
    row.foreign_transactions = patch.foreignTransactions;
  if (patch.spendingLimit !== undefined) row.spending_limit = patch.spendingLimit;
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
  const supabase = tryCreateClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("upsert_transaction", {
    p_id: txn.id.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
      ? txn.id
      : null,
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
    p_card_id:
      txn.cardId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        txn.cardId
      )
        ? txn.cardId
        : null,
    p_meta: { local_id: txn.id },
    p_occurred_at: txn.date,
  });

  if (error) throw new Error(error.message);
  return data ? mapTxn(data as DbTxn) : null;
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
}) {
  const supabase = tryCreateClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("create_custom_transaction", {
    p_amount: input.amount,
    p_currency: input.currency,
    p_vendor_name: input.vendorName,
    p_direction: input.direction,
    p_vendor_logo_url: input.vendorLogoUrl ?? null,
    p_title: input.title ?? null,
    p_subtitle: input.subtitle ?? null,
    p_type: input.type ?? "custom",
    p_card_id:
      input.cardId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        input.cardId
      )
        ? input.cardId
        : null,
  });
  if (error) throw new Error(error.message);
  return data ? mapTxn(data as DbTxn) : null;
}

export async function uploadVendorLogo(file: File): Promise<string | null> {
  const supabase = tryCreateClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${user.id}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("vendor-logos")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("vendor-logos").getPublicUrl(path);
  return data.publicUrl;
}

export async function fetchCloudCards(): Promise<Card[]> {
  const supabase = tryCreateClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as DbCard[]).map(mapCard);
}

export async function fetchCloudTransactions(): Promise<Transaction[]> {
  const supabase = tryCreateClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("occurred_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as DbTxn[]).map(mapTxn);
}
