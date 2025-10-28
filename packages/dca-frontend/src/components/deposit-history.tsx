import React, { useState, useEffect } from 'react';
import { useBackend, Deposit } from '@/hooks/useBackend';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Separator } from '@/components/ui/separator';

interface DepositHistoryProps {
  onRefresh?: () => void;
}

export const DepositHistory: React.FC<DepositHistoryProps> = ({ onRefresh }) => {
  const { getDeposits } = useBackend();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [chainTypeFilter, setChainTypeFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 10,
    offset: 0,
    hasMore: false
  });

  const fetchDeposits = async (offset = 0, status?: string, chainType?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const params: any = {
        limit: pagination.limit,
        offset
      };

      if (status && status !== 'all') {
        params.status = status;
      }

      if (chainType && chainType !== 'all') {
        params.chainType = chainType;
      }

      console.log('Fetching deposits with params:', params);
      const response = await getDeposits(params);
      console.log('Deposits response:', response);
      setDeposits(response.deposits);
      setPagination(response.pagination);
    } catch (err: any) {
      console.error('Error fetching deposits:', err);
      setError(err.message || 'Failed to fetch deposits');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeposits(0, statusFilter, chainTypeFilter);
  }, [statusFilter, chainTypeFilter]);

  const handleFilterChange = () => {
    fetchDeposits(0, statusFilter, chainTypeFilter);
  };

  const handleLoadMore = () => {
    if (pagination.hasMore) {
      fetchDeposits(pagination.offset + pagination.limit, statusFilter, chainTypeFilter);
    }
  };

  const formatAmount = (amount: string, decimals = 6) => {
    const num = parseFloat(amount);
    return (num / Math.pow(10, decimals)).toFixed(6);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'default';
      case 'PENDING':
        return 'secondary';
      case 'FAILED':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getChainTypeBadgeVariant = (chainType: string) => {
    switch (chainType) {
      case 'NATIVE':
        return 'default';
      case 'OTHER':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (isLoading && deposits.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Deposit History</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center p-6">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Deposit History</CardTitle>
        <div className="flex gap-4 mt-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={chainTypeFilter} onValueChange={setChainTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Chain Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Chains</SelectItem>
              <SelectItem value="NATIVE">Native</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleFilterChange} variant="outline" size="sm">
            Apply Filters
          </Button>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="p-6">
        {error && (
          <div className="text-red-500 mb-4">{error}</div>
        )}

        {deposits.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No deposits found
          </div>
        ) : (
          <div className="space-y-4">
            {deposits.map((deposit) => (
              <div key={deposit._id} className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">
                      {formatAmount(deposit.amount)} {deposit.tokenSymbol || 'Tokens'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(deposit.createdAt)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={getStatusBadgeVariant(deposit.status)}>
                      {deposit.status}
                    </Badge>
                    <Badge variant={getChainTypeBadgeVariant(deposit.chainType)}>
                      {deposit.chainType}
                    </Badge>
                  </div>
                </div>

                <div className="text-sm text-gray-600 space-y-1">
                  <div>Token: {deposit.tokenAddress}</div>
                  <div>Contract: {deposit.contractAddress}</div>
                  {deposit.txHash && (
                    <div>
                      TX: <span className="font-mono text-xs">{deposit.txHash}</span>
                    </div>
                  )}
                </div>

                {deposit.metadata?.error && (
                  <div className="text-sm text-red-500">
                    Error: {deposit.metadata.error}
                  </div>
                )}
              </div>
            ))}

            {pagination.hasMore && (
              <div className="flex justify-center pt-4">
                <Button 
                  onClick={handleLoadMore} 
                  disabled={isLoading}
                  variant="outline"
                >
                  {isLoading ? <Spinner /> : 'Load More'}
                </Button>
              </div>
            )}

            <div className="text-sm text-gray-500 text-center pt-4">
              Showing {deposits.length} of {pagination.total} deposits
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
