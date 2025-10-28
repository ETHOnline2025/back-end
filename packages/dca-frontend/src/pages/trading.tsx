import React, { useState } from 'react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Wallet } from '@/components/wallet';
import { Info } from '@/components/info';

enum Tab {
  Trading = 'trading',
  Orders = 'orders',
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
          <TabsTrigger value={Tab.Trading}>Swap</TabsTrigger>
          <TabsTrigger value={Tab.Orders}>Orders</TabsTrigger>
          <TabsTrigger value={Tab.Wallet}>Wallet</TabsTrigger>
        </TabsList>

        <TabsContent value={Tab.Trading}>
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Trading Interface</h2>
              <p className="text-gray-600">Order book and swap interface coming soon...</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value={Tab.Orders}>
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Orders</h2>
              <p className="text-gray-600">Order history and management coming soon...</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value={Tab.Wallet}>
          <Wallet />
        </TabsContent>
      </Tabs>

      <Info />
    </div>
  );
};
