"use client";

import { SimpleModal } from "@/components/modals/simple-modal";

type PortfolioSummaryModalProps = {
  open: boolean;
  onClose: () => void;
  formattedBalance: string;
};

export function PortfolioSummaryModal({
  open,
  onClose,
  formattedBalance,
}: PortfolioSummaryModalProps) {
  return (
    <SimpleModal
      open={open}
      title="Portfolio summary"
      description="Overview of your unified balance."
      onClose={onClose}
    >
      <div className="space-y-4 text-sm text-white/80">
        <DetailRow label="Total balance" value={formattedBalance} />
        <DetailRow label="Available to swap" value={formattedBalance} />
        {/* <DetailRow label="Rewards this week" value="45.2 OP" /> */}
        {/* <Button
          onClick={onClose}
          className="w-full rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8]"
        >
          Close
        </Button> */}
      </div>
    </SimpleModal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/50">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}
