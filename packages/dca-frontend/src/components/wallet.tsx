import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { ethers } from 'ethers';
import { Check, Copy, LogOut, RefreshCcw, WalletIcon } from 'lucide-react';

import { useJwtContext } from '@lit-protocol/vincent-app-sdk/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { env } from '@/config/env';
import { useChain } from '@/hooks/useChain';
import { cn } from '@/lib/utils';

const { VITE_APP_ID } = env;

const formatAddress = (address: string | undefined) => {
  if (!address) return '—';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const formatBalance = (value: string, maximumFractionDigits: number) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return '0';
  return numeric.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
};

interface WalletProps {
  className?: string;
}

export const Wallet: React.FC<WalletProps> = ({ className }) => {
  const { chain, provider, usdcContract, eurcContract } = useChain();
  const [ethBalance, setEthBalance] = useState<string>('0');
  const [usdcBalance, setUsdcBalance] = useState<string>('0');
  const [eurcBalance, setEurcBalance] = useState<string>('0');
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const { authInfo, logOut } = useJwtContext();

  const pkpAddress = authInfo?.pkp.ethAddress;

  const fetchPkpBalance = useCallback(async () => {
    if (!pkpAddress) return;

    try {
      setIsLoadingBalance(true);
      setError(null);

      const [ethBalanceWei, usdcBalanceRaw, eurcBalanceRaw] = await Promise.all([
        provider.getBalance(pkpAddress),
        usdcContract.balanceOf(pkpAddress),
        eurcContract.balanceOf(pkpAddress),
      ]);

      console.log('Raw balances:');
      console.log('ETH:', ethBalanceWei.toString());
      console.log('USDC:', usdcBalance.toString());
      console.log('EURC:', eurcBalance.toString());

      setEthBalance(ethers.utils.formatUnits(ethBalanceWei, 18));
      setUsdcBalance(ethers.utils.formatUnits(usdcBalanceRaw, 6));
      setEurcBalance(ethers.utils.formatUnits(eurcBalanceRaw, 8));
    } catch (err) {
      console.error('Error fetching PKP balances:', err);
      setError('Failed to fetch wallet balance');
    } finally {
      setIsLoadingBalance(false);
    }
  }, [pkpAddress, provider, usdcContract, eurcContract]);

  useEffect(() => {
    queueMicrotask(() => fetchPkpBalance());
  }, [fetchPkpBalance]);

  const copyAddress = useCallback(async () => {
    if (!pkpAddress) return;
    try {
      await navigator.clipboard.writeText(pkpAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy address to clipboard', err);
    }
  }, [pkpAddress]);

  const balances = useMemo(
    () => [
      {
        label: `${chain.symbol} Balance`,
        value: isLoadingBalance ? 'Loading…' : `${formatBalance(ethBalance, 8)} ${chain.symbol}`,
        accent: 'bg-emerald-500/10 text-emerald-300',
      },
      {
        label: 'USDC Balance',
        value: isLoadingBalance ? 'Loading…' : `${formatBalance(usdcBalance, 6)} USDC`,
        accent: 'bg-cyan-500/10 text-cyan-300',
      },
      {
        label: 'eurc Balance',
        value: isLoadingBalance ? 'Loading…' : `${formatBalance(eurcBalance, 8)} eurc`,
        accent: 'bg-orange-500/10 text-orange-300',
      },
    ],
    [chain.symbol, ethBalance, isLoadingBalance, usdcBalance, eurcBalance]
  );

  return (
    <Card
      className={cn(
        'w-full rounded-2xl border border-white/5 bg-[#121316] p-6 text-white',
        className
      )}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Wallet</h2>
            <p className="mt-1 text-sm text-white/60">
              Manage your PKP account, view balances, and access quick actions.
            </p>
          </div>
          <Badge className="bg-[#1a1f2e] px-3 py-1 text-sm text-white">Network: {chain.name}</Badge>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0b0d0e] p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-300">
                <WalletIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">PKP Address</p>
                <p className="font-mono text-sm text-white">{formatAddress(pkpAddress)}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={copyAddress}
                disabled={!pkpAddress}
                className="border-[#2563eb]/40 bg-[#1a1f2e] text-white hover:bg-[#1f2a3d]"
              >
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? 'Copied' : 'Copy Address'}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {balances.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-white/10 bg-[#0f1218] px-5 py-4"
            >
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-white">
                {item.value}
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.accent}`}>
                  Live
                </span>
              </p>
            </div>
          ))}
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
          <Button
            className={cn(
              'w-full gap-2 bg-[#2563eb] text-white hover:bg-[#1d4ed8]',
              'md:flex-1 md:w-auto'
            )}
            disabled={isLoadingBalance}
            onClick={fetchPkpBalance}
          >
            {isLoadingBalance ? (
              <>
                <Spinner className="h-4 w-4" /> Refreshing...
              </>
            ) : (
              <>
                <RefreshCcw className="h-4 w-4" /> Refresh Balance
              </>
            )}
          </Button>
          <Button
            className={cn(
              'w-full gap-2 bg-[#1a1f2e] text-white hover:bg-[#1f2a3d]',
              'md:flex-1 md:w-auto'
            )}
            onClick={() =>
              window.open(
                `https://dashboard.heyvincent.ai/user/appId/${VITE_APP_ID}/wallet`,
                '_blank'
              )
            }
          >
            <WalletIcon className="h-4 w-4" /> Withdraw with WalletConnect
          </Button>
          <Button
            className={cn('w-full gap-2 md:flex-1 md:w-auto')}
            variant="destructive"
            onClick={logOut}
          >
            <LogOut className="h-4 w-4" /> Log Out
          </Button>
        </div>
      </div>
    </Card>
  );
};
