"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getCards,
  getCryptoHoldings,
  getLedger,
  getWallets,
} from "@/services/niro";
import type {
  CardRow,
  CryptoHolding,
  LedgerEntry,
  Wallet,
} from "@/types/database";

export function useNiroData() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [holdings, setHoldings] = useState<CryptoHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [w, l, c, h] = await Promise.all([
        getWallets(),
        getLedger(),
        getCards(),
        getCryptoHoldings(),
      ]);
      setWallets(w);
      setLedger(l);
      setCards(c);
      setHoldings(h);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("niro-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallets" },
        () => {
          void refresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ledger_entries" },
        () => {
          void refresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { wallets, ledger, cards, holdings, loading, error, refresh };
}
