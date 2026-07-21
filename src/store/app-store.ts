"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CurrencyCode, PaymentMethod, TransferDraft } from "@/types";

export type SendTarget = {
  id: string;
  handle: string;
  fullName: string;
  initials: string;
} | null;

interface AppState {
  hideBalances: boolean;
  transferDraft: TransferDraft;
  sendTarget: SendTarget;
  setHideBalances: (hide: boolean) => void;
  setTransferDraft: (partial: Partial<TransferDraft>) => void;
  resetTransferDraft: () => void;
  setSendTarget: (target: SendTarget) => void;
}

const defaultDraft: TransferDraft = {
  recipientId: null,
  sourceCurrency: "USD" as CurrencyCode,
  targetCurrency: "USD" as CurrencyCode,
  sourceAmount: 0,
  paymentMethod: "balance" as PaymentMethod,
  note: "",
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hideBalances: false,
      transferDraft: defaultDraft,
      sendTarget: null,
      setHideBalances: (hide) => set({ hideBalances: hide }),
      setTransferDraft: (partial) =>
        set((s) => ({
          transferDraft: { ...s.transferDraft, ...partial },
        })),
      resetTransferDraft: () =>
        set({ transferDraft: defaultDraft, sendTarget: null }),
      setSendTarget: (target) => set({ sendTarget: target }),
    }),
    { name: "niro-ui" }
  )
);
