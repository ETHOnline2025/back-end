'use client';

import { cn } from '@/lib/utils';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { customScrollbar } from '../lib/scrollbar';

interface Order {
  price: number;
  amount: number;
  total: number;
}

export function OrderBook() {
  const [asks, setAsks] = useState<Order[]>([]);
  const [bids, setBids] = useState<Order[]>([]);
  const [currentPrice, setCurrentPrice] = useState(3120.4);
  const [priceChange, setPriceChange] = useState(2.4);

  useEffect(() => {
    const generateOrders = (basePrice: number, count: number, isAsk: boolean): Order[] => {
      const orders: Order[] = [];
      for (let i = 0; i < count; i++) {
        const priceOffset = isAsk ? i * 0.1 : -i * 0.1;
        const price = basePrice + priceOffset;
        const amount = Math.random() * 10;
        const total = price * amount;
        orders.push({ price, amount, total });
      }
      return isAsk ? orders.reverse() : orders;
    };

    setAsks(generateOrders(currentPrice, 12, true));
    setBids(generateOrders(currentPrice, 12, false));

    const interval = setInterval(() => {
      setAsks(generateOrders(currentPrice, 12, true));
      setBids(generateOrders(currentPrice, 12, false));
      setCurrentPrice((prev) => prev + (Math.random() - 0.5) * 0.5);
      setPriceChange((Math.random() - 0.5) * 5);
    }, 2000);

    return () => clearInterval(interval);
  }, [currentPrice]);

  const maxTotal = Math.max(...asks.map((o) => o.total), ...bids.map((o) => o.total));

  const OrderRow = ({ order, type }: { order: Order; type: 'ask' | 'bid' }) => {
    const percentage = (order.total / maxTotal) * 100;
    const bgColor = type === 'ask' ? 'bg-red-500/10' : 'bg-green-500/10';

    return (
      <div className="relative h-7 cursor-pointer transition-colors hover:bg-white/5">
        <div
          className={`absolute left-0 top-0 h-full ${bgColor} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />

        {/* Order data */}
        <div className="relative flex h-full items-center justify-between px-4 font-mono text-sm">
          <span className={type === 'ask' ? 'text-red-400' : 'text-green-400'}>
            {order.price.toFixed(1)}
          </span>
          <span className="text-gray-400">{order.amount.toFixed(8)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex  lg:max-h-[620px] flex-col max-h-5/6 rounded-xl bg-[#13161b] border-white/5 border">
      <div className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between font-mono text-xs text-gray-400">
          <span>Price (APE)</span>
          <span>Amount (WETH)</span>
        </div>
      </div>

      {/* Asks (Sell Orders) */}
      <div className={cn('flex-1 overflow-y-auto px-2 py-6', customScrollbar)}>
        {asks.map((order, i) => (
          <OrderRow key={`ask-${i}`} order={order} type="ask" />
        ))}
      </div>

      <div className="border-y border-gray-800 bg-[#13161b] px-6 py-4 ">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-3xl font-bold text-white">
              {currentPrice.toFixed(1)}
            </span>
            <span className="text-sm text-gray-400">APE</span>
            {priceChange >= 0 ? (
              <TrendingUp className="h-5 w-5 text-green-400" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-400" />
            )}
          </div>
          <span
            className={`rounded-md px-3 py-1 font-mono text-sm font-medium ${
              priceChange >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
            }`}
          >
            {priceChange >= 0 ? '+' : ''}
            {priceChange.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Bids (Buy Orders) */}
      <div className={cn('flex-1 overflow-y-auto px-2 py-6', customScrollbar)}>
        {bids.map((order, i) => (
          <OrderRow key={`bid-${i}`} order={order} type="bid" />
        ))}
      </div>
    </div>
  );
}
