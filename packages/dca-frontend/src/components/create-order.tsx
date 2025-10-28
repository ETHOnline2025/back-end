import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBackend } from '@/hooks/useBackend';
import { useJwtContext } from '@lit-protocol/vincent-app-sdk/react';
import { ethers } from 'ethers';
import { AlertTriangle, ArrowRightLeft, CheckCircle2 } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

interface CreateOrderProps {
  onCreate?: () => void;
}

interface Token {
  symbol: string;
  name: string;
  icon?: string;
  price?: number;
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

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Token configuration for different networks
  const getTokenConfig = (chainId: string) => {
    const configs: Record<string, Record<string, { address: string; decimals: number }>> = {
      '84532': {
        // Base Sepolia
        USDC: { address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', decimals: 6 },
        UNI: { address: '0x1f9840a85d5af5bf1d1762fcd6407d85fd2df3ef', decimals: 18 },
        WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
        DAI: { address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18 },
      },
      '11155111': {
        // Sepolia
        USDC: { address: '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238', decimals: 6 }, // Sepolia USDC
        UNI: { address: '0x1f9840a85d5af5bf1d1762fcd6407d85fd2df3ef', decimals: 18 },
        WETH: { address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', decimals: 18 },
        DAI: { address: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357', decimals: 18 },
      },
      '1': {
        // Ethereum Mainnet
        USDC: { address: '0xA0b86a33E6441b8C4C8C0E4A8c5A8F1A8c5A8F1A', decimals: 6 },
        UNI: { address: '0x1f9840a85d5af5bf1d1762fcd6407d85fd2df3ef', decimals: 18 },
        WETH: { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
        DAI: { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
      },
    };
    return configs[chainId] || configs['84532']; // Default to Base Sepolia
  };

  const getTokenInfo = (symbol: string): Token => {
    const tokens: Record<string, Token> = {
      USDC: { symbol: 'USDC', name: 'USD Coin', icon: '💵', price: 1 },
      WETH: { symbol: 'WETH', name: 'Wrapped Ether', icon: '🔷', price: 2500 },
      ETH: { symbol: 'ETH', name: 'Ethereum', icon: '🔷', price: 2500 },
      SOL: { symbol: 'SOL', name: 'Solana', icon: '🟣', price: 150 },
      DAI: { symbol: 'DAI', name: 'Dai Stablecoin', icon: '🟡', price: 1 },
      UNI: { symbol: 'UNI', name: 'Uniswap', icon: '🦄', price: 7 },
    };
    return tokens[symbol] || { symbol, name: symbol, icon: '❓', price: 0 };
  };

  const calculateRatio = () => {
    const source = parseFloat(sourceAmount);
    const target = parseFloat(targetAmount);
    if (source > 0 && target > 0 && !isNaN(source) && !isNaN(target)) {
      return (target / source).toFixed(6);
    }
    return '0';
  };

  const switchTokens = () => {
    // Switch source and target
    const tempToken = sourceToken;
    const tempChain = sourceChain;
    const tempAmount = sourceAmount;

    setSourceToken(targetToken);
    setSourceChain(targetChain);
    setSourceAmount(targetAmount);

    setTargetToken(tempToken);
    setTargetChain(tempChain);
    setTargetAmount(tempAmount);
  };

  const walletAddress = authInfo?.pkp.ethAddress;

  const fetchBalances = useCallback(async () => {
    if (!walletAddress) return;

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
        try {
          const provider = new ethers.providers.JsonRpcProvider(getRpcUrl(sourceChain));
          const erc20ABI = ['function balanceOf(address owner) view returns (uint256)'];
          const tokenContract = new ethers.Contract(tokenInfo.address, erc20ABI, provider);

          const balance = await tokenContract.balanceOf(walletAddress);
          const parsedBalance = ethers.utils.formatUnits(balance, tokenInfo.decimals);
          setSourceBalance(parseFloat(parsedBalance));
        } catch (balanceError) {
          console.warn('Error fetching source balance:', balanceError);
          setSourceBalance(0);
        }
      } else {
        setSourceBalance(0);
      }

      // Fetch target balance (if it's on a different chain)
      if (targetChain !== sourceChain) {
        const targetTokenConfig = getTokenConfig(targetChain);
        const tokenInfo = targetTokenConfig[targetToken];
        if (tokenInfo) {
          try {
            const provider = new ethers.providers.JsonRpcProvider(getRpcUrl(targetChain));
            const erc20ABI = ['function balanceOf(address owner) view returns (uint256)'];
            const tokenContract = new ethers.Contract(tokenInfo.address, erc20ABI, provider);

            const balance = await tokenContract.balanceOf(walletAddress);
            const parsedBalance = ethers.utils.formatUnits(balance, tokenInfo.decimals);
            setTargetBalance(parseFloat(parsedBalance));
          } catch (balanceError) {
            console.warn('Error fetching target balance:', balanceError);
            setTargetBalance(0);
          }
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
    }
  }, [walletAddress, sourceChain, sourceToken, targetChain, targetToken]);

  // Fetch balances when component mounts or when token/chain selections change
  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

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

    // Validate input amounts
    const sourceAmountNum = parseFloat(sourceAmount);
    const targetAmountNum = parseFloat(targetAmount);

    if (!sourceAmount || !targetAmount || isNaN(sourceAmountNum) || isNaN(targetAmountNum)) {
      setError('Please enter valid amounts for both tokens');
      setIsLoading(false);
      return;
    }

    if (sourceAmountNum <= 0 || targetAmountNum <= 0) {
      setError('Amounts must be greater than zero');
      setIsLoading(false);
      return;
    }

    // Validate balance
    if (sourceAmountNum > sourceBalance) {
      setError(
        `Insufficient balance. You have ${sourceBalance.toFixed(4)} ${sourceToken} but trying to exchange ${sourceAmountNum.toFixed(4)} ${sourceToken}.`
      );
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
      const price = targetAmountNum / sourceAmountNum;

      const orderData = {
        amount: targetAmountNum, // Amount of target token user wants
        side: 'BUY' as const, // User is buying target token with source token
        price: price,
        caip10Token,
        caip10Wallet,
        symbol,
        metadata: {
          createdAt: new Date().toISOString(),
          sourceAmount: sourceAmountNum,
          sourceToken,
          sourceChain: parseInt(sourceChain),
          targetAmount: targetAmountNum,
          targetToken,
          targetChain: parseInt(targetChain),
        },
        // Multi-chain fields
        targetChainId: parseInt(targetChain),
        targetTokenAddress:
          targetToken === 'SOL' ? 'So11111111111111111111111111111111111111112' : undefined, // SOL token address on Solana
        targetTokenSymbol: targetToken,
      };

      const result = await createOrder(orderData);
      console.log('Order created:', result);
      setSuccess(true);
      if (onCreate) onCreate();

      // Reset form
      setSourceAmount('');
      setTargetAmount('');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to create order');
      } else {
        setError('Failed to create order');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="relative h-[600px] overflow-hidden border border-white/10 bg-[#0b101d] shadow-[0_25px_60px_rgba(5,8,15,0.7)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[#131519] " />
      <CardHeader className="relative z-10 pb-6">
        <div>
          <CardTitle className="text-2xl font-semibold text-white">Swap</CardTitle>
          <CardDescription className="text-sm text-white/60">
            Trade instantly across chains
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="relative z-10 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <TokenInput
              label="From"
              token={getTokenInfo(sourceToken)}
              amount={sourceAmount}
              balance={sourceBalance}
              onAmountChange={setSourceAmount}
              tokenSelect={
                <Select value={sourceToken} onValueChange={setSourceToken}>
                  <SelectTrigger className="group min-w-[200px] rounded-sm border border-white/10 bg-[#303134] px-4 py-3 text-left text-white shadow-[0_12px_28px_rgba(10,14,25,0.45)] transition hover:border-white/20 data-[state=open]:border-white/30 focus:ring-0 focus:ring-offset-0">
                    <SelectValue className="sr-only" />
                    <div className="flex items-center gap-3">
                      <span className="text-xl leading-none">{getTokenInfo(sourceToken).icon}</span>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-white">
                          {getTokenInfo(sourceToken).symbol}
                        </span>
                        <span className="text-[11px] uppercase tracking-[0.2em] text-white/40">
                          {getTokenInfo(sourceToken).name}
                        </span>
                      </div>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USDC">USDC</SelectItem>
                    <SelectItem value="WETH">WETH</SelectItem>
                    <SelectItem value="DAI">DAI</SelectItem>
                  </SelectContent>
                </Select>
              }
              chainSelect={
                <Select value={sourceChain} onValueChange={setSourceChain}>
                  <SelectTrigger className="rounded-sm border border-white/10 bg-[#303134] px-4 py-3 text-left text-sm font-medium text-white/80 shadow-[0_8px_18px_rgba(10,14,25,0.35)] transition hover:border-white/20 data-[state=open]:border-white/30 focus:ring-0 focus:ring-offset-0">
                    <SelectValue className="tracking-wide text-white/90" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="84532">Base Sepolia</SelectItem>
                    <SelectItem value="1">Ethereum</SelectItem>
                    <SelectItem value="11155111">Sepolia</SelectItem>
                  </SelectContent>
                </Select>
              }
            />

            <div className="flex justify-center">
              <button
                type="button"
                onClick={switchTokens}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-[#151d33]/80 text-white shadow-[0_12px_30px_rgba(9,13,25,0.6)] transition hover:border-white/20 hover:bg-[#1b2540]"
              >
                <ArrowRightLeft className="h-4 w-4" />
              </button>
            </div>

            <TokenInput
              label="To"
              token={getTokenInfo(targetToken)}
              amount={targetAmount}
              balance={targetBalance}
              onAmountChange={setTargetAmount}
              tokenSelect={
                <Select value={targetToken} onValueChange={setTargetToken}>
                  <SelectTrigger className="group min-w-[200px] rounded-sm border border-white/10 bg-[#303134] px-4 py-3 text-left text-white shadow-[0_12px_28px_rgba(10,14,25,0.45)] transition hover:border-white/20 data-[state=open]:border-white/30 focus:ring-0 focus:ring-offset-0">
                    <SelectValue className="sr-only" />
                    <div className="flex items-center gap-3">
                      <span className="text-xl leading-none">{getTokenInfo(targetToken).icon}</span>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-white">
                          {getTokenInfo(targetToken).symbol}
                        </span>
                        <span className="text-[11px] uppercase tracking-[0.2em] text-white/40">
                          {getTokenInfo(targetToken).name}
                        </span>
                      </div>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ETH">ETH</SelectItem>
                    <SelectItem value="SOL">SOL</SelectItem>
                    <SelectItem value="USDC">USDC</SelectItem>
                    <SelectItem value="WETH">WETH</SelectItem>
                  </SelectContent>
                </Select>
              }
              chainSelect={
                <Select value={targetChain} onValueChange={setTargetChain}>
                  <SelectTrigger className="rounded-sm border border-white/10 bg-[#303134] px-4 py-3 text-left text-sm font-medium text-white/80 shadow-[0_8px_18px_rgba(10,14,25,0.35)] transition hover:border-white/20 data-[state=open]:border-white/30 focus:ring-0 focus:ring-offset-0">
                    <SelectValue className="tracking-wide text-white/90" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="101">Solana</SelectItem>
                    <SelectItem value="84532">Base Sepolia</SelectItem>
                    <SelectItem value="1">Ethereum</SelectItem>
                    <SelectItem value="11155111">Sepolia</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
          </div>

          {sourceAmount && targetAmount && (
            <div className="space-y-3 rounded-sm border border-white/5 bg-white/5 p-4 text-sm text-white/70 shadow-[0_15px_35px_rgba(7,11,20,0.55)]">
              <DetailRow
                label="Exchange rate"
                value={`1 ${sourceToken} = ${calculateRatio()} ${targetToken}`}
              />
              <DetailRow label="Network fee" value="~$2.50" />
              <DetailRow label="Price impact" value="<0.1%" />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">
              Exchange order created successfully!
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="h-12 w-full rounded-sm bg-[#2563eb] text-base font-semibold text-white shadow-[0_15px_35px_rgba(37,99,235,0.45)] transition hover:bg-[#1d4ed8]"
          >
            {isLoading ? 'Creating Order...' : 'Swap'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

function TokenInput({
  label,
  token,
  amount,
  balance,
  onAmountChange,
  tokenSelect,
  chainSelect,
}: {
  label: string;
  token: Token;
  amount: string;
  balance?: number;
  onAmountChange?: (value: string) => void;
  tokenSelect?: React.ReactNode;
  chainSelect?: React.ReactNode;
}) {
  const parsedAmount = Number.parseFloat(amount || '0');
  const numericAmount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
  const tokenPrice = token?.price || 0;
  const formattedFiat = (numericAmount * tokenPrice).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const hasAmount = amount.trim() !== '' && numericAmount > 0;
  const insufficient = balance !== undefined && hasAmount && numericAmount > balance;

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    // Allow empty input
    if (value === '') {
      onAmountChange?.(value);
      return;
    }

    // Only allow numbers and decimal point
    const regex = /^[0-9]*\.?[0-9]*$/;
    if (regex.test(value)) {
      onAmountChange?.(value);
    }
  };

  return (
    <div className="rounded-[26px] border border-white/10 bg-[#13161b] p-6 shadow-[0_20px_45px_rgba(6,10,20,0.6)]">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.32em] text-white/45">
        <span>{label}</span>
        {balance !== undefined && (
          <span className="text-white/55">
            Balance:{' '}
            <span className="text-white">
              {balance.toFixed(4)} {token.symbol}
            </span>
          </span>
        )}
      </div>
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {tokenSelect}
          {chainSelect}
        </div>
        <div className="flex-1 text-right">
          <Label htmlFor={`${label}-amount`} className="sr-only">
            {label} amount
          </Label>
          <Input
            id={`${label}-amount`}
            value={amount}
            onChange={handleInputChange}
            className="h-14 rounded-xl border-none bg-transparent text-right text-4xl font-semibold tracking-tight text-white outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-white/25 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            inputMode="decimal"
            pattern="^[0-9]*[.,]?[0-9]*$"
            placeholder="0.0"
          />
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-white/35">
            ${formattedFiat}
          </p>
        </div>
      </div>
      {balance !== undefined && hasAmount && (
        <div className="mt-4 text-xs font-medium">
          {insufficient ? (
            <span className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-4 w-4" />
              Insufficient balance
            </span>
          ) : (
            <span className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Sufficient balance
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm text-white/70">
      <span>{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}
