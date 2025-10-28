import React, { useState } from 'react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Wallet } from '@/components/wallet';
import { Info } from '@/components/info';
import { CreateOrder } from '@/components/create-order';
import { Orders } from '@/components/orders';
import { Deposit } from '@/components/deposit';
import { DepositHistory } from '@/components/deposit-history';
import { OrderBook } from '@/components/order-book';

enum Tab {
  Deposit = 'deposit',
  DepositHistory = 'deposit-history',
  Trading = 'trading',
  Orders = 'orders',
  OrderBook = 'orderbook',
  Wallet = 'wallet',
}

export const Trading: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Trading);

  return (
    <div
      className={'flex flex-col items-center justify-center min-h-screen min-w-screen bg-gray-100'}
    >
      <Tabs
        data-testId="trading-tabs"
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as Tab)}
        className="bg-white p-6 shadow-sm w-full xl:max-w-4xl h-full"
      >
            <TabsList className="mb-4 flex space-x-2 rounded-md bg-gray-200 p-2 w-full">
              <TabsTrigger value={Tab.Deposit}>Deposit</TabsTrigger>
              <TabsTrigger value={Tab.DepositHistory}>Deposit History</TabsTrigger>
              <TabsTrigger value={Tab.Trading}>Exchange</TabsTrigger>
              <TabsTrigger value={Tab.Orders}>Orders</TabsTrigger>
              <TabsTrigger value={Tab.OrderBook}>Order Book</TabsTrigger>
              <TabsTrigger value={Tab.Wallet}>Wallet</TabsTrigger>
            </TabsList>

        <TabsContent value={Tab.Deposit}>
          <Deposit onDeposit={() => setActiveTab(Tab.DepositHistory)} />
        </TabsContent>

        <TabsContent value={Tab.DepositHistory}>
          <DepositHistory onRefresh={() => setActiveTab(Tab.DepositHistory)} />
        </TabsContent>

        <TabsContent value={Tab.Trading}>
          <CreateOrder onCreate={() => setActiveTab(Tab.Orders)} />
        </TabsContent>

        <TabsContent value={Tab.Orders}>
          <Orders />
        </TabsContent>

              <TabsContent value={Tab.OrderBook}>
                <OrderBook />
              </TabsContent>

        <TabsContent value={Tab.Wallet}>
          <Wallet />
        </TabsContent>
      </Tabs>

      <Info />
    </div>
  );
};
