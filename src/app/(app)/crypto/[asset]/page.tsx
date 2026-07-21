"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CRYPTO_ASSETS } from "@/lib/currencies";
import { useNiroData } from "@/hooks/use-niro-data";
import { cryptoBuy, cryptoSell } from "@/services/niro";
import { formatMoney } from "@/lib/format";
import { toast } from "sonner";

const SYMBOL_TO_ID: Record<string, string> = {
  btc: "bitcoin",
  eth: "ethereum",
  sol: "solana",
  bitcoin: "bitcoin",
  ethereum: "ethereum",
  solana: "solana",
};

const ID_TO_SYMBOL: Record<string, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  solana: "SOL",
};

type ChartPoint = { t: number; price: number };

export default function CryptoAssetPage({
  params,
}: {
  params: Promise<{ asset: string }>;
}) {
  const { asset: raw } = use(params);
  const coinId = SYMBOL_TO_ID[raw.toLowerCase()] ?? raw.toLowerCase();
  const symbol = ID_TO_SYMBOL[coinId] ?? raw.toUpperCase();
  const meta = CRYPTO_ASSETS.find((a) => a.id === coinId);

  const { holdings, wallets, refresh } = useNiroData();
  const holding = holdings.find((h) => h.asset.toUpperCase() === symbol);
  const usdWallet = wallets.find((w) => w.currency === "USD");

  const [price, setPrice] = useState(0);
  const [change24h, setChange24h] = useState(0);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [days, setDays] = useState(7);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amountStr, setAmountStr] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      fetch("/api/crypto/markets").then((r) => r.json()),
      fetch(`/api/crypto/chart?id=${coinId}&days=${days}`).then((r) =>
        r.json()
      ),
    ])
      .then(([markets, chartRes]) => {
        if (cancelled) return;
        const row = (markets.markets as { id: string; price: number; change24h: number }[])?.find(
          (m) => m.id === coinId
        );
        if (row) {
          setPrice(row.price);
          setChange24h(row.change24h);
        }
        const prices = (chartRes.prices as [number, number][]) ?? [];
        setChart(prices.map(([t, p]) => ({ t, price: p })));
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load market data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coinId, days]);

  const amount = Number(amountStr) || 0;
  const qtyPreview = useMemo(() => {
    if (!price || amount <= 0) return 0;
    return side === "buy" ? amount / price : amount;
  }, [amount, price, side]);

  if (!meta && !ID_TO_SYMBOL[coinId]) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
        <p className="text-wise-mute">Unknown asset</p>
        <Button asChild>
          <Link href="/crypto">Back to markets</Link>
        </Button>
      </div>
    );
  }

  const submit = async () => {
    if (!price || amount <= 0) {
      toast.error(side === "buy" ? "Enter USD amount" : "Enter quantity");
      return;
    }
    setBusy(true);
    const quotedAt = new Date().toISOString();
    try {
      if (side === "buy") {
        await cryptoBuy(symbol, amount, price, quotedAt);
      } else {
        await cryptoSell(symbol, amount, price, quotedAt);
      }
      await refresh();
      setAmountStr("");
      toast.success(side === "buy" ? "Bought" : "Sold");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Trade failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader
        title={meta?.name ?? symbol}
        showBack
        backHref="/crypto"
      />
      <main className="flex flex-1 flex-col gap-5 px-4 pb-10">
        <div>
          <p className="text-sm text-wise-mute">{symbol}</p>
          <p className="balance-amount mt-1 text-3xl font-semibold text-white">
            {loading || !price ? "…" : formatMoney(price, "USD")}
          </p>
          <p
            className={`mt-1 text-sm ${
              change24h >= 0 ? "text-wise-positive" : "text-wise-negative"
            }`}
          >
            {change24h >= 0 ? "+" : ""}
            {change24h.toFixed(2)}% (24h)
          </p>
          {holding ? (
            <p className="mt-2 text-sm text-wise-mute">
              You hold {Number(holding.quantity).toFixed(6)} {symbol}
            </p>
          ) : null}
        </div>

        <div className="h-40 w-full rounded-[20px] bg-wise-surface p-2">
          {chart.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart}>
                <defs>
                  <linearGradient id="cryptoFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={meta?.color ?? "#9FE870"}
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor={meta?.color ?? "#9FE870"}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <YAxis domain={["auto", "auto"]} hide />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={meta?.color ?? "#9FE870"}
                  strokeWidth={2}
                  fill="url(#cryptoFill)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-wise-mute">
              {loading ? "Loading chart…" : "No chart data"}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {[1, 7, 30].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                days === d
                  ? "bg-white text-black"
                  : "bg-wise-surface-2 text-wise-mute"
              }`}
            >
              {d}D
            </button>
          ))}
        </div>

        <div className="flex gap-2 rounded-full bg-wise-surface p-1">
          {(["buy", "sell"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              className={`flex-1 rounded-full py-2.5 text-sm font-semibold capitalize ${
                side === s ? "bg-white text-black" : "text-wise-mute"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div>
          <Label htmlFor="trade-amount">
            {side === "buy" ? "USD amount" : `${symbol} quantity`}
          </Label>
          <Input
            id="trade-amount"
            className="mt-1.5"
            inputMode="decimal"
            value={amountStr}
            onChange={(e) =>
              setAmountStr(e.target.value.replace(/[^0-9.]/g, ""))
            }
          />
          {side === "buy" && usdWallet ? (
            <p className="mt-1 text-xs text-wise-mute">
              USD available{" "}
              {formatMoney(Number(usdWallet.balance), "USD")}
            </p>
          ) : null}
          {amount > 0 && price > 0 ? (
            <p className="mt-1 text-xs text-wise-mute">
              {side === "buy"
                ? `≈ ${qtyPreview.toFixed(6)} ${symbol}`
                : `≈ ${formatMoney(qtyPreview * price, "USD")}`}
            </p>
          ) : null}
        </div>

        <Button className="w-full" onClick={submit} disabled={busy || !price}>
          {busy
            ? "Working…"
            : side === "buy"
              ? `Buy ${symbol}`
              : `Sell ${symbol}`}
        </Button>
      </main>
    </div>
  );
}
