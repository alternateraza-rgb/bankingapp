"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import { fetchRateHistory } from "@/services/api";
import type { CurrencyCode } from "@/types";
import { cn } from "@/lib/utils";
import { SkeletonLoader } from "@/components/ui/skeleton";

const ranges = ["1D", "1W", "1M", "3M", "1Y"] as const;

interface ExchangeRateChartProps {
  from: CurrencyCode;
  to: CurrencyCode;
  className?: string;
}

export function ExchangeRateChart({
  from,
  to,
  className,
}: ExchangeRateChartProps) {
  const [range, setRange] = useState<(typeof ranges)[number]>("1M");
  const [data, setData] = useState<{ date: string; rate: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRateHistory(from, to, range).then((points) => {
      if (!cancelled) {
        setData(points);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [from, to, range]);

  return (
    <div className={cn("rounded-[24px] bg-wise-surface p-4", className)}>
      <div className="mb-3 flex gap-1 overflow-x-auto">
        {ranges.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={cn(
              "min-h-9 rounded-full px-3 text-xs font-semibold transition-colors",
              range === r
                ? "bg-white text-black"
                : "bg-wise-surface-2 text-wise-mute hover:bg-wise-surface-3"
            )}
            aria-pressed={range === r}
          >
            {r}
          </button>
        ))}
      </div>
      {loading ? (
        <SkeletonLoader className="h-40 w-full" />
      ) : (
        <div className="h-40 w-full" role="img" aria-label={`Exchange rate chart ${from} to ${to}`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="rateFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9FE870" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#9FE870" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={(v) =>
                  format(new Date(v), range === "1D" ? "HH:mm" : "MMM d")
                }
                tick={{ fontSize: 10, fill: "#868685" }}
                axisLine={false}
                tickLine={false}
                minTickGap={30}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 10, fill: "#868685" }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #d6dbd4",
                  fontSize: 12,
                }}
                labelFormatter={(v) => format(new Date(String(v)), "PPp")}
                formatter={(value) => [
                  typeof value === "number" ? value.toFixed(4) : String(value ?? ""),
                  "Rate",
                ]}
              />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="#163300"
                strokeWidth={2}
                fill="url(#rateFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
