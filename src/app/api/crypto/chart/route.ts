import { NextRequest, NextResponse } from "next/server";

const ALLOWED = new Set(["bitcoin", "ethereum", "solana"]);

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "bitcoin";
  const days = req.nextUrl.searchParams.get("days") ?? "7";

  if (!ALLOWED.has(id)) {
    return NextResponse.json({ error: "Unsupported asset id" }, { status: 400 });
  }

  const daysNum = Number(days);
  if (![1, 7, 14, 30, 90].includes(daysNum)) {
    return NextResponse.json({ error: "Unsupported days" }, { status: 400 });
  }

  try {
    const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${daysNum}`;
    const res = await fetch(url, {
      next: { revalidate: 120 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "CoinGecko chart failed", status: res.status },
        { status: 502 }
      );
    }
    const data = (await res.json()) as {
      prices?: [number, number][];
    };
    return NextResponse.json({
      id,
      days: daysNum,
      prices: data.prices ?? [],
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Chart proxy error",
      },
      { status: 500 }
    );
  }
}
