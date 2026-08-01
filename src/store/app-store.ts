"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppSettings,
  AuthState,
  Card,
  Conversion,
  CurrencyBalance,
  CurrencyCode,
  PaymentMethod,
  Recipient,
  SecuritySetting,
  Transaction,
  TransferDraft,
  User,
} from "@/types";
import {
  DEFAULT_USER,
  INITIAL_BALANCES,
  INITIAL_SECURITY,
} from "@/data/user";
import {
  calculateFee,
  convertAmount,
  getRate,
} from "@/lib/exchange";
import { generateId, generateReference } from "@/lib/utils";
import { addBusinessDays, formatISO } from "date-fns";
import {
  createCustomCardCloud,
  createCustomTransactionCloud,
  createRandomCardCloud,
  ensureAndFetchBalances,
  isSupabaseConfigured,
  persistTransactionCloud,
  setCardFrozenCloud,
  signOutSupabase,
  topUpWalletCloud,
  updateCardCloud,
} from "@/services/wise-cloud";
import { STARTING_BALANCE_USD } from "@/data/user";

interface AppState {
  user: User;
  balances: CurrencyBalance[];
  recipients: Recipient[];
  transactions: Transaction[];
  cards: Card[];
  activeCardId: string;
  /** @deprecated use cards + activeCardId; kept in sync for existing screens */
  card: Card;
  security: SecuritySetting;
  settings: AppSettings;
  auth: AuthState;
  /** Supabase auth.users id — scopes persisted account data */
  authUserId: string | null;
  transferDraft: TransferDraft;
  hydrated: boolean;
  sessionChecked: boolean;

  setHydrated: (value: boolean) => void;
  setSessionChecked: (value: boolean) => void;
  setHideBalances: (hide: boolean) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  updateSecurity: (partial: Partial<SecuritySetting>) => void;
  updateCard: (partial: Partial<Card>, cardId?: string) => void;
  setActiveCardId: (cardId: string) => void;
  updateUser: (partial: Partial<User>) => void;
  toggleRateAlert: (pair: string) => void;

  /** @deprecated local-only — use establishSession */
  signIn: () => void;
  establishSession: (input: {
    userId: string;
    profile: Partial<User> & { email: string };
  }) => void;
  completeOnboarding: () => void;
  setPasscodeCreated: () => void;
  /** Clears local auth state without calling Supabase (safe inside auth callbacks). */
  clearLocalAuth: () => void;
  signOut: () => Promise<void>;

  setTransferDraft: (partial: Partial<TransferDraft>) => void;
  resetTransferDraft: () => void;
  addRecipient: (recipient: Omit<Recipient, "id">) => Recipient;
  executeTransfer: () => { transaction: Transaction; reference: string; arrival: string };
  executeConversion: (
    from: CurrencyCode,
    to: CurrencyCode,
    amount: number
  ) => Conversion;
  addMoney: (currency: CurrencyCode, amount: number) => Promise<void>;
  createRandomCard: (input?: {
    network?: Card["network"];
    nickname?: string;
    color?: string;
    spendingLimit?: number;
  }) => Promise<Card>;
  createCustomCard: (input: {
    cardholderName: string;
    network?: Card["network"];
    fullNumber?: string;
    expiry?: string;
    cvv?: string;
    nickname?: string;
    color?: string;
    spendingLimit?: number;
  }) => Promise<Card>;
  addCustomTransaction: (input: {
    amount: number;
    currency: CurrencyCode;
    vendorName: string;
    direction?: "debit" | "credit";
    vendorLogoUrl?: string;
    title?: string;
    subtitle?: string;
    type?: Transaction["type"];
    cardId?: string;
    affectBalance?: boolean;
  }) => Promise<Transaction>;
  /** Replace account cloud slices for the signed-in user (source of truth). */
  replaceCloudData: (input: {
    cards?: Card[];
    transactions?: Transaction[];
  }) => void;
  /** Apply live Supabase wallet balances onto local UI balances. */
  applyWalletBalances: (
    walletBalances: Partial<Record<CurrencyCode, number>>
  ) => void;
  /** Ensure $5500 opening balance in Supabase, then sync UI from wallets. */
  syncBalancesFromCloud: () => Promise<void>;
  /** @deprecated use replaceCloudData */
  mergeCloudData: (input: {
    cards?: Card[];
    transactions?: Transaction[];
  }) => void;
  removeDevice: (deviceId: string) => void;
  resetAccountData: () => void;
}

const emptyCardPlaceholder: Card = {
  id: "card_placeholder",
  cardholderName: "",
  last4: "0000",
  fullNumber: "0000000000000000",
  expiry: "01/30",
  cvv: "000",
  network: "visa",
  frozen: false,
  spendingLimit: 2500,
  spendingUsed: 0,
  onlinePayments: true,
  contactless: true,
  foreignTransactions: true,
  nickname: "",
  color: "#163300",
  isCustom: false,
};

const defaultSettings: AppSettings = {
  hideBalances: false,
  notifications: {
    transfers: true,
    rates: true,
    security: true,
    marketing: false,
  },
  appearance: "light",
  primaryCurrency: "USD",
  rateAlerts: {},
};

const defaultAuth: AuthState = {
  isAuthenticated: false,
  hasCompletedOnboarding: false,
  hasPasscode: false,
};

const defaultDraft: TransferDraft = {
  recipientId: null,
  sourceCurrency: "USD",
  targetCurrency: "PKR",
  sourceAmount: 0,
  paymentMethod: "balance",
  note: "",
};

function adjustBalance(
  balances: CurrencyBalance[],
  currency: CurrencyCode,
  delta: number
): CurrencyBalance[] {
  return balances.map((b) =>
    b.currency === currency
      ? {
          ...b,
          amount:
            currency === "PKR"
              ? Math.round(b.amount + delta)
              : Math.round((b.amount + delta) * 100) / 100,
        }
      : b
  );
}

function withActiveCard(cards: Card[], activeCardId: string): Card {
  return cards.find((c) => c.id === activeCardId) ?? cards[0] ?? emptyCardPlaceholder;
}

function queuePersist(txn: Transaction) {
  if (!isSupabaseConfigured()) return;
  void persistTransactionCloud(txn).catch((err) => {
    console.warn("Failed to sync transaction to Supabase", err);
  });
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: DEFAULT_USER,
      balances: INITIAL_BALANCES,
      recipients: [],
      transactions: [],
      cards: [],
      activeCardId: emptyCardPlaceholder.id,
      card: emptyCardPlaceholder,
      security: INITIAL_SECURITY,
      settings: defaultSettings,
      auth: defaultAuth,
      authUserId: null,
      transferDraft: defaultDraft,
      hydrated: false,
      sessionChecked: false,

      setHydrated: (value) => set({ hydrated: value }),
      setSessionChecked: (value) => set({ sessionChecked: value }),

      setHideBalances: (hide) =>
        set((s) => ({ settings: { ...s.settings, hideBalances: hide } })),

      updateSettings: (partial) =>
        set((s) => ({ settings: { ...s.settings, ...partial } })),

      updateSecurity: (partial) =>
        set((s) => ({ security: { ...s.security, ...partial } })),

      setActiveCardId: (cardId) =>
        set((s) => ({
          activeCardId: cardId,
          card: withActiveCard(s.cards, cardId),
        })),

      updateCard: (partial, cardId) => {
        const id = cardId ?? get().activeCardId;
        set((s) => {
          const cards = s.cards.map((c) =>
            c.id === id ? { ...c, ...partial } : c
          );
          return {
            cards,
            card: withActiveCard(cards, s.activeCardId),
          };
        });
        if (isSupabaseConfigured()) {
          void updateCardCloud(id, partial).catch((err) =>
            console.warn("Failed to sync card update", err)
          );
          if (partial.frozen !== undefined) {
            void setCardFrozenCloud(id, partial.frozen).catch(() => undefined);
          }
        }
      },

      updateUser: (partial) =>
        set((s) => ({ user: { ...s.user, ...partial } })),

      toggleRateAlert: (pair) =>
        set((s) => ({
          settings: {
            ...s.settings,
            rateAlerts: {
              ...s.settings.rateAlerts,
              [pair]: !s.settings.rateAlerts[pair],
            },
          },
        })),

      signIn: () => {
        // Kept for legacy call sites — does nothing without a real session id
        console.warn("signIn() is local-only; use establishSession after Supabase auth");
      },

      establishSession: ({ userId, profile }) => {
        const prevId = get().authUserId;
        const switchingUser = prevId && prevId !== userId;

        set((s) => {
          const nextUser: User = {
            ...s.user,
            ...profile,
            id: userId,
            email: profile.email,
            firstName: profile.firstName ?? s.user.firstName,
            lastName: profile.lastName ?? s.user.lastName,
            avatarInitials:
              profile.avatarInitials ??
              `${(profile.firstName ?? "U")[0]}${(profile.lastName ?? "")[0] || ""}`.toUpperCase(),
          };

          // New / switched account: local placeholder only.
          // Starter activity comes from Supabase SQL seed (ensure_starting_balance /
          // handle_new_user) via cloud sync — not local fake transactions.
          if (switchingUser || !prevId) {
            const holder = `${nextUser.firstName} ${nextUser.lastName}`.trim();
            return {
              authUserId: userId,
              user: nextUser,
              auth: {
                isAuthenticated: true,
                hasCompletedOnboarding: true,
                hasPasscode: s.auth.hasPasscode,
              },
              cards: [],
              activeCardId: emptyCardPlaceholder.id,
              card: {
                ...emptyCardPlaceholder,
                cardholderName: holder,
              },
              transactions: [],
              recipients: [],
              balances: INITIAL_BALANCES.map((b) => ({
                ...b,
                accountHolder: holder,
              })),
              transferDraft: defaultDraft,
            };
          }

          return {
            authUserId: userId,
            user: nextUser,
            auth: {
              isAuthenticated: true,
              hasCompletedOnboarding: true,
              hasPasscode: s.auth.hasPasscode,
            },
          };
        });
      },

      completeOnboarding: () =>
        set((s) => ({
          auth: {
            ...s.auth,
            hasCompletedOnboarding: true,
            // only mark authenticated if we already have a supabase user
            isAuthenticated: Boolean(s.authUserId),
          },
        })),

      setPasscodeCreated: () =>
        set((s) => ({
          auth: { ...s.auth, hasPasscode: true },
          security: { ...s.security, passcodeEnabled: true },
        })),

      clearLocalAuth: () => {
        set({
          auth: defaultAuth,
          authUserId: null,
          transferDraft: defaultDraft,
          cards: [],
          transactions: [],
          recipients: [],
          activeCardId: emptyCardPlaceholder.id,
          card: emptyCardPlaceholder,
          user: DEFAULT_USER,
          balances: INITIAL_BALANCES,
        });
      },

      signOut: async () => {
        await signOutSupabase();
        get().clearLocalAuth();
      },

      setTransferDraft: (partial) =>
        set((s) => ({
          transferDraft: { ...s.transferDraft, ...partial },
        })),

      resetTransferDraft: () => set({ transferDraft: defaultDraft }),

      addRecipient: (recipient) => {
        const created: Recipient = {
          ...recipient,
          id: generateId("rec"),
        };
        set((s) => ({ recipients: [created, ...s.recipients] }));
        return created;
      },

      executeTransfer: () => {
        const { transferDraft, recipients, balances } = get();
        const recipient = recipients.find((r) => r.id === transferDraft.recipientId);
        if (!recipient || transferDraft.sourceAmount <= 0) {
          throw new Error("Invalid transfer draft");
        }

        const fee = calculateFee(
          transferDraft.sourceAmount,
          transferDraft.sourceCurrency
        );
        const net = transferDraft.sourceAmount - fee;
        const targetAmount = convertAmount(
          net,
          transferDraft.sourceCurrency,
          transferDraft.targetCurrency
        );
        const rate = getRate(
          transferDraft.sourceCurrency,
          transferDraft.targetCurrency
        );
        const reference = generateReference();
        const arrival = formatISO(addBusinessDays(new Date(), 1));
        const transaction: Transaction = {
          id: generateId("txn"),
          type: "transfer",
          status: "completed",
          title: recipient.name,
          subtitle: `Sent to ${transferDraft.targetCurrency}`,
          amount: -transferDraft.sourceAmount,
          currency: transferDraft.sourceCurrency,
          convertedAmount: targetAmount,
          convertedCurrency: transferDraft.targetCurrency,
          fee,
          feeCurrency: transferDraft.sourceCurrency,
          exchangeRate: rate,
          reference,
          date: new Date().toISOString(),
          merchantOrRecipient: recipient.name,
          vendorName: recipient.name,
        };

        const nextBalances = adjustBalance(
          balances,
          transferDraft.sourceCurrency,
          -transferDraft.sourceAmount
        );

        set((s) => ({
          balances: nextBalances,
          transactions: [transaction, ...s.transactions],
          transferDraft: defaultDraft,
        }));
        queuePersist(transaction);

        return { transaction, reference, arrival };
      },

      executeConversion: (from, to, amount) => {
        const fee = calculateFee(amount, from);
        const net = amount - fee;
        const toAmount = convertAmount(net, from, to);
        const rate = getRate(from, to);
        const conversion: Conversion = {
          id: generateId("conv"),
          fromCurrency: from,
          toCurrency: to,
          fromAmount: amount,
          toAmount,
          fee,
          exchangeRate: rate,
          createdAt: new Date().toISOString(),
        };
        const transaction: Transaction = {
          id: generateId("txn"),
          type: "conversion",
          status: "completed",
          title: `Converted ${from} → ${to}`,
          subtitle: "Currency conversion",
          amount: -amount,
          currency: from,
          convertedAmount: toAmount,
          convertedCurrency: to,
          fee,
          feeCurrency: from,
          exchangeRate: rate,
          reference: generateReference(),
          date: conversion.createdAt,
          merchantOrRecipient: `${from} to ${to}`,
        };

        set((s) => ({
          balances: adjustBalance(
            adjustBalance(s.balances, from, -amount),
            to,
            toAmount
          ),
          transactions: [transaction, ...s.transactions],
        }));
        queuePersist(transaction);

        return conversion;
      },

      addMoney: async (currency, amount) => {
        const transaction: Transaction = {
          id: generateId("txn"),
          type: "deposit",
          status: "completed",
          title: "Added money",
          subtitle: "Added money",
          amount,
          currency,
          fee: 0,
          feeCurrency: currency,
          reference: generateReference(),
          date: new Date().toISOString(),
          merchantOrRecipient: "Bank transfer in",
        };

        // Optimistic UI update
        set((s) => ({
          balances: adjustBalance(s.balances, currency, amount),
          transactions: [transaction, ...s.transactions],
        }));

        if (!isSupabaseConfigured()) return;

        try {
          // Await cloud credit so Home total cannot be overwritten by a stale sync
          const result = await topUpWalletCloud(currency, amount);
          get().applyWalletBalances({ [result.currency as CurrencyCode]: result.balance });
          // Refresh full wallet set + keep deposit visible
          try {
            await get().syncBalancesFromCloud();
          } catch {
            // already applied returned balance
          }
        } catch (err) {
          console.error("Add money cloud sync failed", err);
          throw new Error(
            err instanceof Error
              ? err.message
              : "Could not add money in Supabase"
          );
        }
      },

      createRandomCard: async (input) => {
        if (!get().authUserId) {
          throw new Error("Sign in required");
        }
        const name = `${get().user.firstName} ${get().user.lastName}`.trim();
        if (!isSupabaseConfigured()) {
          throw new Error("Supabase is not configured");
        }
        const card = await createRandomCardCloud({
          cardholderName: name,
          network: input?.network,
          nickname: input?.nickname,
          color: input?.color,
          spendingLimit: input?.spendingLimit,
        });
        if (!card) throw new Error("Could not create card");

        set((s) => {
          const cards = [card, ...s.cards.filter((c) => c.id !== card.id)];
          return {
            cards,
            activeCardId: card.id,
            card,
          };
        });
        return card;
      },

      createCustomCard: async (input) => {
        if (!get().authUserId) {
          throw new Error("Sign in required");
        }
        if (!isSupabaseConfigured()) {
          throw new Error("Supabase is not configured");
        }
        if (!input.cardholderName.trim()) {
          throw new Error("Cardholder name is required");
        }
        const card = await createCustomCardCloud(input);
        if (!card) throw new Error("Could not create card");

        set((s) => {
          const cards = [card, ...s.cards.filter((c) => c.id !== card.id)];
          return {
            cards,
            activeCardId: card.id,
            card,
          };
        });
        return card;
      },

      addCustomTransaction: async (input) => {
        if (!get().authUserId) {
          throw new Error("Sign in required");
        }
        const direction = input.direction ?? "debit";
        const affectBalance = input.affectBalance ?? true;
        const signed =
          direction === "debit"
            ? -Math.abs(input.amount)
            : Math.abs(input.amount);

        // Optimistic local row so the UI updates immediately
        const optimistic: Transaction = {
          id: generateId("txn"),
          type: input.type ?? "custom",
          status: "completed",
          title: input.title?.trim() || input.vendorName,
          subtitle:
            input.subtitle?.trim() ||
            (direction === "debit" ? "Custom purchase" : "Custom credit"),
          amount: signed,
          currency: input.currency,
          fee: 0,
          feeCurrency: input.currency,
          reference: generateReference(),
          date: new Date().toISOString(),
          merchantOrRecipient: input.vendorName,
          vendorName: input.vendorName,
          vendorLogoUrl: input.vendorLogoUrl,
          icon: input.vendorLogoUrl,
          cardId: input.cardId,
          isCustom: true,
        };

        set((s) => {
          let balances = s.balances;
          let cards = s.cards;
          if (affectBalance) {
            balances = adjustBalance(balances, input.currency, signed);
          }
          if (input.cardId && direction === "debit") {
            cards = cards.map((c) =>
              c.id === input.cardId
                ? {
                    ...c,
                    spendingUsed: c.spendingUsed + Math.abs(signed),
                  }
                : c
            );
          }
          return {
            balances,
            cards,
            card: withActiveCard(cards, s.activeCardId),
            transactions: [optimistic, ...s.transactions],
          };
        });

        if (!isSupabaseConfigured()) {
          return optimistic;
        }

        try {
          const transaction = await createCustomTransactionCloud({
            amount: Math.abs(input.amount),
            currency: input.currency,
            vendorName: input.vendorName,
            direction,
            vendorLogoUrl: input.vendorLogoUrl,
            title: input.title,
            subtitle: input.subtitle,
            type: input.type ?? "custom",
            cardId: input.cardId,
          });

          set((s) => ({
            transactions: [
              transaction,
              ...s.transactions.filter(
                (t) => t.id !== optimistic.id && t.id !== transaction.id
              ),
            ],
          }));

          try {
            await get().syncBalancesFromCloud();
          } catch {
            // local balance already updated
          }

          return transaction;
        } catch (err) {
          // Keep optimistic row so Activity/Home still update
          console.error("Custom transaction cloud sync failed", err);
          const message =
            err instanceof Error ? err.message : "Cloud sync failed";
          const lower = message.toLowerCase();
          if (lower.includes("insufficient funds")) {
            throw new Error(
              "Insufficient funds in Supabase wallet (UI may be out of sync). Run the wallet repair SQL, then sign out/in. Shown in your feed locally."
            );
          }
          if (
            lower.includes("could not find the function") ||
            lower.includes("create_custom_transaction")
          ) {
            throw new Error(
              `${message}. Shown in your feed — install create_custom_transaction in Supabase.`
            );
          }
          throw new Error(`${message}. Shown in your feed locally.`);
        }
      },

      replaceCloudData: ({ cards, transactions }) => {
        set((s) => {
          const nextCards = cards ?? s.cards;
          const nextTxns = transactions ?? s.transactions;
          const activeCardId =
            nextCards.find((c) => c.id === s.activeCardId)?.id ??
            nextCards[0]?.id ??
            emptyCardPlaceholder.id;
          return {
            cards: nextCards,
            transactions: nextTxns,
            activeCardId,
            card:
              nextCards.length > 0
                ? withActiveCard(nextCards, activeCardId)
                : {
                    ...emptyCardPlaceholder,
                    cardholderName: `${s.user.firstName} ${s.user.lastName}`.trim(),
                  },
          };
        });
      },

      applyWalletBalances: (walletBalances) => {
        if (!walletBalances || Object.keys(walletBalances).length === 0) return;
        set((s) => ({
          balances: s.balances.map((b) =>
            walletBalances[b.currency] !== undefined
              ? { ...b, amount: Number(walletBalances[b.currency]) }
              : b
          ),
        }));
      },

      syncBalancesFromCloud: async () => {
        if (!isSupabaseConfigured() || !get().authUserId) return;
        const wallets = await ensureAndFetchBalances(STARTING_BALANCE_USD);
        get().applyWalletBalances(wallets);
      },

      mergeCloudData: ({ cards, transactions }) => {
        // Prefer cloud as source of truth for synced slices
        get().replaceCloudData({
          cards: cards ?? undefined,
          transactions: transactions ?? undefined,
        });
      },

      removeDevice: (deviceId) =>
        set((s) => ({
          security: {
            ...s.security,
            devices: s.security.devices.filter((d) => d.id !== deviceId),
          },
        })),

      resetAccountData: () =>
        set({
          user: DEFAULT_USER,
          balances: INITIAL_BALANCES,
          recipients: [],
          transactions: [],
          cards: [],
          activeCardId: emptyCardPlaceholder.id,
          card: emptyCardPlaceholder,
          security: INITIAL_SECURITY,
          settings: defaultSettings,
          transferDraft: defaultDraft,
          auth: defaultAuth,
          authUserId: null,
        }),
    }),
    {
      // Bump key to clear old ~$74k demo balances from localStorage
      name: "wise-storage-v3",
      partialize: (state) => ({
        user: state.user,
        balances: state.balances,
        recipients: state.recipients,
        transactions: state.transactions,
        cards: state.cards,
        activeCardId: state.activeCardId,
        card: state.card,
        security: state.security,
        settings: state.settings,
        auth: state.auth,
        authUserId: state.authUserId,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        // Never trust stale local "authenticated" without a supabase user id
        const authUserId = p.authUserId ?? null;
        const auth: AuthState = authUserId
          ? {
              isAuthenticated: true,
              hasCompletedOnboarding: p.auth?.hasCompletedOnboarding ?? true,
              hasPasscode: p.auth?.hasPasscode ?? false,
            }
          : defaultAuth;
        const cards = authUserId ? p.cards ?? [] : [];
        const transactions = authUserId ? p.transactions ?? [] : [];
        const activeCardId =
          cards.find((c) => c.id === p.activeCardId)?.id ??
          cards[0]?.id ??
          emptyCardPlaceholder.id;
        return {
          ...current,
          ...p,
          authUserId,
          auth,
          cards,
          transactions,
          recipients: authUserId ? p.recipients ?? [] : [],
          activeCardId,
          card:
            cards.length > 0
              ? withActiveCard(cards, activeCardId)
              : emptyCardPlaceholder,
          sessionChecked: false,
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

export function getTransferPreview(draft: TransferDraft) {
  const fee = calculateFee(draft.sourceAmount, draft.sourceCurrency);
  const net = Math.max(draft.sourceAmount - fee, 0);
  const targetAmount = convertAmount(
    net,
    draft.sourceCurrency,
    draft.targetCurrency
  );
  const rate = getRate(draft.sourceCurrency, draft.targetCurrency);
  return { fee, net, targetAmount, rate };
}

export type { PaymentMethod };
