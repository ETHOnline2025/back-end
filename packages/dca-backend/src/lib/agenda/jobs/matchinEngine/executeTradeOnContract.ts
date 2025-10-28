import { ethers } from 'ethers';
import { ITrade } from '../../../mongo/models/Trade';

// Trading contract address on Base Sepolia
const TRADING_CONTRACT_ADDRESS = '0x3dfB03600550F59bEffb8980c133a8E533761eDF';
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://sepolia.base.org';
const BASE_CHAIN_ID = 84532;

// ABI for the Trading contract's syncUp function
const TRADING_ABI = [
  'function syncUp((string caip10Wallet, string caip10Token, address evmDepositorWallet, uint256 newAmount)[] memory _data)',
];

/**
 * Executes a matched trade on the Trading contract by syncing balances
 * @param trade The matched trade to execute
 * @returns Promise with transaction hash
 */
export async function executeTradeOnContract(trade: ITrade): Promise<string> {
  // Create provider for Base Sepolia
  const provider = new ethers.providers.JsonRpcProvider(BASE_RPC_URL);
  
  // Create contract instance
  const tradingContract = new ethers.Contract(
    TRADING_CONTRACT_ADDRESS,
    TRADING_ABI,
    provider
  );

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
  
  // Get actual token addresses (you'll need to update these with real token addresses)
  const tokenInAddress = getTokenAddress(tokenInSymbol);
  const tokenOutAddress = getTokenAddress(tokenOutSymbol);

  // Calculate amounts based on trade
  const tokenInAmount = ethers.utils.parseUnits(trade.amount.toString(), 6); // Assuming 6 decimals for USDC
  const tokenOutAmount = ethers.utils.parseUnits((trade.amount * trade.price).toString(), 18); // Assuming 18 decimals for other tokens

  // Create CAIP10 identifiers for tokens
  const tokenInCaip10 = `eip155:${BASE_CHAIN_ID}/erc20:${tokenInAddress}`;
  const tokenOutCaip10 = `eip155:${BASE_CHAIN_ID}/erc20:${tokenOutAddress}`;

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

  // Simulate or execute the transaction
  // Note: This requires admin access to call syncUp
  const tx = await tradingContract.syncUp(syncUpArgs);
  
  console.log('Trade executed on contract:', tx.hash);
  
  return tx.hash;
}

/**
 * Example usage for calling Trading contract functions
 * Uses callContractWhitelist Vincent ability to execute any contract function
 */
export async function executeTradeViaVincent(
  trade: ITrade,
  delegatorAddress: string,
  functionName: string = 'syncUp'
): Promise<string> {
  // This would be called from a job that has Vincent permissions
  // You would use getCallContractWhitelistToolClient() to execute this
  
  // Example parameters for callContractWhitelist:
  const contractCallParams = {
    contractAddress: TRADING_CONTRACT_ADDRESS,
    functionAbi: 'function syncUp((string caip10Wallet, string caip10Token, address evmDepositorWallet, uint256 newAmount)[] memory _data) external',
    functionName: functionName,
    functionArgs: [], // Would need to construct the syncUpArgs array
    chain: 'base',
    chainId: BASE_CHAIN_ID,
    rpcUrl: BASE_RPC_URL,
  };

  // This would be executed through Vincent:
  // const client = getCallContractWhitelistToolClient();
  // const result = await client.call(...);
  
  console.log('Would execute:', contractCallParams);
  
  return 'pending';
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
