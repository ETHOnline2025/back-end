import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { getPKPInfo } from '@lit-protocol/vincent-app-sdk/jwt';
import { getErc20ApprovalToolClient, getCallContractWhitelistToolClient } from '../agenda/jobs/executeDCASwap/vincentAbilities';

import { VincentAuthenticatedRequest } from './types';
import { env } from '../env';
import { Interface } from 'ethers/lib/utils';


const TRADING_CONTRACT_ADDRESS = '0x0b4aec45bb5f3f70cc6cdb9771c850ff20d812a4';
const BASE_CHAIN_ID = 84532;
const BASE_RPC_URL = 'https://sepolia.base.org'; // Base Sepolia
// const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // USDC on Base Sepolia

// Chain types enum
enum ChainType {
  NATIVE = 0,    // Native chain (Base/Ethereum)
  OTHER = 1      // Other chains (Solana, etc.)
}

/**
 * Determine action based on chain type
 * @param chainType - The type of chain (native or other)
 * @returns Action value (0 for native, 1 for other chains)
 */
const getActionForChain = (chainType: ChainType): number => {
  return chainType;
};

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
    
    // Encode function arguments as base64
    const functionArgsBase64 = Buffer.from(JSON.stringify([syncUpArgs])).toString('base64');
    
    const result = await client.execute(
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
    // console.error('Error calling syncUp:', error);
    return res.status(500).json({
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
    // console.error('Error getting balance:', error);
    return res.status(500).json({
      error: 'Failed to get trade balance',
      success: false,
      details: error.message,
    });
  }
};

/**
 * Get authenticated user's trade balance from Trading contract
 * GET /api/trading/my-balance
 */
export const handleGetMyBalanceRoute = async (req: VincentAuthenticatedRequest, res: Response) => {
  try {
    const { caip10Token } = req.query;

    if (!caip10Token) {
      return res.status(400).json({
        error: 'Missing required parameter',
        success: false,
        required: ['caip10Token'],
      });
    }

    // Get ethAddress from JWT
    const pkpInfo = await getPKPInfo(req.user.decodedJWT);
    const delegatorEthAddress = pkpInfo.ethAddress;
    
    // Create CAIP10 wallet format
    const caip10Wallet = `eip155:${BASE_CHAIN_ID}:${delegatorEthAddress}`;

    // Call the Trading contract's getTradeBalance function
    const provider = new ethers.providers.JsonRpcProvider(BASE_RPC_URL);
    const tradingContract = new ethers.Contract(
      TRADING_CONTRACT_ADDRESS,
      ['function getTradeBalance(string memory _caip10Wallet, string memory _caip10Token) external view returns (uint256)'],
      provider
    );
    
    const balance = await tradingContract.getTradeBalance(caip10Wallet, caip10Token as string);

    res.json({
      success: true,
      caip10Wallet,
      caip10Token,
      balance: balance.toString(),
    });
  } catch (error: any) {
    // console.error('Error getting my balance:', error);
    return res.status(500).json({
      error: 'Failed to get trade balance',
      success: false,
      details: error.message,
    });
  }
};

/**
 * Get ERC20 token balance
 * GET /api/trading/token-balance
 */
export const handleGetTokenBalanceRoute = async (req: Request, res: Response) => {
  try {
    const { tokenAddress, walletAddress } = req.query;

    if (!tokenAddress || !walletAddress) {
      return res.status(400).json({
        error: 'Missing required parameters',
        success: false,
        required: ['tokenAddress', 'walletAddress'],
      });
    }

    const provider = new ethers.providers.JsonRpcProvider(BASE_RPC_URL);
    const erc20ABI = ['function balanceOf(address owner) view returns (uint256)'];
    const tokenContract = new ethers.Contract(tokenAddress as string, erc20ABI, provider);
    
    const balance = await tokenContract.balanceOf(walletAddress as string);

    res.json({
      success: true,
      tokenAddress,
      walletAddress,
      balance: balance.toString(),
    });
  } catch (error: any) {
    // console.error('Error getting token balance:', error);
    return res.status(500).json({
      error: 'Failed to get token balance',
      success: false,
      details: error.message,
    });
  }
};

/**
 * Deposit tokens to the Trading contract
 * POST /api/trading/deposit
 */
export const handleDepositRoute = async (req: VincentAuthenticatedRequest, res: Response) => {
  try {
    const { tokenAddress, chainType, amount } = req.body;

    if (!tokenAddress || !amount) {
      return res.status(400).json({
        error: 'Missing required parameters',
        success: false,
        required: ['tokenAddress', 'amount'],
      });
    }

    // Determine chain type - default to native if not specified
    const targetChainType = chainType !== undefined ? chainType : ChainType.NATIVE;

    // Get ethAddress from JWT
    const pkpInfo = await getPKPInfo(req.user.decodedJWT);
    const delegatorEthAddress = pkpInfo.ethAddress;

    // First, approve the Trading contract to spend tokens
    const erc20ApprovalClient = getErc20ApprovalToolClient();
    
    const approvalResult = await erc20ApprovalClient.execute(
      {
        tokenAddress: tokenAddress,
        spenderAddress: TRADING_CONTRACT_ADDRESS,
        tokenAmount: amount.toString(),
        chainId: BASE_CHAIN_ID,
        rpcUrl: BASE_RPC_URL,
        alchemyGasSponsor: !!env.ALCHEMY_API_KEY,
        alchemyGasSponsorApiKey: env.ALCHEMY_API_KEY,
        alchemyGasSponsorPolicyId: env.ALCHEMY_POLICY_ID,
      },
      {
        delegatorPkpEthAddress: delegatorEthAddress,
      }
    );

    if (!approvalResult.success) {
      return res.status(500).json({
        error: 'Failed to approve token transfer',
        success: false,
        details: approvalResult.result?.error || 'Unknown error',
      });
    }

    // Now call the deposit function on the Trading contract
    // CAIP10 format for wallet: eip155:CHAIN_ID:ADDRESS
    const caip10Wallet = `eip155:${BASE_CHAIN_ID}:${delegatorEthAddress}`;
    
    // CAIP10 format for token: eip155:CHAIN_ID/erc20:TOKEN_ADDRESS
    const caip10Token = `eip155:${BASE_CHAIN_ID}:${tokenAddress}`;
    
    // Determine action based on chain type
    const action = getActionForChain(targetChainType);
    
    // Depositor wallet - use the delegator address as string
    const depositorWallet = delegatorEthAddress;

    const callContractClient = getCallContractWhitelistToolClient();

    // console.log('Calling deposit with params:', {
    //   caip10Token,
    //   caip10Wallet,
    //   amount,
    //   action,
    //   chainType: targetChainType,
    //   chainTypeName: targetChainType === ChainType.NATIVE ? 'Native (Base/Ethereum)' : 'Other (Solana)',
    //   depositorWallet,
    // });

    const correctFunctionAbi = 'function deposit(string _caip10Token, string _caip10Wallet, uint256 _amount, uint8 _action, string _depositorWalletOrName)';

    const iface = new Interface([correctFunctionAbi]); // Create an interface from your function ABI
    const encodedFunctionData = iface.encodeFunctionData(
      "deposit", // The function name
      [
        caip10Token,
        caip10Wallet,
        amount.toString(),
        action,
        depositorWallet,
      ]
    );

    // console.log("Simulated Calldata:", encodedFunctionData);


    

    const depositResult = await callContractClient.execute({
        value:'0',
        contractAddress: TRADING_CONTRACT_ADDRESS,
        functionAbi: correctFunctionAbi,
        functionName: 'deposit',
        functionArgs: [
          caip10Token,
          caip10Wallet,
          amount.toString(), // Ensure amount is a string if the tool expects it this way
          action, // 0 = Native chain (Base/Ethereum), 1 = Other chains (Solana)
          depositorWallet,
        ],
        functionArgsBase64: '',
        appendToCallData: '',
        chain: 'baseSepolia',
        chainId: BASE_CHAIN_ID,
        rpcUrl: BASE_RPC_URL,
    }, {
      delegatorPkpEthAddress: delegatorEthAddress,
    });

    if (!depositResult.success) {
      return res.status(500).json({
        error: 'Failed to deposit tokens',
        success: false,
        details: depositResult.result?.error || 'Unknown error',
      });
    }

    res.json(depositResult.result);
  } catch (error: any) {
    // console.error('Error depositing:', error);
    return res.status(500).json({
      error: 'Failed to deposit tokens',
      success: false,
      details: error.message,
    });
  }
};
