import { ethers } from 'ethers';
import { ITrade } from '../../../mongo/models/Trade';
import { getCallContractWhitelistToolClient } from '../executeDCASwap/vincentAbilities';

// Trading contract address on Base Sepolia
const TRADING_CONTRACT_ADDRESS = '0x0b4aec45bb5f3f70cc6cdb9771c850ff20d812a4';
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://sepolia.base.org';
const BASE_CHAIN_ID = 84532;

/**
 * Executes a matched trade on the Trading contract by syncing balances using Vincent abilities
 * @param trade The matched trade to execute
 * @param delegatorAddress The address of the delegator executing the trade
 * @returns Promise with transaction hash
 */
export async function executeTradeOnContract(trade: ITrade, delegatorAddress: string): Promise<string> {
  // Prepare syncUp arguments
  // For a trade, we need to:
  // 1. Debit the seller's balance (reduce by amount * price)
  // 2. Credit the buyer's balance (increase by amount)
  
  const syncUpArgs = [];

  // Determine buyer and seller wallet addresses from CAIP10
  const buyerAddress = extractAddressFromCaip10(trade.buyerCaip10Wallet);
  const sellerAddress = extractAddressFromCaip10(trade.sellerCaip10Wallet);

  // Parse symbol to get token addresses
  const [tokenInSymbol, tokenOutSymbol] = trade.symbol.split('/');
  
  // Get actual token addresses
  const tokenInAddress = getTokenAddress(tokenInSymbol);
  const tokenOutAddress = getTokenAddress(tokenOutSymbol);

  // Calculate amounts based on trade
  const tokenInAmount = ethers.parseUnits(trade.amount.toString(), 6); // Assuming 6 decimals for USDC
  const tokenOutAmount = ethers.parseUnits((trade.amount * trade.price).toString(), 18); // Assuming 18 decimals for other tokens

  // Create CAIP10 identifiers for tokens
  const tokenInCaip10 = `eip155:${BASE_CHAIN_ID}:${tokenInAddress}`;
  const tokenOutCaip10 = `eip155:${BASE_CHAIN_ID}:${tokenOutAddress}`;

  // Debit seller (tokenIn being sold)
  syncUpArgs.push({
    caip10Wallet: trade.sellerCaip10Wallet,
    caip10Token: tokenInCaip10,
    evmDepositorWallet: sellerAddress,
    newAmount: '0', // Seller's balance after selling
  });

  // Credit buyer (tokenIn being bought)
  syncUpArgs.push({
    caip10Wallet: trade.buyerCaip10Wallet,
    caip10Token: tokenInCaip10,
    evmDepositorWallet: buyerAddress,
    newAmount: tokenInAmount.toString(), // Buyer receives the tokens
  });

  // Execute the transaction using Vincent abilities
  const callContractClient = getCallContractWhitelistToolClient();
  
  // Encode function arguments as base64
  const functionArgsBase64 = Buffer.from(JSON.stringify([syncUpArgs])).toString('base64');
  
  const result = await callContractClient.execute(
    {
      contractAddress: TRADING_CONTRACT_ADDRESS,
      functionAbi: 'function syncUp((string caip10Wallet, string caip10Token, address evmDepositorWallet, uint256 newAmount)[] memory _data) external',
      functionName: 'syncUp',
      functionArgsBase64: functionArgsBase64,
      chain: 'base',
      chainId: BASE_CHAIN_ID,
      rpcUrl: BASE_RPC_URL,
    },
    {
      delegatorPkpEthAddress: delegatorAddress,
    }
  );

  if (!result.success) {
    throw new Error(`Trade execution failed: ${result.error}`);
  }
  
  console.log('Trade executed on contract via Vincent:', result);
  
  return result;
}

/**
 * Legacy function - now replaced by executeTradeOnContract which uses Vincent abilities
 * @deprecated Use executeTradeOnContract instead
 */
export async function executeTradeViaVincent(
  trade: ITrade,
  delegatorAddress: string,
  functionName: string = 'syncUp'
): Promise<string> {
  console.warn('executeTradeViaVincent is deprecated. Use executeTradeOnContract instead.');
  return executeTradeOnContract(trade, delegatorAddress);
}

/**
 * Extract EVM address from CAIP10 format
 */
function extractAddressFromCaip10(caip10: string): string {
  // CAIP10 format: eip155:84532:0x...
  const parts = caip10.split(':');
  if (parts.length >= 3 && parts[0] === 'eip155') {
    return parts[2];
  }
  throw new Error(`Invalid CAIP10 format: ${caip10}`);
}

/**
 * Get token contract address from symbol
 */
function getTokenAddress(symbol: string): string {
  const tokenAddresses: Record<string, string> = {
    'USDC': '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
    'WBTC': '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c', // Base Sepolia WBTC
    'UNI': '0x...', // Add your token addresses here
  };
  
  return tokenAddresses[symbol.toUpperCase()] || '0x0000000000000000000000000000000000000000';
}
