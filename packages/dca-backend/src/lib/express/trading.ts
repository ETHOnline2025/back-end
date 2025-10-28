import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { getCallContractWhitelistToolClient } from '../agenda/jobs/executeDCASwap/vincentAbilities';

const TRADING_CONTRACT_ADDRESS = '0x0b4Aec45bB5F3F70cC6Cdb9771C850fF20D812A4';
const BASE_CHAIN_ID = 84532;
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://sepolia.base.org';

/**
 * Test endpoint to call Trading contract's syncUp function
 * POST /api/trading/sync-up
 */
export const handleSyncUpRoute = async (req: Request, res: Response) => {
  try {
    const { caip10Wallet, caip10Token, evmDepositorWallet, newAmount } = req.body;

    if (!caip10Wallet || !caip10Token || !evmDepositorWallet || !newAmount) {
      return res.status(400).json({
        error: 'Missing required parameters',
        success: false,
        required: ['caip10Wallet', 'caip10Token', 'evmDepositorWallet', 'newAmount'],
      });
    }

    // Prepare syncUp arguments
    const syncUpArgs = [{
      caip10Wallet,
      caip10Token,
      evmDepositorWallet,
      newAmount: newAmount.toString(),
    }];

    // Call Trading contract via Vincent
    const client = getCallContractWhitelistToolClient();
    
    const result = await client.execute(
      {
        contractAddress: TRADING_CONTRACT_ADDRESS,
        functionAbi: 'function syncUp((string caip10Wallet, string caip10Token, address evmDepositorWallet, uint256 newAmount)[] memory _data) external',
        functionName: 'syncUp',
        functionArgs: [syncUpArgs],
        chain: 'base',
        chainId: BASE_CHAIN_ID,
        rpcUrl: BASE_RPC_URL,
      },
      {
        delegatorPkpEthAddress: evmDepositorWallet,
      }
    );

    res.json({
      success: true,
      message: 'SyncUp executed successfully',
      txHash: result,
      data: syncUpArgs,
    });
  } catch (error: any) {
    console.error('Error calling syncUp:', error);
    res.status(500).json({
      error: 'Failed to execute syncUp on Trading contract',
      success: false,
      details: error.message,
    });
  }
};

/**
 * Get trade balance for a wallet
 * GET /api/trading/balance
 */
export const handleGetBalanceRoute = async (req: Request, res: Response) => {
  try {
    const { caip10Wallet, caip10Token } = req.query;

    if (!caip10Wallet || !caip10Token) {
      return res.status(400).json({
        error: 'Missing required parameters',
        success: false,
        required: ['caip10Wallet', 'caip10Token'],
      });
    }

    // For view functions, we can use a simpler provider call
    // View functions don't require Vincent execution
    const provider = new ethers.providers.JsonRpcProvider(BASE_RPC_URL);
    const tradingContract = new ethers.Contract(
      TRADING_CONTRACT_ADDRESS,
      ['function getTradeBalance(string memory _caip10Wallet, string memory _caip10Token) external view returns (uint256)'],
      provider
    );
    
    const balance = await tradingContract.getTradeBalance(caip10Wallet as string, caip10Token as string);

    res.json({
      success: true,
      caip10Wallet,
      caip10Token,
      balance: balance.toString(),
    });
  } catch (error: any) {
    console.error('Error getting balance:', error);
    res.status(500).json({
      error: 'Failed to get trade balance',
      success: false,
      details: error.message,
    });
  }
};
