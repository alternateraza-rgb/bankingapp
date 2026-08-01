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
  INITIAL_CARD,
  INITIAL_CARDS,
  INITIAL_RECIPIENTS,
  INITIAL_SECURITY,
} from "@/data/user";
import { INITIAL_TRANSACTIONS } from "@/data/transactions";
import {
  calculateFee,
  convertAmount,
  getRate,
} from "@/lib/exchange";
import { buildCustomCard, buildRandomCard } from "@/lib/cards";
import { generateId, generateReference } from "@/lib/utils";
import { addBusinessDays, formatISO } from "date-fns";
import {
  createCustomCardCloud,
  createCustomTransactionCloud,
  createRandomCardCloud,
  isSupabaseConfigured,
  persistTransactionCloud,
  setCardFrozenCloud,
  signOutSupabase,
  updateCardCloud,
} from "@/services/wise-cloud";

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
  transferDraft: TransferDraft;
  hydrated: boolean;

  setHydrated: (value: boolean) => void;
  setHideBalances: (hide: boolean) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  updateSecurity: (partial: Partial<SecuritySetting>) => void;
  updateCard: (partial: Partial<Card>, cardId?: string) => void;
  setActiveCardId: (cardId: string) => void;
  updateUser: (partial: Partial<User>) => void;
  toggleRateAlert: (pair: string) => void;

  signIn: () => void;
  completeOnboarding: () => void;
  setPasscodeCreated: () => void;
  signOut: () => void;

  setTransferDraft: (partial: Partial<TransferDraft>) => void;
  resetTransferDraft: () => void;
  addRecipient: (recipient: Omit<Recipient, "id">) => Recipient;
  executeTransfer: () => { transaction: Transaction; reference: string; arrival: string };
  executeConversion: (
    from: CurrencyCode,
    to: CurrencyCode,
    amount: number
  ) => Conversion;
  addMoney: (currency: CurrencyCode, amount: number) => void;
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
  mergeCloudData: (input: {
    cards?: Card[];
    transactions?: Transaction[];
  }) => void;
  removeDevice: (deviceId: string) => void;
  resetAccountData: () => void;
}

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
  return cards.find((c) => c.id === activeCardId) ?? cards[0] ?? INITIAL_CARD;
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
      recipients: INITIAL_RECIPIENTS,
      transactions: INITIAL_TRANSACTIONS,
      cards: INITIAL_CARDS,
      activeCardId: INITIAL_CARD.id,
      card: INITIAL_CARD,
      security: INITIAL_SECURITY,
      settings: defaultSettings,
      auth: defaultAuth,
      transferDraft: defaultDraft,
      hydrated: false,

      setHydrated: (value) => set({ hydrated: value }),

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

      signIn: () =>
        set({
          auth: {
            isAuthenticated: true,
            hasCompletedOnboarding: true,
            hasPasscode: true,
          },
        }),

      completeOnboarding: () =>
        set((s) => ({
          auth: { ...s.auth, hasCompletedOnboarding: true, isAuthenticated: true },
        })),

      setPasscodeCreated: () =>
        set((s) => ({
          auth: { ...s.auth, hasPasscode: true },
          security: { ...s.security, passcodeEnabled: true },
        })),

      signOut: () => {
        void signOutSupabase();
        set({
          auth: defaultAuth,
          transferDraft: defaultDraft,
        });
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

      addMoney: (currency, amount) => {
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
        set((s) => ({
          balances: adjustBalance(s.balances, currency, amount),
          transactions: [transaction, ...s.transactions],
        }));
        queuePersist(transaction);
      },

      createRandomCard: async (input) => {
        const name = `${get().user.firstName} ${get().user.lastName}`.trim();
        let card: Card | null = null;
        if (isSupabaseConfigured()) {
          try {
            card = await createRandomCardCloud({
              cardholderName: name,
              network: input?.network,
              nickname: input?.nickname,
              color: input?.color,
              spendingLimit: input?.spendingLimit,
            });
          } catch (err) {
            console.warn("Cloud random card failed, using local", err);
          }
        }
        card ??= buildRandomCard({
          cardholderName: name,
          network: input?.network,
          nickname: input?.nickname,
          color: input?.color,
          spendingLimit: input?.spendingLimit,
        });

        set((s) => {
          const cards = [card!, ...s.cards];
          return {
            cards,
            activeCardId: card!.id,
            card: card!,
          };
        });
        return card;
      },

      createCustomCard: async (input) => {
        let card: Card | null = null;
        if (isSupabaseConfigured()) {
          try {
            card = await createCustomCardCloud(input);
          } catch (err) {
            console.warn("Cloud custom card failed, using local", err);
          }
        }
        card ??= buildCustomCard(input);
        if (!card.cardholderName) {
          throw new Error("Cardholder name is required");
        }

        set((s) => {
          const cards = [card!, ...s.cards];
          return {
            cards,
            activeCardId: card!.id,
            card: card!,
          };
        });
        return card;
      },

      addCustomTransaction: async (input) => {
        const direction = input.direction ?? "debit";
        const affectBalance = input.affectBalance ?? true;
        const signed =
          direction === "debit" ? -Math.abs(input.amount) : Math.abs(input.amount);

        let transaction: Transaction | null = null;
        if (isSupabaseConfigured()) {
          try {
            transaction = await createCustomTransactionCloud({
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
          } catch (err) {
            console.warn("Cloud custom transaction failed, using local", err);
          }
        }

        transaction ??= {
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
            balances = adjustBalance(balances, input.currency, transaction!.amount);
          }
          if (
            input.cardId &&
            direction === "debit" &&
            transaction!.status === "completed"
          ) {
            cards = cards.map((c) =>
              c.id === input.cardId
                ? {
                    ...c,
                    spendingUsed: c.spendingUsed + Math.abs(transaction!.amount),
                  }
                : c
            );
          }
          return {
            balances,
            cards,
            card: withActiveCard(cards, s.activeCardId),
            transactions: [transaction!, ...s.transactions],
          };
        });

        if (!isSupabaseConfigured() || !transaction.id.includes("-")) {
          // already persisted via RPC when cloud succeeded with UUID
        } else if (transaction.isCustom && transaction.reference.startsWith("CTX")) {
          // created via RPC
        } else {
          queuePersist(transaction);
        }

        return transaction;
      },

      mergeCloudData: ({ cards, transactions }) => {
        set((s) => {
          const nextCards =
            cards && cards.length > 0
              ? [
                  ...cards,
                  ...s.cards.filter((c) => !cards.some((x) => x.id === c.id)),
                ]
              : s.cards;
          const nextTxns =
            transactions && transactions.length > 0
              ? [
                  ...transactions,
                  ...s.transactions.filter(
                    (t) => !transactions.some((x) => x.reference === t.reference)
                  ),
                ]
              : s.transactions;
          const activeCardId =
            nextCards.find((c) => c.id === s.activeCardId)?.id ??
            nextCards[0]?.id ??
            s.activeCardId;
          return {
            cards: nextCards,
            transactions: nextTxns,
            activeCardId,
            card: withActiveCard(nextCards, activeCardId),
          };
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
          recipients: INITIAL_RECIPIENTS,
          transactions: INITIAL_TRANSACTIONS,
          cards: INITIAL_CARDS,
          activeCardId: INITIAL_CARD.id,
          card: INITIAL_CARD,
          security: INITIAL_SECURITY,
          settings: defaultSettings,
          transferDraft: defaultDraft,
        }),
    }),
    {
      name: "wise-storage",
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
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        const cards =
          p.cards && p.cards.length > 0
            ? p.cards
            : p.card
              ? [p.card]
              : current.cards;
        const activeCardId =
          p.activeCardId && cards.some((c) => c.id === p.activeCardId)
            ? p.activeCardId
            : cards[0]?.id ?? current.activeCardId;
        return {
          ...current,
          ...p,
          cards,
          activeCardId,
          card: withActiveCard(cards, activeCardId),
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
