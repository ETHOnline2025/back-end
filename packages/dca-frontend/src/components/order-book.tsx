import React, { useState, useEffect } from 'react';
import { useBackend, Order } from '@/hooks/useBackend';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const getChainName = (chainId: number): string => {
  const chainNames: Record<number, string> = {
    1: 'Ethereum',
    84532: 'Base Sepolia',
    11155111: 'Sepolia',
    101: 'Solana',
  };
  return chainNames[chainId] || `Chain ${chainId}`;
};

const getChainTypeColor = (chainType: 'NATIVE' | 'OTHER'): string => {
  return chainType === 'NATIVE' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
};

export const OrderBook: React.FC = () => {
  const { getAllOrders } = useBackend();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAllOrders();
      setAllOrders(result || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllOrders();
  }, []);

  const formatPrice = (price: number) => {
    return price.toFixed(6);
  };

  const formatAmount = (amount: number) => {
    return amount.toFixed(4);
  };

  const formatTotal = (total: number) => {
    return total.toFixed(2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>All Orders</CardTitle>
        <Button onClick={fetchAllOrders} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-red-600 text-sm p-3 bg-red-50 rounded mb-4">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="text-gray-500">Loading orders...</div>
          </div>
        )}

        {!loading && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Total Orders: {allOrders.length}
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Chain</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allOrders.map((order: Order) => (
                  <TableRow key={order._id}>
                    <TableCell className="font-medium">{order.symbol}</TableCell>
                    <TableCell>
                      <Badge className={order.side === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {order.side}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">{formatPrice(order.price)}</TableCell>
                    <TableCell className="font-mono">{formatAmount(order.amount)}</TableCell>
                    <TableCell>
                      <Badge className={
                        order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'PARTIALLY_FILLED' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'FILLED' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {order.status}
                      </Badge>
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
                    <TableCell className="text-xs text-gray-500">{formatDate(order.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {allOrders.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-500">No orders found</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};