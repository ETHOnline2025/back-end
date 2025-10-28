import React, { useCallback, useEffect, useState } from 'react';
import { Delete } from 'lucide-react';

import { useBackend } from '@/hooks/useBackend';
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

interface Order {
  _id: string;
  amount: number;
  side: 'BUY' | 'SELL';
  price: number;
  caip10Wallet: string;
  symbol: string;
  remainingAmount: number;
  status: 'PENDING' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED';
  createdAt: string;
}

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
          <TableHead>Token</TableHead>
          <TableHead>Side</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Remaining</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {orders.map((order) => {
          const active = order.status === 'PENDING' || order.status === 'PARTIALLY_FILLED';
          return (
            <TableRow key={order._id}>
              <TableCell className="font-medium">{order.symbol}</TableCell>
              <TableCell>
                <Badge className={order.side === 'BUY' ? 'bg-green-500' : 'bg-red-500'}>
                  {order.side}
                </Badge>
              </TableCell>
              <TableCell>{order.price.toFixed(4)}</TableCell>
              <TableCell>{order.amount.toFixed(4)}</TableCell>
              <TableCell>{order.remainingAmount.toFixed(4)}</TableCell>
              <TableCell>
                <span className={cn(active && 'text-green-500', !active && getStatusColor(order.status))}>
                  {order.status}
                </span>
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