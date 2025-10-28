import React, { useCallback, useEffect, useMemo, useState } from 'react';

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
import { ArrowUpDown, RefreshCcw, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Order, useBackend } from '@/hooks/useBackend';
import { cn } from '@/lib/utils';

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

const getStatusColor = (status: Order['status']) => {
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

const getSideColor = (side: Order['side']) =>
  side === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400';

const getChainColor = (type: 'NATIVE' | 'OTHER' | undefined) =>
  type === 'NATIVE' ? 'bg-sky-500/10 text-sky-400' : 'bg-purple-500/10 text-purple-400';

export const OrderBook: React.FC = () => {
  const { getAllOrders } = useBackend();
  const [orders, setOrders] = useState<Order[]>([]);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [sideFilter, setSideFilter] = useState<'all' | 'BUY' | 'SELL'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getAllOrders();
      setOrders(result || []);
    } catch (err) {
      console.error('Failed to fetch orders', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [getAllOrders]);

  useEffect(() => {
    fetchAllOrders();
  }, [fetchAllOrders]);

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
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/10 text-sm font-semibold text-indigo-300">
              {row.original.symbol?.charAt(0) || '?'}
            </div>
            <div>
              <div className="font-medium text-white">{row.original.symbol || '—'}</div>
              {/* <div className="text-xs text-muted-foreground">
                {row.original.caip10Token ? row.original.caip10Token.split(':').pop() : '—'}
              </div> */}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'side',
        header: 'Side',
        cell: ({ row }) => (
          <Badge className={cn('px-2 py-1 text-xs font-semibold', getSideColor(row.original.side))}>
            {row.original.side}
          </Badge>
        ),
        enableSorting: false,
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
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 transition-colors hover:text-foreground"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Amount
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
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
        accessorKey: 'filledAmount',
        header: 'Filled',
        cell: ({ row }) => (
          <div className="flex flex-col font-mono text-sm text-muted-foreground">
            <span>
              {(row.original.filledAmount ?? 0).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6,
              })}
            </span>
            <span className="text-xs text-muted-foreground/70">
              {(() => {
                const filled = row.original.filledAmount ?? 0;
                const total = row.original.amount ?? 0;
                const percentage = total > 0 ? (filled / total) * 100 : 0;
                return `(${percentage.toFixed(1)}%)`;
              })()}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium capitalize',
              getStatusColor(row.original.status)
            )}
          >
            {row.original.status.toLowerCase()}
          </span>
        ),
        enableSorting: false,
      },
      {
        id: 'chains',
        header: 'Chains',
        cell: ({ row }) => (
          <div className="flex flex-col gap-1 text-xs">
            <span
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-2 py-1 font-medium capitalize',
                getChainColor(row.original.sourceChainType)
              )}
            >
              {getChainName(row.original.sourceChainId)}
            </span>
            {row.original.targetChainId && (
              <span
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-2 py-1 font-medium capitalize',
                  getChainColor(row.original.targetChainType)
                )}
              >
                → {getChainName(row.original.targetChainId)}
              </span>
            )}
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'ethAddress',
        header: 'Owner',
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
    ];
  }, []);

  const table = useReactTable({
    data: orders,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  useEffect(() => {
    table.getColumn('symbol')?.setFilterValue(searchFilter);
  }, [searchFilter, table]);

  useEffect(() => {
    table.getColumn('side')?.setFilterValue(sideFilter === 'all' ? '' : sideFilter);
  }, [sideFilter, table]);

  return (
    <Card className="w-full rounded-2xl border border-white/5 bg-[#121316] p-6 text-white">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Global Order Book</h2>
          <p className="mt-1 text-sm text-white/60">
            Monitor every order across markets and filter by side or owner.
          </p>
        </div>

        <Button
          onClick={fetchAllOrders}
          disabled={loading}
          className="w-full gap-2 bg-[#1a1f2e] text-white hover:bg-[#1f2a3d] md:w-auto"
        >
          {loading ? <Spinner className="h-4 w-4" /> : <RefreshCcw className="h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by market or token..."
            value={searchFilter}
            onChange={(event) => setSearchFilter(event.target.value)}
            className="bg-[#1a1f2e] pl-9 text-sm text-white placeholder:text-muted-foreground"
          />
        </div>

        <Select
          value={sideFilter}
          onValueChange={(value) => setSideFilter(value as 'all' | 'BUY' | 'SELL')}
        >
          <SelectTrigger className="h-10 w-full border-[#1f242f] bg-[#1a1f2e] text-sm text-white md:w-40">
            <SelectValue placeholder="Side" />
          </SelectTrigger>
          <SelectContent className="bg-[#13161b] text-white">
            <SelectItem value="all">All Sides</SelectItem>
            <SelectItem value="BUY">Buy</SelectItem>
            <SelectItem value="SELL">Sell</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0b0d0e]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead className="bg-[#0f1218] text-xs uppercase tracking-wide text-muted-foreground">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-[#1f242f]">
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="h-12 px-4 text-left font-semibold">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="h-32 text-center">
                    <Spinner />
                  </td>
                </tr>
              ) : table.getRowModel().rows.length > 0 ? (
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
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 text-sm text-muted-foreground">
        Showing {table.getRowModel().rows.length} of {orders.length} orders
      </div>
    </Card>
  );
};
