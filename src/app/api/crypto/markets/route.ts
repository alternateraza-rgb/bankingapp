import { NextResponse } from "next/server";

const IDS = "bitcoin,ethereum,solana";

export async function GET() {
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${IDS}&vs_currencies=usd&include_24hr_change=true`;
    const res = await fetch(url, {
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "CoinGecko request failed", status: res.status },
        { status: 502 }
      );
    }
    const data = (await res.json()) as Record<
      string,
      { usd?: number; usd_24h_change?: number }
    >;

    const meta: Record<string, { symbol: string; name: string }> = {
      bitcoin: { symbol: "BTC", name: "Bitcoin" },
      ethereum: { symbol: "ETH", name: "Ethereum" },
      solana: { symbol: "SOL", name: "Solana" },
    };

    const markets = Object.entries(meta).map(([id, m]) => ({
      id,
      symbol: m.symbol,
      name: m.name,
      price: data[id]?.usd ?? 0,
      change24h: data[id]?.usd_24h_change ?? 0,
    }));

    return NextResponse.json({ markets });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Markets proxy error",
      },
      { status: 500 }
    );
  }
}
