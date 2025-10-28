"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Token } from "@/lib/tokens";

interface PortfolioCardProps {
  tokens: Token[];
  performanceLabel?: string;
}

export function PortfolioCard({
  tokens,
  performanceLabel = "+4.8% 24h",
}: PortfolioCardProps) {
  return (
    <Card className="border-white/5 bg-white/5 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-white">Portfolio</CardTitle>
          <CardDescription className="text-white/60">
            Quick token performance snapshot
          </CardDescription>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
          {performanceLabel}
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        {tokens.map((token) => (
          <div
            key={token.symbol}
            className="flex items-center justify-between rounded-xl border border-white/5 bg-black/40 px-3 py-2"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{token.icon}</span>
              <div>
                <p className="font-medium text-white">{token.name}</p>
                <p className="text-xs uppercase tracking-wide text-white/50">{token.symbol}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-white">
                ${token.price.toLocaleString()}
              </p>
              <p className={`text-xs ${token.change >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                {token.change >= 0 ? "+" : ""}
                {token.change}%
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
