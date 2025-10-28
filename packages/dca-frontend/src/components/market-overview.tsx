"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const DEFAULT_INTERVALS = ["1H", "4H", "1D", "1W"] as const;

export type ChartInterval = (typeof DEFAULT_INTERVALS)[number];

interface MarketOverviewProps {
  activeInterval: ChartInterval;
  intervals?: readonly ChartInterval[];
  onIntervalChange: (interval: ChartInterval) => void;
}

export function MarketOverviewCard({
  activeInterval,
  //
  intervals = DEFAULT_INTERVALS,
  onIntervalChange,
}: MarketOverviewProps) {
  const data = useMemo(
    () => generateChartPoints(activeInterval),
    [activeInterval]
  );
  const path = useMemo(() => createPath(data), [data]);

  return (
    <Card className="h-full border-white/5 bg-white/5 backdrop-blur">
      <CardHeader className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-white">Market Overview</CardTitle>
          <CardDescription className="text-white/60">
            Quick glimpse of{" "}
            <span className="font-semibold text-white">ETH/USDC</span>
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 p-1 text-sm">
          {intervals.map((interval) => (
            <button
              key={interval}
              type="button"
              onClick={() => onIntervalChange(interval)}
              className={`rounded-full px-4 py-1 transition ${
                activeInterval === interval
                  ? "bg-white text-black"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {interval}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pb-6">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
          <svg viewBox="0 0 400 200" className="h-64 w-full">
            <defs>
              <linearGradient
                id="priceGradient"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <path
              d={path}
              fill="url(#priceGradient)"
              stroke="#2563eb"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
          <div className="mt-4 flex items-center justify-between text-xs text-white/50">
            <span>09:00</span>
            <span>12:00</span>
            <span>15:00</span>
            <span>18:00</span>
          </div>
        </div>
        <Badge
          variant="secondary"
          className="bg-emerald-500/15 text-emerald-300"
        >
          +2.34% today
        </Badge>
      </CardContent>
    </Card>
  );
}

function generateChartPoints(interval: ChartInterval) {
  const base =
    interval === "1H"
      ? 20
      : interval === "4H"
        ? 30
        : interval === "1D"
          ? 40
          : 55;

  return Array.from({ length: base }, (_, index) => {
    const volatility = interval === "1W" ? 18 : interval === "1D" ? 12 : 8;
    const noise = Math.sin(index / 3) * volatility;
    const trend = index * (interval === "1W" ? 1.1 : 0.8);
    return 120 + trend + noise + Math.random() * 6;
  });
}

function createPath(values: number[]) {
  if (values.length === 0) return "";
  const max = Math.max(...values);
  const min = Math.min(...values);
  const normalize = (value: number) =>
    ((value - min) / (max - min || 1)) * 120 + 40;

  const step = 400 / (values.length - 1);
  let path = `M 0 ${200 - normalize(values[0])}`;

  values.forEach((value, index) => {
    const x = step * index;
    const y = 200 - normalize(value);
    path += ` L ${x} ${y}`;
  });

  path += ` L 400 200 L 0 200 Z`;
  return path;
}
