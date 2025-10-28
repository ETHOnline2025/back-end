import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Delete,
  Search,
} from 'lucide-react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table';

import { useBackend, Order } from '@/hooks/useBackend';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const ACTIVE_STATUSES = new Set(['PENDING', 'PARTIALLY_FILLED']);

const getChainName = (chainId: number | undefined): string => {
  if (!chainId && chainId !== 0) return 'Unknown chain';

  const chainNames: Record<number, string> = {
    1: 'Ethereum',
    84532: 'Base Sepolia',
    11155111: 'Sepolia',
    101: 'Solana',
  };

  return chainNames[chainId] || `Chain ${chainId}`;
};

const getStatusColors = (status: Order['status']) => {
  switch (status) {
    case 'PENDING':
      return 'bg-blue-500/10 text-blue-400';
    case 'PARTIALLY_FILLED':
      return 'bg-amber-500/10 text-amber-400';
    case 'FILLED':
      return 'bg-green-500/10 text-green-400';
    case 'CANCELED':
    default:
      return 'bg-red-500/10 text-red-400';
  }
};

const getSideColors = (side: Order['side']) =>
  side === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400';

const getChainBadgeColors = (type: 'NATIVE' | 'OTHER' | undefined) =>
  type === 'NATIVE' ? 'bg-sky-500/10 text-sky-400' : 'bg-purple-500/10 text-purple-400';

function OrdersTable({
  data,
  onCancel,
  emptyMessage,
}: {
  data: Order[];
  onCancel: (orderId: string) => Promise<void>;
  emptyMessage: string;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [symbolFilter, setSymbolFilter] = useState('');
  const [walletFilter, setWalletFilter] = useState('');

  const columns = useMemo<ColumnDef<Order>[]>(() => {
    return [
      {
        accessorKey: 'symbol',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 transition-colors hover:text-foreground"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Market
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => {
          const order = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/10 text-sm font-semibold text-indigo-300">
                {order.symbol?.charAt(0) || '?'}
              </div>
              <div>
                <div className="font-medium text-white">{order.symbol}</div>
                {(order as any).metadata?.sourceAmount &&
                  (order as any).metadata?.targetAmount && (
                    <div className="text-xs text-muted-foreground">
                      {(order as any).metadata.sourceAmount}{' '}
                      {(order as any).metadata.sourceToken} →{' '}
                      {(order as any).metadata.targetAmount}{' '}
                      {(order as any).metadata.targetToken}
                    </div>
                  )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'side',
        header: 'Side',
        cell: ({ row }) => (
          <Badge className={cn('px-2 py-1 text-xs font-semibold', getSideColors(row.original.side))}>
            {row.original.side}
          </Badge>
        ),
      },
      {
        accessorKey: 'price',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 transition-colors hover:text-foreground"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Price
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm text-muted-foreground">
            {(row.original.price ?? 0).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6,
            })}
          </span>
        ),
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => (
          <span className="font-mono text-sm text-muted-foreground">
            {(row.original.amount ?? 0).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6,
            })}
          </span>
        ),
      },
      {
        id: 'filled',
        header: 'Filled',
        cell: ({ row }) => {
          const filled = row.original.filledAmount ?? 0;
          const total = row.original.amount ?? 0;
          const percentage = total > 0 ? (filled / total) * 100 : 0;

          return (
            <div className="flex flex-col font-mono text-sm text-muted-foreground">
              <span>
                {filled.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6,
                })}
              </span>
              <span className="text-xs text-muted-foreground/70">
                ({percentage.toFixed(1)}%)
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'remainingAmount',
        header: 'Remaining',
        cell: ({ row }) => (
          <span className="font-mono text-sm text-muted-foreground">
            {(row.original.remainingAmount ?? 0).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6,
            })}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium capitalize',
              getStatusColors(row.original.status)
            )}
          >
            {row.original.status.toLowerCase()}
          </span>
        ),
      },
      {
        id: 'chains',
        header: 'Chains',
        cell: ({ row }) => (
          <div className="flex flex-col gap-1 text-xs">
            <span
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-2 py-1 font-medium capitalize',
                getChainBadgeColors(row.original.sourceChainType)
              )}
            >
              {getChainName(row.original.sourceChainId)}
            </span>
            {row.original.targetChainId && (
              <span
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-2 py-1 font-medium capitalize',
                  getChainBadgeColors(row.original.targetChainType)
                )}
              >
                → {getChainName(row.original.targetChainId)}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'ethAddress',
        header: 'Wallet',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.ethAddress
              ? `${row.original.ethAddress.slice(0, 6)}...${row.original.ethAddress.slice(-4)}`
              : '—'}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 transition-colors hover:text-foreground"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Created
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.createdAt
              ? new Date(row.original.createdAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const order = row.original;
          const isActive = ACTIVE_STATUSES.has(order.status);

          if (!isActive) {
            return null;
          }

          return (
            <div className="flex justify-end">
              <Button
                size="icon"
                variant="destructive"
                className="h-8 w-8"
                onClick={() => onCancel(order._id)}
              >
                <Delete className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ];
  }, [onCancel]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
  });

  useEffect(() => {
    table.getColumn('symbol')?.setFilterValue(symbolFilter);
  }, [symbolFilter, table]);

  useEffect(() => {
    table.getColumn('ethAddress')?.setFilterValue(walletFilter);
  }, [walletFilter, table]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by market..."
            value={symbolFilter}
            onChange={(event) => setSymbolFilter(event.target.value)}
            className="bg-[#1a1f2e] pl-9 text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by wallet..."
            value={walletFilter}
            onChange={(event) => setWalletFilter(event.target.value)}
            className="bg-[#1a1f2e] pl-9 text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0b0d0e]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead className="bg-[#0f1218]">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-[#1f242f]">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="h-12 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#1f242f] last:border-0 transition-colors hover:bg-[#141923]"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="p-4 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="h-24 text-center text-sm text-muted-foreground"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Showing {table.getRowModel().rows.length} of {data.length} orders
      </div>
    </div>
  );
}

interface OrdersProps {
  variant?: 'card' | 'plain';
  className?: string;
}

export const Orders: React.FC<OrdersProps> = ({ variant = 'card', className }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getOrders, cancelOrder } = useBackend();

  useEffect(() => {
    let isMounted = true;

    const fetchOrders = async () => {
      try {
        if (!isMounted) return;
        setIsLoading(true);
        setError(null);
        const fetchedOrders = await getOrders();
        if (isMounted) {
          setOrders(fetchedOrders);
        }
      } catch (err) {
        console.error('Error fetching orders:', err);
        if (isMounted) {
          setError('Failed to load orders');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [getOrders]);

  const handleCancelOrder = useCallback(
    async (orderId: string) => {
      try {
        await cancelOrder(orderId);
        setOrders((previous) => previous.filter((order) => order._id !== orderId));
      } catch (err) {
        console.error('Error cancelling order:', err);
        setError('Failed to cancel order');
      }
    },
    [cancelOrder]
  );

  const activeOrders = useMemo(
    () => orders.filter((order) => ACTIVE_STATUSES.has(order.status)),
    [orders]
  );
  const historicalOrders = useMemo(
    () => orders.filter((order) => !ACTIVE_STATUSES.has(order.status)),
    [orders]
  );

  const header = (
    <div className="mb-6">
      <h2 className="text-2xl font-bold tracking-tight text-white">Orders</h2>
      <p className="mt-1 text-sm text-white/60">
        Review, filter, and manage your open and historical orders.
      </p>
    </div>
  );

  const content = (
    <>
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="w-full justify-start gap-2 overflow-x-auto border border-[#1f242f] bg-[#1a1f2e]">
            <TabsTrigger
              value="active"
              className="data-[state=active]:bg-[#2563eb]/10 data-[state=active]:text-[#60a5fa]"
            >
              Active Orders ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="data-[state=active]:bg-[#2563eb]/10 data-[state=active]:text-[#60a5fa]"
            >
              Order History ({historicalOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6 text-white">
            <OrdersTable
              data={activeOrders}
              onCancel={handleCancelOrder}
              emptyMessage="No active orders found."
            />
          </TabsContent>
          <TabsContent value="history" className="mt-6 text-white">
            <OrdersTable
              data={historicalOrders}
              onCancel={handleCancelOrder}
              emptyMessage="No historical orders yet."
            />
          </TabsContent>
        </Tabs>
      )}
    </>
  );

  if (variant === 'card') {
    return (
      <Card
        data-test-id="active-orders"
        className={cn(
          'w-full rounded-2xl border border-white/5 bg-[#121316] p-6 text-white',
          className
        )}
      >
        {header}
        {content}
      </Card>
    );
  }

  return (
    <div className={cn('w-full text-white', className)}>
      {header}
      {content}
    </div>
  );
};
