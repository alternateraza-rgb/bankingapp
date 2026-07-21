"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { MobileHeader } from "@/components/layout/mobile-header";
import { CryptoIcon } from "@/components/crypto/crypto-icon";
import { CRYPTO_ASSETS } from "@/lib/currencies";
import { useNiroData } from "@/hooks/use-niro-data";
import { formatMoney } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { easeOut, staggerContainer, listItem } from "@/lib/motion";

type MarketRow = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
};

export default function CryptoMarketsPage() {
  const { holdings } = useNiroData();
  const [markets, setMarkets] = useState<MarketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    void fetch("/api/crypto/markets")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load markets");
        return res.json() as Promise<{ markets: MarketRow[] }>;
      })
      .then((data) => setMarkets(data.markets ?? []))
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Could not load markets")
      )
      .finally(() => setLoading(false));
  }, []);

  const rows =
    markets.length > 0
      ? markets
      : CRYPTO_ASSETS.map((a) => ({
          id: a.id,
          symbol: a.symbol,
          name: a.name,
          price: 0,
          change24h: 0,
        }));

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col overflow-x-hidden">
      <MobileHeader title="Crypto" showBack backHref="/home" />
      <main className="flex min-w-0 flex-1 flex-col gap-7 px-4 pb-8">
        {holdings.length > 0 ? (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-wise-mute">
              Your holdings
            </h2>
            <motion.div
              className="space-y-2"
              variants={reduce ? undefined : staggerContainer}
              initial={reduce ? false : "hidden"}
              animate="show"
            >
              {holdings.map((h) => {
                const m = rows.find(
                  (r) => r.symbol.toUpperCase() === h.asset.toUpperCase()
                );
                const value = m?.price
                  ? Number(h.quantity) * m.price
                  : null;
                return (
                  <motion.div key={h.id} variants={reduce ? undefined : listItem}>
                    <Link
                      href={`/crypto/${h.asset.toLowerCase()}`}
                      className="flex min-w-0 items-center gap-3 rounded-[22px] bg-wise-surface px-3.5 py-3.5 active:scale-[0.99] transition-transform"
                    >
                      <CryptoIcon asset={h.asset} size={42} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-white">
                          {h.asset}
                        </span>
                        <span className="block text-sm text-wise-mute">
                          {Number(h.quantity).toFixed(6)}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block font-semibold tabular-nums text-white">
                          {value != null ? formatMoney(value, "USD") : "—"}
                        </span>
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          </section>
        ) : null}

        <section>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-wise-mute">
              Markets
            </h2>
            <p className="text-[11px] text-wise-mute-2">Live · demo trade</p>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-[72px] w-full rounded-[22px]" />
              ))}
            </div>
          ) : error ? (
            <p className="py-10 text-center text-sm text-wise-mute">{error}</p>
          ) : (
            <motion.div
              className="space-y-2"
              variants={reduce ? undefined : staggerContainer}
              initial={reduce ? false : "hidden"}
              animate="show"
            >
              {rows.map((m) => {
                const up = m.change24h >= 0;
                return (
                  <motion.div key={m.id} variants={reduce ? undefined : listItem}>
                    <Link
                      href={`/crypto/${m.symbol.toLowerCase()}`}
                      className="flex min-w-0 items-center gap-3 rounded-[22px] bg-wise-surface px-3.5 py-3.5 transition-transform active:scale-[0.99]"
                    >
                      <CryptoIcon asset={m.symbol} size={42} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-white">
                          {m.name}
                        </span>
                        <span className="block text-sm text-wise-mute">
                          {m.symbol}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-semibold tabular-nums text-white">
                          {m.price ? formatMoney(m.price, "USD") : "—"}
                        </span>
                        <span
                          className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                            up
                              ? "bg-wise-positive/15 text-wise-positive"
                              : "bg-wise-negative/15 text-wise-negative"
                          }`}
                        >
                          {up ? "+" : ""}
                          {m.change24h.toFixed(2)}%
                        </span>
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </section>

        <motion.p
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.35, ease: easeOut }}
          className="text-center text-xs text-wise-mute-2"
        >
          Prices via CoinGecko · fills are simulated against your USD wallet
        </motion.p>
      </main>
    </div>
  );
}
