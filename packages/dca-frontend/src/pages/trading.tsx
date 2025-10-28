import React, { useCallback, useMemo, useRef, useState } from 'react';

import { ChainAvatar } from '@/components/chain-avatar';
import { CreateOrder } from '@/components/create-order';
import { Deposit } from '@/components/deposit';
import { DepositHistory } from '@/components/deposit-history';
import {
  SwapErrorContent,
  SwapSendingContent,
  SwapSuccessContent,
  TransferErrorContent,
  TransferPendingContent,
  TransferSuccessContent,
} from '@/components/dynamic-island-content';
import { OrderBook } from '@/components/order-book-2';
import { Orders } from '@/components/orders';
import DynamicIsland from '@/components/smoothui/ui/DynamicIsland';
import { Card } from '@/components/ui/card';
import { FloatingDock } from '@/components/ui/floating-dock';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet } from '@/components/wallet';
import { ArrowDownToLine, ArrowUpToLine, Search, ShieldCheck, Wallet2 } from 'lucide-react';

type ActivityStatus = 'pending' | 'success' | 'error';

const formatHash = (hash?: string) =>
  hash ? `${hash.slice(0, 6)}...${hash.slice(-4)}` : undefined;

type IslandEvent =
  | { kind: 'idle' }
  | {
      kind: 'swap';
      status: ActivityStatus;
      amount: string;
      fromToken: string;
      toToken: string;
      message?: string;
    }
  | {
      kind: 'deposit';
      status: ActivityStatus;
      action: 'approval' | 'deposit';
      amount: string;
      symbol: string;
      chainLabel: string;
      message?: string;
      hash?: string;
    }
  | {
      kind: 'withdraw';
      status: ActivityStatus;
      amount: string;
      symbol: string;
      chainLabel: string;
      message?: string;
      hash?: string;
    };

const ISLAND_RESET_DELAY = 3500;

const getIslandView = (event: IslandEvent): 'idle' | 'ring' | 'timer' | 'notification' => {
  if (event.kind === 'idle') return 'idle';
  if (event.status === 'pending') return 'ring';
  if (event.status === 'success') return 'timer';
  return 'notification';
};

export const Trading: React.FC = () => {
  const [islandEvent, setIslandEvent] = useState<IslandEvent>({ kind: 'idle' });

  const islandIdleContent = (
    <div className="flex items-center gap-3 px-5 py-3 text-white">
      {/* <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
        <Wallet2 className="h-4 w-4" />
      </div> */}
      {/* <div>
        <p className="text-xs font-medium uppercase tracking-wider text-white/60">
          Wallet balance
        </p>
        <p className="text-lg font-semibold">{formattedBalance}</p>
      </div> */}
      <div className="ml-auto flex items-center gap-2">
        <Deposit
          trigger={
            <button className="flex h-8 items-center justify-center rounded-full bg-white/10 px-3 gap-2 hover:bg-white/20 transition-colors">
              <ArrowUpToLine className="h-4 w-4" />
              <span className="text-sm font-medium">Deposit</span>
            </button>
          }
        />
      </div>
    </div>
  );

  const islandResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showIslandEvent = useCallback((event: IslandEvent) => {
    if (islandResetTimeoutRef.current) {
      clearTimeout(islandResetTimeoutRef.current);
      islandResetTimeoutRef.current = null;
    }
    setIslandEvent(event);
    if (event.kind !== 'idle' && event.status !== 'pending') {
      islandResetTimeoutRef.current = setTimeout(() => {
        setIslandEvent({ kind: 'idle' });
        islandResetTimeoutRef.current = null;
      }, ISLAND_RESET_DELAY);
    }
  }, []);

  const islandRingContent = useMemo(() => {
    if (islandEvent.kind === 'swap' && islandEvent.status === 'pending') {
      return (
        <SwapSendingContent
          from={islandEvent.fromToken}
          to={islandEvent.toToken}
          amount={islandEvent.amount}
        />
      );
    }
    if (islandEvent.kind === 'deposit' && islandEvent.status === 'pending') {
      const title = islandEvent.action === 'approval' ? 'Approval pending' : 'Depositing';
      return (
        <TransferPendingContent
          title={title}
          subtitle={
            islandEvent.message ??
            `${islandEvent.amount} ${islandEvent.symbol} • ${islandEvent.chainLabel}`
          }
          icon={
            islandEvent.action === 'approval' ? (
              <ShieldCheck className="h-4 w-4 text-indigo-200" />
            ) : (
              <ArrowUpToLine className="h-4 w-4 text-blue-200" />
            )
          }
          iconBgClass={islandEvent.action === 'approval' ? 'bg-indigo-500/20' : 'bg-blue-500/20'}
        />
      );
    }
    if (islandEvent.kind === 'withdraw' && islandEvent.status === 'pending') {
      return (
        <TransferPendingContent
          title="Withdrawal pending"
          subtitle={
            islandEvent.message ??
            `${islandEvent.amount} ${islandEvent.symbol} • ${islandEvent.chainLabel}`
          }
          icon={<ArrowDownToLine className="h-4 w-4 text-amber-200" />}
          iconBgClass="bg-amber-500/20"
        />
      );
    }
    return null;
  }, [islandEvent]);

  const islandTimerContent = useMemo(() => {
    if (islandEvent.kind === 'swap' && islandEvent.status === 'success') {
      return (
        <SwapSuccessContent
          from={islandEvent.fromToken}
          to={islandEvent.toToken}
          amount={islandEvent.amount}
          onDismiss={resetIsland}
        />
      );
    }
    if (islandEvent.kind === 'deposit' && islandEvent.status === 'success') {
      const title = islandEvent.action === 'approval' ? 'Approval completed' : 'Deposit confirmed';
      const subtitle =
        islandEvent.message ??
        `${islandEvent.amount} ${islandEvent.symbol} • ${islandEvent.chainLabel}`;
      return (
        <TransferSuccessContent
          title={title}
          subtitle={subtitle}
          hash={formatHash(islandEvent.hash)}
        />
      );
    }
    if (islandEvent.kind === 'withdraw' && islandEvent.status === 'success') {
      const subtitle =
        islandEvent.message ??
        `${islandEvent.amount} ${islandEvent.symbol} • ${islandEvent.chainLabel}`;
      return (
        <TransferSuccessContent
          title="Withdrawal confirmed"
          subtitle={subtitle}
          hash={formatHash(islandEvent.hash)}
        />
      );
    }
    return null;
  }, [islandEvent]);

  const islandNotificationContent = useMemo(() => {
    if (islandEvent.kind === 'swap' && islandEvent.status === 'error') {
      return (
        <SwapErrorContent
          onRetry={() => {}}
          message={islandEvent.message ?? 'Please review your gas limit and try again.'}
        />
      );
    }
    if (islandEvent.kind === 'deposit' && islandEvent.status === 'error') {
      const title = islandEvent.action === 'approval' ? 'Approval failed' : 'Deposit failed';
      const subtitle = islandEvent.message ?? 'Please review the transaction and try again.';
      return <TransferErrorContent title={title} subtitle={subtitle} />;
    }
    if (islandEvent.kind === 'withdraw' && islandEvent.status === 'error') {
      const subtitle = islandEvent.message ?? 'Please review the transaction and try again.';
      return <TransferErrorContent title="Withdrawal failed" subtitle={subtitle} />;
    }
    return null;
  }, [islandEvent]);

  const resetIsland = useCallback(() => {
    showIslandEvent({ kind: 'idle' });
  }, [showIslandEvent]);

  return (
    <div className={'relative min-h-screen bg-[#060910] text-white'}>
      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col  px-6 pb-32 pt-12 md:pt-0 md:-mt-8  ">
        <section className="flex justify-center">
          <DynamicIsland
            className="w-full max-w-lg"
            view={getIslandView(islandEvent)}
            idleContent={islandIdleContent}
            ringContent={islandRingContent}
            timerContent={islandTimerContent}
            notificationContent={islandNotificationContent}
          />
        </section>

        <section className="grid gap-6 -mt-4 lg:grid-cols-[1.6fr_1fr]">
          <OrderBook />
          {/* <SwapPanel
            fromToken={fromToken}
            toToken={toToken}
            amount={amount}
            toAmount={quotedAmount}
            onAmountChange={setAmount}
            onSwap={handleSwap}
            onSelectToken={(side) => setTokenModal(side)}
            onSwitchTokens={() => {
              setFromToken(toToken);
              setToToken(fromToken);
            }}
            summary={swapSummary}
          /> */}
          <div className="space-y-6">
            <CreateOrder />
          </div>
          <Wallet className="lg:col-span-2" />
        </section>

        <section className="mt-6">
          <Card className="rounded-2xl border border-white/5 bg-[#121316] p-6 text-white">
            <Tabs defaultValue="orders" className="space-y-6">
              <TabsList className="w-full justify-start gap-2 border border-white/10 bg-[#1a1f2e]">
                <TabsTrigger
                  value="orders"
                  className="data-[state=active]:bg-[#2563eb]/10 text-white data-[state=active]:text-[#60a5fa]"
                >
                  Orders
                </TabsTrigger>
                <TabsTrigger
                  value="deposits"
                  className="data-[state=active]:bg-[#2563eb]/10 text-white data-[state=active]:text-[#60a5fa]"
                >
                  Deposit History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="orders" className="text-white">
                <Orders variant="plain" />
              </TabsContent>
              <TabsContent value="deposits" className="text-white">
                <DepositHistory variant="plain" />
              </TabsContent>
            </Tabs>
          </Card>
        </section>

        {/* <section className="mt-8 ">
          <Tabs
            data-testId="dca-tabs"
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as Tab)}
            className="bg-white p-6 shadow-sm w-full xl:max-w-4xl h-full"
          >
            <TabsList className="mb-4 flex space-x-2 rounded-md bg-gray-200 p-2 w-full">
              <TabsTrigger value={Tab.CreateDCA}>Create DCA</TabsTrigger>
              <TabsTrigger value={Tab.ActiveDCAs}>Active DCAs</TabsTrigger>
              <TabsTrigger value={Tab.Wallet}>Wallet</TabsTrigger>
            </TabsList>

            <TabsContent value={Tab.CreateDCA}>
              <CreateDCA onCreate={() => setActiveTab(Tab.ActiveDCAs)} />
            </TabsContent>
            <TabsContent value={Tab.ActiveDCAs}>
              <ActiveDcas />
            </TabsContent>
            <TabsContent value={Tab.Wallet}>
              <Wallet />
            </TabsContent>
          </Tabs>
        </section> */}
      </main>
      console.log('rendering floating dock');
      <FloatingDock
        desktopClassName="fixed bottom-8 left-1/2 z-40 -translate-x-1/2 border border-white/10 bg-black/60 backdrop-blur"
        items={[
          {
            title: 'Portfolio',
            icon: <Wallet2 className="h-5 w-5 text-white" />,
            onClick: () => {},
          },
          {
            title: 'Token search',
            icon: <Search className="h-5 w-5 text-white" />,
            onClick: () => {},
          },
          {
            title: 'Chains',
            icon: (
              // selectedChainOption?.chainIcon ? (
              //   <Image
              //     src={`/${selectedChainOption.chainIcon}.svg`}
              //     alt={selectedChainOption.name}
              //     width={20}
              //     height={20}
              //     className="h-5 w-5"
              //   />
              // ) : (
              <ChainAvatar chain={'base'} className="h-full w-full text-[0.6rem]" />
            ),
            // ),
            onClick: () => {},
          },
          {
            title: 'Withdraw',
            icon: <ArrowDownToLine className="h-5 w-5 text-white" />,
            // onClick: () => withdrawOpenRef.current?.(),
          },
        ]}
      />
    </div>
  );
};
