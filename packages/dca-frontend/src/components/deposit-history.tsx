import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Deposit, useBackend } from '@/hooks/useBackend';
import { cn } from '@/lib/utils';

interface DepositHistoryProps {
  onRefresh?: () => void;
  variant?: 'card' | 'plain';
  className?: string;
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-green-500/10 text-green-400',
  PENDING: 'bg-blue-500/10 text-blue-400',
  FAILED: 'bg-red-500/10 text-red-400',
};

const CHAIN_COLORS: Record<string, string> = {
  NATIVE: 'bg-sky-500/10 text-sky-400',
  OTHER: 'bg-purple-500/10 text-purple-400',
};

const truncateMiddle = (value: string | undefined, visible = 6) => {
  if (!value) return '—';
  if (value.length <= visible * 2) return value;
  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
};

export const DepositHistory: React.FC<DepositHistoryProps> = ({ variant = 'card', className }) => {
  const { getDeposits } = useBackend();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [chainTypeFilter, setChainTypeFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 10,
    offset: 0,
    hasMore: false,
  });

  const filterParams = useMemo(() => {
    const params: Record<string, string | number> = {
      limit: pagination.limit,
      offset: 0,
    };

    if (statusFilter !== 'all') {
      params.status = statusFilter;
    }

    if (chainTypeFilter !== 'all') {
      params.chainType = chainTypeFilter;
    }

    return params;
  }, [chainTypeFilter, pagination.limit, statusFilter]);

  const fetchDeposits = useCallback(
    async (offset = 0) => {
      try {
        setIsLoading(true);
        setError(null);

        const params = {
          ...filterParams,
          offset,
        };

        const response = await getDeposits(params);
        setDeposits((current) =>
          offset === 0 ? response.deposits : [...current, ...response.deposits]
        );
        setPagination(response.pagination);
      } catch (err) {
        console.error('Error fetching deposits:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch deposits');
      } finally {
        setIsLoading(false);
      }
    },
    [filterParams, getDeposits]
  );

  useEffect(() => {
    fetchDeposits(0);
  }, [fetchDeposits]);

  const handleLoadMore = () => {
    if (pagination.hasMore && !isLoading) {
      fetchDeposits(pagination.offset + pagination.limit);
    }
  };

  const formatAmount = (amount: string, decimals = 6) => {
    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount)) return '0.000000';
    return (numericAmount / Math.pow(10, decimals)).toFixed(6);
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const header = (
    <div className="border-b border-white/10 pb-6">
      <h2 className="text-2xl font-bold text-white">Deposit History</h2>
      <p className="mt-2 text-sm text-white/60">
        Track every deposit across chains and quickly filter by status.
      </p>

      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-10 w-full border-[#1f242f] bg-[#1a1f2e] text-sm text-white md:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-[#13161b] text-white">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={chainTypeFilter} onValueChange={setChainTypeFilter}>
          <SelectTrigger className="h-10 w-full border-[#1f242f] bg-[#1a1f2e] text-sm text-white md:w-44">
            <SelectValue placeholder="Chain Type" />
          </SelectTrigger>
          <SelectContent className="bg-[#13161b] text-white">
            <SelectItem value="all">All Chains</SelectItem>
            <SelectItem value="NATIVE">Native</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={() => fetchDeposits(0)}
          variant="outline"
          className="h-10 border-[#2563eb]/40 bg-[#1a1f2e] text-sm text-white hover:bg-[#1f2a3d]"
        >
          Apply Filters
        </Button>
      </div>
    </div>
  );

  const tableSection = (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0b0d0e]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px]">
          <thead className="bg-[#0f1218] text-xs uppercase tracking-wide text-muted-foreground">
            <tr className="border-b border-[#1f242f]">
              <th className="h-12 px-4 text-left font-semibold">Asset</th>
              <th className="h-12 px-4 text-left font-semibold">Amount</th>
              <th className="h-12 px-4 text-left font-semibold">Status</th>
              <th className="h-12 px-4 text-left font-semibold">Chain</th>
              <th className="h-12 px-4 text-left font-semibold">Wallet</th>
              <th className="h-12 px-4 text-left font-semibold">Transaction</th>
              <th className="h-12 px-4 text-left font-semibold">Created</th>
            </tr>
          </thead>
          <tbody>
            {deposits.length === 0 ? (
              <tr>
                <td colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                  No deposits found.
                </td>
              </tr>
            ) : (
              deposits.map((deposit) => {
                const statusClasses =
                  STATUS_COLORS[deposit.status] || 'bg-slate-500/10 text-slate-300';
                const chainClasses =
                  CHAIN_COLORS[deposit.chainType] || 'bg-slate-500/10 text-slate-300';
                const decimals = (deposit.metadata as Record<string, unknown> | undefined)
                  ?.decimals;
                const formattedAmount = formatAmount(
                  deposit.amount,
                  typeof decimals === 'number' ? decimals : 6
                );

                return (
                  <tr
                    key={deposit._id}
                    className="border-b border-[#1f242f] last:border-0 transition-colors hover:bg-[#141923]"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-sm font-semibold text-blue-300">
                          {(deposit.tokenSymbol || deposit.contractAddress || '?').charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-white">
                            {deposit.tokenSymbol || 'Token'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {truncateMiddle(deposit.tokenAddress)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-sm text-muted-foreground">
                      {formattedAmount}{' '}
                      <span className="text-xs text-muted-foreground/70">
                        {deposit.tokenSymbol || ''}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusClasses}`}
                      >
                        {deposit.status.toLowerCase()}
                      </span>
                      {deposit.metadata?.error && (
                        <div className="mt-2 text-xs text-red-300">
                          Error: {deposit.metadata.error}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${chainClasses}`}
                      >
                        {deposit.chainType.toLowerCase()}
                      </span>
                      <div className="text-xs text-muted-foreground/70">
                        Chain ID: {deposit.chainId}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-mono text-xs text-muted-foreground">
                        {truncateMiddle(deposit.ethAddress)}
                      </div>
                      <div className="text-[10px] text-muted-foreground/70">
                        {truncateMiddle(deposit.caip10Wallet)}
                      </div>
                    </td>
                    <td className="p-4">
                      {deposit.txHash ? (
                        <div className="font-mono text-xs text-blue-300">
                          {truncateMiddle(deposit.txHash, 4)}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Pending</span>
                      )}
                      <div className="text-[10px] text-muted-foreground/70">
                        Contract: {truncateMiddle(deposit.contractAddress, 4)}
                      </div>
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {formatDate(deposit.createdAt)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const footer = (
    <>
      {pagination.hasMore && deposits.length > 0 && (
        <div className="flex justify-center pt-6">
          <Button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="min-w-[160px] bg-[#1a1f2e] text-white hover:bg-[#1f2a3d]"
          >
            {isLoading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" /> Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}

      <div className="mt-6 text-center text-xs text-muted-foreground">
        Showing {deposits.length} of {pagination.total} deposits
      </div>
    </>
  );

  const body = (
    <>
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {tableSection}
      {footer}
    </>
  );

  if (isLoading && deposits.length === 0) {
    if (variant === 'card') {
      return (
        <Card
          className={cn(
            'w-full rounded-2xl border border-white/5 bg-[#121316] p-6 text-white',
            className
          )}
        >
          {header}
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        </Card>
      );
    }

    return (
      <div className={cn('w-full text-white', className)}>
        {header}
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <Card
        className={cn(
          'w-full rounded-2xl border border-white/5 bg-[#121316] p-6 text-white',
          className
        )}
      >
        {header}
        {body}
      </Card>
    );
  }

  return (
    <div className={cn('w-full text-white', className)}>
      {header}
      {body}
    </div>
  );
};
