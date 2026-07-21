"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MobileHeader } from "@/components/layout/mobile-header";
import { CRYPTO_ASSETS } from "@/lib/currencies";
import { useNiroData } from "@/hooks/use-niro-data";
import { formatMoney } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

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

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Crypto" showBack backHref="/home" />
      <main className="flex flex-1 flex-col gap-6 px-4 pb-8">
        {holdings.length > 0 ? (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-wise-mute">
              Your holdings
            </h2>
            <div className="space-y-2">
              {holdings.map((h) => (
                <Link
                  key={h.id}
                  href={`/crypto/${h.asset.toLowerCase()}`}
                  className="flex items-center justify-between rounded-[18px] bg-wise-surface px-4 py-3"
                >
                  <span className="font-semibold text-white">{h.asset}</span>
                  <span className="text-sm text-wise-mute">
                    {Number(h.quantity).toFixed(6)}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <h2 className="mb-2 text-sm font-semibold text-wise-mute">Markets</h2>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-[20px]" />
              ))}
            </div>
          ) : error ? (
            <p className="py-8 text-center text-sm text-wise-mute">{error}</p>
          ) : (
            <div className="space-y-2">
              {(markets.length
                ? markets
                : CRYPTO_ASSETS.map((a) => ({
                    id: a.id,
                    symbol: a.symbol,
                    name: a.name,
                    price: 0,
                    change24h: 0,
                  }))
              ).map((m) => {
                const meta = CRYPTO_ASSETS.find((a) => a.id === m.id);
                return (
                  <Link
                    key={m.id}
                    href={`/crypto/${m.symbol.toLowerCase()}`}
                    className="flex items-center gap-3 rounded-[20px] bg-wise-surface px-4 py-3.5 hover:bg-wise-surface-2"
                  >
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-black"
                      style={{ background: meta?.color ?? "#fff" }}
                    >
                      {m.symbol.slice(0, 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-white">
                        {m.name}
                      </span>
                      <span className="block text-sm text-wise-mute">
                        {m.symbol}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block font-semibold text-white">
                        {m.price
                          ? formatMoney(m.price, "USD")
                          : "—"}
                      </span>
                      <span
                        className={`block text-xs ${
                          m.change24h >= 0
                            ? "text-wise-positive"
                            : "text-wise-negative"
                        }`}
                      >
                        {m.change24h >= 0 ? "+" : ""}
                        {m.change24h.toFixed(2)}%
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
