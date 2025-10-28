import React, { useState, useEffect } from 'react';
import { useJwtContext } from '@lit-protocol/vincent-app-sdk/react';
import { useBackend } from '@/hooks/useBackend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ethers } from 'ethers';

interface CreateOrderProps {
  onCreate?: () => void;
}

export const CreateOrder: React.FC<CreateOrderProps> = ({ onCreate }) => {
  const { authInfo } = useJwtContext();
  const { createOrder } = useBackend();
  
  // Source (what user wants to exchange)
  const [sourceAmount, setSourceAmount] = useState<string>('');
  const [sourceToken, setSourceToken] = useState<string>('USDC');
  const [sourceChain, setSourceChain] = useState<string>('84532'); // Base Sepolia
  
  // Target (what user wants to receive)
  const [targetAmount, setTargetAmount] = useState<string>('');
  const [targetToken, setTargetToken] = useState<string>('ETH');
  const [targetChain, setTargetChain] = useState<string>('101'); // Solana
  
  // Balance states
  const [sourceBalance, setSourceBalance] = useState<number>(0);
  const [targetBalance, setTargetBalance] = useState<number>(0);
  const [balancesLoading, setBalancesLoading] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Token configuration for different networks
  const getTokenConfig = (chainId: string) => {
    const configs: Record<string, Record<string, { address: string; decimals: number }>> = {
      '84532': { // Base Sepolia
        'USDC': { address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', decimals: 6 },
        'UNI': { address: '0x1f9840a85d5af5bf1d1762fcd6407d85fd2df3ef', decimals: 18 },
        'WETH': { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
        'DAI': { address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18 },
      },
      '11155111': { // Sepolia
        'USDC': { address: '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238', decimals: 6 }, // Sepolia USDC
        'UNI': { address: '0x1f9840a85d5af5bf1d1762fcd6407d85fd2df3ef', decimals: 18 },
        'WETH': { address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', decimals: 18 },
        'DAI': { address: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357', decimals: 18 },
      },
      '1': { // Ethereum Mainnet
        'USDC': { address: '0xA0b86a33E6441b8C4C8C0E4A8c5A8F1A8c5A8F1A', decimals: 6 },
        'UNI': { address: '0x1f9840a85d5af5bf1d1762fcd6407d85fd2df3ef', decimals: 18 },
        'WETH': { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
        'DAI': { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
      }
    };
    return configs[chainId] || configs['84532']; // Default to Base Sepolia
  };

  const calculateRatio = () => {
    const source = parseFloat(sourceAmount);
    const target = parseFloat(targetAmount);
    if (source > 0 && target > 0) {
      return (target / source).toFixed(6);
    }
    return '0';
  };

  const fetchBalances = async () => {
    if (!authInfo?.pkp.ethAddress) return;
    
    setBalancesLoading(true);
    try {
      // Get RPC URL and token config for the source chain
      const getRpcUrl = (chainId: string) => {
        const rpcUrls: Record<string, string> = {
          '84532': 'https://sepolia.base.org', // Base Sepolia
          '11155111': 'https://lb.drpc.live/sepolia/AplHGB2v9khYpYVNxc5za0FxucDEi1sR8IqgqhnKxixj', // Sepolia via drpc.live
          '1': 'https://eth.llamarpc.com', // Ethereum Mainnet
        };
        return rpcUrls[chainId] || 'https://sepolia.base.org';
      };

      // Fetch source balance
      const sourceTokenConfig = getTokenConfig(sourceChain);
      const tokenInfo = sourceTokenConfig[sourceToken];
      if (tokenInfo) {
        const provider = new ethers.providers.JsonRpcProvider(getRpcUrl(sourceChain));
        const erc20ABI = ['function balanceOf(address owner) view returns (uint256)'];
        const tokenContract = new ethers.Contract(tokenInfo.address, erc20ABI, provider);
        
        const balance = await tokenContract.balanceOf(authInfo.pkp.ethAddress);
        const parsedBalance = ethers.utils.formatUnits(balance, tokenInfo.decimals);
        setSourceBalance(parseFloat(parsedBalance));
      } else {
        setSourceBalance(0);
      }
      
      // Fetch target balance (if it's on a different chain)
      if (targetChain !== sourceChain) {
        const targetTokenConfig = getTokenConfig(targetChain);
        const tokenInfo = targetTokenConfig[targetToken];
        if (tokenInfo) {
          const provider = new ethers.providers.JsonRpcProvider(getRpcUrl(targetChain));
          const erc20ABI = ['function balanceOf(address owner) view returns (uint256)'];
          const tokenContract = new ethers.Contract(tokenInfo.address, erc20ABI, provider);
          
          const balance = await tokenContract.balanceOf(authInfo.pkp.ethAddress);
          const parsedBalance = ethers.utils.formatUnits(balance, tokenInfo.decimals);
          setTargetBalance(parseFloat(parsedBalance));
        } else {
          setTargetBalance(0);
        }
      } else {
        setTargetBalance(0);
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
      setSourceBalance(0);
      setTargetBalance(0);
    } finally {
      setBalancesLoading(false);
    }
  };

  // Fetch balances when component mounts or when token/chain selections change
  useEffect(() => {
    fetchBalances();
  }, [sourceToken, sourceChain, targetToken, targetChain, authInfo?.pkp.ethAddress]);

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

    // Validate balance
    const requestedAmount = parseFloat(sourceAmount);
    if (requestedAmount > sourceBalance) {
      setError(`Insufficient balance. You have ${sourceBalance.toFixed(4)} ${sourceToken} but trying to exchange ${requestedAmount.toFixed(4)} ${sourceToken}.`);
      setIsLoading(false);
      return;
    }

    try {
      const ethAddress = authInfo.pkp.ethAddress;
      const caip10Wallet = `eip155:${sourceChain}:${ethAddress}`;
      
      // Use the correct token configuration for the source chain
      const sourceTokenConfig = getTokenConfig(sourceChain);
      const tokenInfo = sourceTokenConfig[sourceToken];
      if (!tokenInfo) {
        throw new Error(`Token ${sourceToken} not supported on chain ${sourceChain}`);
      }
      
      const caip10Token = `eip155:${sourceChain}/erc20:${tokenInfo.address}`;

      // Create trading pair symbol
      const symbol = `${targetToken}/${sourceToken}`;
      
      // Calculate price (how much target token per source token)
      const price = parseFloat(targetAmount) / parseFloat(sourceAmount);

      const orderData = {
        amount: parseFloat(targetAmount), // Amount of target token user wants
        side: 'BUY' as const, // User is buying target token with source token
        price: price,
        caip10Token,
        caip10Wallet,
        symbol,
        metadata: {
          createdAt: new Date().toISOString(),
          sourceAmount: parseFloat(sourceAmount),
          sourceToken,
          sourceChain: parseInt(sourceChain),
          targetAmount: parseFloat(targetAmount),
          targetToken,
          targetChain: parseInt(targetChain),
        },
        // Multi-chain fields
        targetChainId: parseInt(targetChain),
        targetTokenAddress: targetToken === 'SOL' ? 'So11111111111111111111111111111111111111112' : undefined, // SOL token address on Solana
        targetTokenSymbol: targetToken,
      };

      const result = await createOrder(orderData);
      console.log('Order created:', result);
      setSuccess(true);
      if (onCreate) onCreate();
      
      // Reset form
      setSourceAmount('');
      setTargetAmount('');
    } catch (err: any) {
      setError(err.message || 'Failed to create order');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Create Exchange Order</h2>
      
      {/* Info banner */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">No upfront deposit required!</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Place your order now. Vincent will handle deposits automatically when your order matches with another user.</p>
              <p className="mt-1">Your current balances are shown below to help you make informed decisions.</p>
            </div>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Source Section - What user wants to exchange */}
        <div className="border rounded-lg p-4 bg-blue-50">
          <h3 className="text-lg font-semibold mb-3 text-blue-800">I want to exchange:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="sourceAmount">Amount</Label>
              <div className="flex gap-2">
                <Input
                  id="sourceAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={sourceAmount}
                  onChange={(e) => setSourceAmount(e.target.value)}
                  placeholder="e.g., 100"
                  required
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSourceAmount(sourceBalance.toString())}
                  disabled={sourceBalance <= 0}
                  className="px-3"
                >
                  Max
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="sourceToken">Token</Label>
              <Select value={sourceToken} onValueChange={setSourceToken}>
                <SelectTrigger id="sourceToken">
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDC">USDC</SelectItem>
                  <SelectItem value="WETH">WETH</SelectItem>
                  <SelectItem value="DAI">DAI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sourceChain">Chain</Label>
              <Select value={sourceChain} onValueChange={setSourceChain}>
                <SelectTrigger id="sourceChain">
                  <SelectValue placeholder="Select chain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="84532">Base Sepolia</SelectItem>
                  <SelectItem value="1">Ethereum</SelectItem>
                  <SelectItem value="11155111">Sepolia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Source Balance Display */}
          <div className="mt-3 p-3 bg-white rounded border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Available Balance:</span>
              {balancesLoading ? (
                <Badge variant="outline">Loading...</Badge>
              ) : (
                <Badge className={sourceBalance > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {sourceBalance.toFixed(4)} {sourceToken}
                </Badge>
              )}
            </div>
            {parseFloat(sourceAmount) > 0 && sourceBalance > 0 && (
              <div className="mt-2 text-xs text-gray-600">
                {parseFloat(sourceAmount) > sourceBalance ? (
                  <span className="text-red-600">⚠️ Insufficient balance for this amount</span>
                ) : (
                  <span className="text-green-600">✅ Sufficient balance available</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Target Section - What user wants to receive */}
        <div className="border rounded-lg p-4 bg-green-50">
          <h3 className="text-lg font-semibold mb-3 text-green-800">I want to receive:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="targetAmount">Amount</Label>
              <Input
                id="targetAmount"
                type="number"
                step="0.01"
                min="0"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="e.g., 0.1"
                required
              />
            </div>
            <div>
              <Label htmlFor="targetToken">Token</Label>
              <Select value={targetToken} onValueChange={setTargetToken}>
                <SelectTrigger id="targetToken">
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ETH">ETH</SelectItem>
                  <SelectItem value="SOL">SOL</SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                  <SelectItem value="WETH">WETH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="targetChain">Chain</Label>
              <Select value={targetChain} onValueChange={setTargetChain}>
                <SelectTrigger id="targetChain">
                  <SelectValue placeholder="Select chain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="101">Solana</SelectItem>
                  <SelectItem value="84532">Base Sepolia</SelectItem>
                  <SelectItem value="1">Ethereum</SelectItem>
                  <SelectItem value="11155111">Sepolia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Target Balance Display (only show if different chain) */}
          {targetChain !== sourceChain && (
            <div className="mt-3 p-3 bg-white rounded border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Current Balance on Target Chain:</span>
                {balancesLoading ? (
                  <Badge variant="outline">Loading...</Badge>
                ) : (
                  <Badge className={targetBalance > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                    {targetBalance.toFixed(4)} {targetToken}
                  </Badge>
                )}
              </div>
              <div className="mt-1 text-xs text-gray-600">
                This shows your current balance on the target chain after the exchange
              </div>
            </div>
          )}
        </div>

        {/* Exchange Rate Display */}
        {sourceAmount && targetAmount && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="text-lg font-semibold mb-2">Exchange Rate:</h3>
            <div className="text-center">
              <div className="text-2xl font-bold">
                1 {sourceToken} = {calculateRatio()} {targetToken}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {sourceAmount} {sourceToken} → {targetAmount} {targetToken}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-red-600 text-sm p-3 bg-red-50 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="text-green-600 text-sm p-3 bg-green-50 rounded">
            Exchange order created successfully!
          </div>
        )}

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Creating Order...' : 'Create Exchange Order'}
        </Button>
      </form>
    </Card>
  );
};