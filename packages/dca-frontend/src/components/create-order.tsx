import React, { useState } from 'react';
import { useJwtContext } from '@lit-protocol/vincent-app-sdk/react';
import { useBackend } from '@/hooks/useBackend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

interface CreateOrderProps {
  onCreate?: () => void;
}

export const CreateOrder: React.FC<CreateOrderProps> = ({ onCreate }) => {
  const { authInfo } = useJwtContext();
  const { createOrder } = useBackend();
  const [amount, setAmount] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [symbol, setSymbol] = useState<string>('UNI/USDC');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    if (!authInfo?.pkp.ethAddress) {
      setError('Not authenticated');
      setIsLoading(false);
      return;
    }

    try {
      const ethAddress = authInfo.pkp.ethAddress;
      const caip10Wallet = `eip155:84532:${ethAddress}`;
      
      // Construct CAIP10 token from symbol
      const tokenAddresses: Record<string, string> = {
        'UNI/USDC': '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // USDC on Base Sepolia
        'WETH/USDC': '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
        'DAI/USDC': '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      };
      const tokenAddress = tokenAddresses[symbol] || '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
      const caip10Token = `eip155:84532/erc20:${tokenAddress}`;

      const orderData = {
        amount: parseFloat(amount),
        side,
        price: parseFloat(price),
        caip10Token,
        caip10Wallet,
        symbol,
        metadata: {
          createdAt: new Date().toISOString(),
        },
      };

      const result = await createOrder(orderData);
      console.log('Order created:', result);
      setSuccess(true);
      if (onCreate) onCreate();
      
      // Reset form
      setAmount('');
      setPrice('');
    } catch (err: any) {
      setError(err.message || 'Failed to create order');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Create New Order</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="side">Order Side</Label>
          <Select value={side} onValueChange={(value: 'BUY' | 'SELL') => setSide(value)}>
            <SelectTrigger id="side">
              <SelectValue placeholder="Select side" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BUY">Buy</SelectItem>
              <SelectItem value="SELL">Sell</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="symbol">Trading Pair</Label>
          <Select value={symbol} onValueChange={setSymbol}>
            <SelectTrigger id="symbol">
              <SelectValue placeholder="Select pair" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UNI/USDC">UNI/USDC</SelectItem>
              <SelectItem value="WETH/USDC">WETH/USDC</SelectItem>
              <SelectItem value="DAI/USDC">DAI/USDC</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            required
          />
        </div>

        <div>
          <Label htmlFor="price">Price (USDC)</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Enter price"
            required
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm p-3 bg-red-50 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="text-green-600 text-sm p-3 bg-green-50 rounded">
            Order created successfully!
          </div>
        )}

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Creating Order...' : 'Create Order'}
        </Button>
      </form>
    </Card>
  );
};
