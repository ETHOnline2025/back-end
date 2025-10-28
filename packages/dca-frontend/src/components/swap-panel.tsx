"use client";

import { ArrowRightLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Token } from "@/lib/tokens";

interface SwapSummary {
  executionPrice: string;
  networkFee: string;
  slippage: string;
}

interface SwapPanelProps {
  fromToken: Token;
  toToken: Token;
  amount: string;
  toAmount: string;
  onAmountChange: (value: string) => void;
  onSwap: () => void;
  onSelectToken: (side: "from" | "to") => void;
  onSwitchTokens: () => void;
  summary: SwapSummary;
}

export function SwapPanel({
  fromToken,
  toToken,
  amount,
  toAmount,
  onAmountChange,
  onSwap,
  onSelectToken,
  onSwitchTokens,
  summary,
}: SwapPanelProps) {
  return (
    <Card className="h-full border-white/5 bg-white/5 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-white">Swap</CardTitle>
          <CardDescription className="text-white/60">
            Trade instantly
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <TokenInput
            label="From"
            token={fromToken}
            amount={amount}
            onAmountChange={onAmountChange}
            onSelectToken={() => onSelectToken("from")}
          />
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onSwitchTokens}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white transition hover:border-white/30 hover:bg-black/50"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </button>
          </div>
          <TokenInput
            label="To"
            token={toToken}
            amount={toAmount}
            readOnly
            onSelectToken={() => onSelectToken("to")}
          />
        </div>

        <div className="space-y-2 rounded-xl border border-white/5 bg-black/40 p-4 text-sm text-white/70">
          <DetailRow
            label="Execution price"
            value={`${summary.executionPrice} ${toToken?.symbol}`}
          />
          <DetailRow label="Network fee" value={summary.networkFee} />
          <DetailRow label="Slippage" value={summary.slippage} />
        </div>

        <Button
          className="h-12 w-full rounded-2xl bg-[#2563eb] text-base font-semibold text-white hover:bg-[#1d4ed8]"
          onClick={onSwap}
        >
          Swap
        </Button>
      </CardContent>
    </Card>
  );
}

function TokenInput({
  label,
  token,
  amount,
  onAmountChange,
  readOnly,
  onSelectToken,
}: {
  label: string;
  token: Token;
  amount: string;
  onAmountChange?: (value: string) => void;
  readOnly?: boolean;
  onSelectToken: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-white/60">
        <span>{label}</span>
        {/* <span>
          Balance:{" "}
          {Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(
            token?.price
          )}
        </span> */}
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <button
          type="button"
          onClick={onSelectToken}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-left text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/15"
        >
          <span className="text-lg">{token?.icon}</span>
          <div>
            <p>{token?.symbol}</p>
            <p className="text-xs text-white/60">{token?.name}</p>
          </div>
        </button>
        <div className="flex-1 text-right">
          <Label htmlFor={`${label}-amount`} className="sr-only">
            {label} amount
          </Label>
          <Input
            id={`${label}-amount`}
            value={amount}
            readOnly={readOnly}
            onChange={(event) => onAmountChange?.(event.target.value)}
            className="h-12 rounded-xl border-none bg-transparent text-right text-2xl font-semibold text-white outline-none focus-visible:ring-0"
          />
          <p className="text-xs text-white/50">
            ${(parseFloat(amount || "0") * token?.price).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-white/50">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}
