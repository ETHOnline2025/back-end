"use client";

import { Search } from "lucide-react";
import { useState } from "react";

import { SimpleModal } from "@/components/modals/simple-modal";
import { Input } from "@/components/ui/input";
import { TOKENS, type Token } from "@/lib/tokens";

type TokenSelectorModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (token: Token) => void;
  activeToken: Token;
};

export function TokenSelectorModal({
  open,
  onClose,
  onSelect,
  activeToken,
}: TokenSelectorModalProps) {
  const [query, setQuery] = useState("");

  const filtered = TOKENS.filter((token) => {
    const lowerQuery = query.toLowerCase();
    return (
      token.name.toLowerCase().includes(lowerQuery) ||
      token.symbol.toLowerCase().includes(lowerQuery)
    );
  });

  return (
    <SimpleModal
      open={open}
      title="Select token"
      description="Search and pick a token to continue."
      onClose={() => {
        setQuery("");
        onClose();
      }}
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <Input
            placeholder="Search name or symbol"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-11 rounded-xl border border-white/10 bg-white/5 pl-10 text-sm text-white placeholder:text-white/40 focus-visible:border-white/30 focus-visible:ring-0"
          />
        </div>

        <div className="grid gap-2">
          {filtered.map((token) => (
            <button
              key={token?.symbol}
              type="button"
              onClick={() => {
                onSelect(token);
                setQuery("");
              }}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                token?.symbol === activeToken?.symbol
                  ? "border-white/30 bg-white/15"
                  : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{token?.icon}</span>
                <div>
                  <p className="font-semibold text-white">{token?.name}</p>
                  <p className="text-xs text-white/50">{token?.symbol}</p>
                </div>
              </div>
              <div className="text-right text-sm text-white/70">
                ${token?.price.toLocaleString()}
              </div>
            </button>
          ))}
        </div>
      </div>
    </SimpleModal>
  );
}
