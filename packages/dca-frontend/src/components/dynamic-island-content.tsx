"use client";

import {
  ArrowRightLeft,
  CheckCircle2,
  Loader2,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { Token } from "@/lib/tokens";

export function SwapSendingContent({
  from,
  to,
  amount,
}: {
  from: Token;
  to: Token;
  amount: string;
}) {
  return (
    <motion.div
      className="flex items-center gap-3 px-5 py-3 text-white"
      initial={{ opacity: 0.9 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
        <ArrowRightLeft className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
          Sending swap
        </p>
        <p className="text-sm text-white/90">
          {amount} {from.symbol} → {to.symbol}
        </p>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full w-full origin-left bg-white"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 2.2, ease: "easeInOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export function SwapSuccessContent({
  from,
  to,
  amount,
  onDismiss,
}: {
  from: Token;
  to: Token;
  amount: string;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 text-white">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20">
        <CheckCircle2 className="h-5 w-5 text-emerald-300" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200/80">
          Swap completed
        </p>
        <p className="text-sm text-white/90">
          {amount} {from.symbol} → {to.symbol}
        </p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 rounded-full bg-white/10 px-3 text-xs text-white hover:bg-white/15"
        onClick={onDismiss}
      >
        Dismiss
      </Button>
    </div>
  );
}

export function SwapErrorContent({
  onRetry,
  message,
}: {
  onRetry: () => void;
  message: string;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 text-white">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/20">
        <XCircle className="h-5 w-5 text-red-200" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-200/80">
          Swap failed
        </p>
        <p className="text-sm text-white/90">{message}</p>
      </div>
      <Button
        size="sm"
        className="h-8 rounded-full bg-white px-3 text-xs font-semibold text-black hover:bg-white/90"
        onClick={onRetry}
      >
        Retry
      </Button>
    </div>
  );
}

export function TransferPendingContent({
  title,
  subtitle,
  icon,
  iconBgClass,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  iconBgClass: string;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 text-white">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full ${iconBgClass}`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
          {title}
        </p>
        <p className="text-sm text-white/90">{subtitle}</p>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full w-full origin-left bg-white"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 2.2, ease: "easeInOut" }}
          />
        </div>
      </div>
      <Loader2 className="h-4 w-4 animate-spin text-white/70" />
    </div>
  );
}

export function TransferSuccessContent({
  title,
  subtitle,
  hash,
}: {
  title: string;
  subtitle: string;
  hash?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 text-white">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20">
        <CheckCircle2 className="h-5 w-5 text-emerald-300" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200/80">
          {title}
        </p>
        <p className="text-sm text-white/90">{subtitle}</p>
        {hash ? <p className="text-xs text-white/50">Tx: {hash}</p> : null}
      </div>
    </div>
  );
}

export function TransferErrorContent({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 text-white">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/20">
        <XCircle className="h-5 w-5 text-red-200" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-200/80">
          {title}
        </p>
        <p className="text-sm text-white/90">{subtitle}</p>
      </div>
    </div>
  );
}
