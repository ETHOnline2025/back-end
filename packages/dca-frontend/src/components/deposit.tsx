import React, { useState, useEffect } from 'react';
import { useJwtContext } from '@lit-protocol/vincent-app-sdk/react';
import { ethers } from 'ethers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';

interface DepositProps {
  onDeposit?: () => void;
}

export const Deposit: React.FC<DepositProps> = ({ onDeposit }) => {
  const { authInfo } = useJwtContext();
  const [amount, setAmount] = useState<string>('');
  const [symbol, setSymbol] = useState<string>('USDC');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);

  // Token configuration for Base Sepolia
  const tokenConfig: Record<string, { address: string; decimals: number }> = {
    'USDC': { address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', decimals: 6 }, // Base Sepolia USDC
    'UNI': { address: '0x1f9840a85d5af5bf1d1762fcd6407d85fd2df3ef', decimals: 18 },
    'WETH': { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
  };

  // Fetch balance when symbol or authInfo changes
  useEffect(() => {
    const fetchBalance = async () => {
      if (!authInfo?.pkp.ethAddress || !symbol) {
        setBalance(null);
        return;
      }

      try {
        const tokenInfo = tokenConfig[symbol];
        const provider = new ethers.providers.JsonRpcProvider('https://sepolia.base.org');
        const erc20ABI = ['function balanceOf(address owner) view returns (uint256)'];
        const tokenContract = new ethers.Contract(tokenInfo.address, erc20ABI, provider);
        
        const balance = await tokenContract.balanceOf(authInfo.pkp.ethAddress);
        const parsedBalance = ethers.utils.formatUnits(balance, tokenInfo.decimals);
        setBalance(parseFloat(parsedBalance).toFixed(6));
      } catch (error) {
        console.error('Error fetching balance:', error);
        setBalance('0');
      }
    };

    fetchBalance();
  }, [symbol, authInfo?.pkp.ethAddress]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!authInfo?.pkp.ethAddress) {
        throw new Error('Please connect your wallet first');
      }

      const ethAddress = authInfo.pkp.ethAddress;
      const tokenInfo = tokenConfig[symbol] || tokenConfig['USDC'];

      const depositAmount = parseFloat(amount);
      if (isNaN(depositAmount) || depositAmount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      // Convert to token's smallest unit
      const amountInSmallestUnit = Math.floor(depositAmount * Math.pow(10, tokenInfo.decimals));

      // Call the backend deposit endpoint to approve tokens
      const response = await fetch('http://localhost:3000/trading/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authInfo.jwt}`,
        },
        body: JSON.stringify({
          tokenAddress: tokenInfo.address,
          amount: amountInSmallestUnit,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to deposit');
      }

      const result = await response.json();
      console.log('Deposit successful:', result);

      setSuccess(true);
      if (onDeposit) onDeposit();
      
      // Refresh balance
      try {
        const provider = new ethers.providers.JsonRpcProvider('https://sepolia.base.org');
        const erc20ABI = ['function balanceOf(address owner) view returns (uint256)'];
        const tokenContract = new ethers.Contract(tokenInfo.address, erc20ABI, provider);
        const balance = await tokenContract.balanceOf(ethAddress);
        const parsedBalance = ethers.utils.formatUnits(balance, tokenInfo.decimals);
        setBalance(parseFloat(parsedBalance).toFixed(6));
      } catch (error) {
        console.error('Error refreshing balance:', error);
      }
      
      // Reset form
      setAmount('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error depositing:', err);
      setError(err.message || 'Failed to deposit tokens');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Deposit Tokens</CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="space-y-4 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="symbol">Token</Label>
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger>
                <SelectValue placeholder="Select token" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USDC">USDC</SelectItem>
                <SelectItem value="UNI">UNI</SelectItem>
                <SelectItem value="WETH">WETH</SelectItem>
              </SelectContent>
            </Select>
            {balance !== null && (
              <div className="text-sm text-gray-500">
                Balance: {balance} {symbol}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.000001"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="text-sm text-red-500">{error}</div>
          )}

          {success && (
            <div className="text-sm text-green-500">
              Deposit successful! You can now create orders.
            </div>
          )}

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? <Spinner /> : 'Deposit'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

