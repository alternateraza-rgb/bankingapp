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
  INITIAL_RECIPIENTS,
  INITIAL_SECURITY,
} from "@/data/user";
import { INITIAL_TRANSACTIONS } from "@/data/transactions";
import {
  calculateFee,
  convertAmount,
  getRate,
} from "@/lib/exchange";
import { generateId, generateReference } from "@/lib/utils";
import { addBusinessDays, formatISO } from "date-fns";

interface AppState {
  user: User;
  balances: CurrencyBalance[];
  recipients: Recipient[];
  transactions: Transaction[];
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
  updateCard: (partial: Partial<Card>) => void;
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

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: DEFAULT_USER,
      balances: INITIAL_BALANCES,
      recipients: INITIAL_RECIPIENTS,
      transactions: INITIAL_TRANSACTIONS,
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

      updateCard: (partial) =>
        set((s) => ({ card: { ...s.card, ...partial } })),

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

      signOut: () =>
        set({
          auth: defaultAuth,
          transferDraft: defaultDraft,
        }),

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
        card: state.card,
        security: state.security,
        settings: state.settings,
        auth: state.auth,
      }),
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
