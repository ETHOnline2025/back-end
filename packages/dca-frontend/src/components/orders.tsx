import React, { useCallback, useEffect, useState } from 'react';
import { Delete } from 'lucide-react';

import { useBackend, Order } from '@/hooks/useBackend';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Box } from '@/components/ui/box';
import { cn } from '@/lib/utils';

const getChainName = (chainId: number): string => {
  const chainNames: Record<number, string> = {
    1: 'Ethereum',
    84532: 'Base Sepolia',
    11155111: 'Sepolia',
    101: 'Solana',
  };
  return chainNames[chainId] || `Chain ${chainId}`;
};

const getChainTypeColor = (type: 'NATIVE' | 'OTHER'): string => {
  return type === 'NATIVE' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
};

function renderOrdersTable(
  orders: Order[],
  handleCancelOrder: (orderId: string) => Promise<void>
) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'text-yellow-500';
      case 'PARTIALLY_FILLED':
        return 'text-blue-500';
      case 'FILLED':
        return 'text-green-500';
      case 'CANCELED':
        return 'text-gray-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Exchange</TableHead>
          <TableHead>Side</TableHead>
          <TableHead>Rate</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Filled</TableHead>
          <TableHead>Remaining</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Chain</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {orders.map((order) => {
          const active = order.status === 'PENDING' || order.status === 'PARTIALLY_FILLED';
          const fillPercentage = (order.amount || 0) > 0 ? ((order.filledAmount || 0) / (order.amount || 1)) * 100 : 0;
          
          return (
            <TableRow key={order._id}>
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span>{order.symbol}</span>
                  {(order as any).metadata?.sourceAmount && (order as any).metadata?.targetAmount && (
                    <span className="text-xs text-gray-500">
                      {(order as any).metadata.sourceAmount} {(order as any).metadata.sourceToken} → {(order as any).metadata.targetAmount} {(order as any).metadata.targetToken}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge className={order.side === 'BUY' ? 'bg-green-500' : 'bg-red-500'}>
                  {order.side}
                </Badge>
              </TableCell>
              <TableCell className="font-mono">{(order.price || 0).toFixed(6)}</TableCell>
              <TableCell className="font-mono">{(order.amount || 0).toFixed(4)}</TableCell>
              <TableCell className="font-mono">
                <div className="flex flex-col">
                  <span>{(order.filledAmount || 0).toFixed(4)}</span>
                  <span className="text-xs text-gray-500">({fillPercentage.toFixed(1)}%)</span>
                </div>
              </TableCell>
              <TableCell className="font-mono">{(order.remainingAmount || 0).toFixed(4)}</TableCell>
              <TableCell>
                <span className={cn(active && 'text-green-500', !active && getStatusColor(order.status))}>
                  {order.status}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex flex-col space-y-1">
                  <Badge className={getChainTypeColor(order.sourceChainType || 'OTHER')}>
                    {getChainName(order.sourceChainId || 84532)}
                  </Badge>
                  {order.targetChainId && (
                    <Badge className={getChainTypeColor(order.targetChainType || 'OTHER')}>
                      → {getChainName(order.targetChainId)}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {order.isCrossChain && (
                  <Badge className="bg-orange-100 text-orange-800">Cross-chain</Badge>
                )}
              </TableCell>
              <TableCell>
                <Box className="flex flex-row items-center justify-end gap-2 p-1">
                  {active && (
                    <Button variant="destructive" onClick={() => handleCancelOrder(order._id)}>
                      <Delete />
                    </Button>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function renderSpinner() {
  return (
    <div className="flex items-center justify-center">
      <Spinner />
    </div>
  );
}

function renderContent(
  orders: Order[],
  isLoading: boolean,
  handleCancelOrder: (orderId: string) => Promise<void>
) {
  if (isLoading) {
    return renderSpinner();
  } else if (orders.length) {
    return renderOrdersTable(orders, handleCancelOrder);
  } else {
    return <div className="flex justify-center">No orders found</div>;
  }
}

export const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getOrders, cancelOrder } = useBackend();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        const fetchedOrders = await getOrders();
        setOrders(fetchedOrders);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
    
    // Refresh every 5 seconds
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [getOrders]);

  const handleCancelOrder = useCallback(
    async (orderId: string) => {
      try {
        await cancelOrder(orderId);
        setOrders(orders.filter((order) => order._id !== orderId));
      } catch (error) {
        console.error('Error cancelling order:', error);
      }
    },
    [orders, cancelOrder]
  );

  return (
    <Card data-test-id="active-orders" className="w-full bg-white p-6 shadow-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Active Orders</CardTitle>
      </CardHeader>

      <Separator />

      <CardContent>
        {renderContent(orders, isLoading, handleCancelOrder)}
      </CardContent>
    </Card>
  );
};