import { Response } from 'express';
import { ethers } from 'ethers';
import { getPKPInfo } from '@lit-protocol/vincent-app-sdk/jwt';
import { getCallContractWhitelistToolClient, getErc20ApprovalToolClient } from '../agenda/jobs/executeDCASwap/vincentAbilities';

import { Order } from '../mongo/models/Order';
import { Trade } from '../mongo/models/Trade';
import { VincentAuthenticatedRequest } from './types';

// Helper functions for multi-chain support
const extractAddressFromCaip10 = (caip10Wallet: string): string => {
  const parts = caip10Wallet.split(':');
  return parts[2] || caip10Wallet;
};

const extractTokenAddressFromCaip10 = (caip10Token: string): string => {
  const parts = caip10Token.split(':');
  return parts[2] || caip10Token;
};

const getChainIdFromCaip10 = (caip10Wallet: string): number => {
  const parts = caip10Wallet.split(':');
  return parseInt(parts[1]) || 84532; // Default to Base Sepolia
};

const getChainTypeFromChainId = (chainId: number): 'NATIVE' | 'OTHER' => {
  // Base Sepolia = 84532, Ethereum = 1, etc. are NATIVE
  // Solana and other non-EVM chains are OTHER
  const nativeChainIds = [1, 84532, 11155111]; // Ethereum, Base Sepolia, Sepolia
  return nativeChainIds.includes(chainId) ? 'NATIVE' : 'OTHER';
};

const isCrossChainOrder = (sourceChainId: number, targetChainId?: number): boolean => {
  return targetChainId !== undefined && sourceChainId !== targetChainId;
};

const TRADING_CONTRACT_ADDRESS = '0x0b4aec45bb5f3f70cc6cdb9771c850ff20d812a4';
const BASE_RPC_URL = 'https://sepolia.base.org';
const BASE_CHAIN_ID = 84532;
const EURC_TOKEN_ADDRESS = '0x808456652fdb597867f38412077A9182bf77359F';

/**
 * Convert decimal amount to token units based on token decimals
 */
const convertToTokenUnits = (amount: number, tokenSymbol: string): string => {
  // Common token decimals
  const tokenDecimals: Record<string, number> = {
    'USDC': 6,
    'USDT': 6,
    'DAI': 18,
    'ETH': 18,
    'WETH': 18,
    'WBTC': 8,
    'EURC': 6 // EURC token on Base Sepolia
  };
  
  const decimals = tokenDecimals[tokenSymbol.toUpperCase()] || 18; // Default to 18 decimals
  const multiplier = Math.pow(10, decimals);
  const tokenUnits = Math.floor(amount * multiplier);
  
  console.log(`Converting ${amount} ${tokenSymbol} to ${tokenUnits} units (${decimals} decimals)`);
  return tokenUnits.toString();
};

/**
 * Get trade balance from the Trading contract
 * This is now only used for informational purposes, not for blocking orders
 */
async function getTradeBalance(caip10Wallet: string, caip10Token: string): Promise<number> {
  try {
    const provider = new ethers.providers.JsonRpcProvider(BASE_RPC_URL);
    const tradingContract = new ethers.Contract(
      TRADING_CONTRACT_ADDRESS,
      ['function getTradeBalance(string memory _caip10Wallet, string memory _caip10Token) external view returns (uint256)'],
      provider
    );
    
    const balance = await tradingContract.getTradeBalance(caip10Wallet, caip10Token);
    return parseFloat(ethers.utils.formatEther(balance)); // Convert from wei (assuming 18 decimals)
  } catch (error) {
    console.error('Error getting trade balance:', error);
    return 0;
  }
}

/**
 * Execute the complete trade flow: deposit from both users → syncup → withdrawal
 */
const executeTradeFlow = async (trade: any, newOrder: any, existingOrder: any, fillAmount: number) => {
  console.log(`Executing trade flow for trade ${trade._id} with amount ${fillAmount}`);
  
  try {
    // Step 1: Deposit from both users to the trading contract
    await Promise.all([
      depositForUser(newOrder, fillAmount, trade),
      depositForUser(existingOrder, fillAmount, trade)
    ]);
    
    console.log(`Deposits completed for trade ${trade._id}`);
    
    // Step 2: Execute syncup to perform the actual swap
    await executeSyncUp(trade, fillAmount);
    
    console.log(`SyncUp completed for trade ${trade._id}`);
    
    // Step 3: Update trade status to completed
    trade.status = 'COMPLETED';
    await trade.save();
    
    console.log(`Trade ${trade._id} completed successfully`);
    
  } catch (error) {
    console.error(`Trade flow failed for trade ${trade._id}:`, error);
    trade.status = 'FAILED';
    await trade.save();
    throw error;
  }
};

/**
 * Deposit tokens for a user to the trading contract using the existing deposit logic
 */
const depositForUser = async (order: any, amount: number, trade: any) => {
  console.log(`Depositing ${amount} tokens for user ${order.ethAddress}`);
  
  // Determine the token address and amount based on order side
  let tokenAddress: string;
  let depositAmount: string;
  
  if (order.side === 'BUY') {
    // Buyer needs to deposit the payment token (usually ETH or USDC)
    tokenAddress = order.tokenAddress; // The token they're buying with
    const totalAmount = amount * order.price; // Total payment amount
    depositAmount = convertToTokenUnits(totalAmount, order.tokenSymbol || 'USDC');
  } else {
    // Seller needs to deposit the token they're selling
    tokenAddress = order.tokenAddress;
    depositAmount = convertToTokenUnits(amount, order.tokenSymbol || 'USDC'); // Amount of tokens being sold
  }
  
  // Use the existing deposit logic from trading.ts
  // First, approve the Trading contract to spend tokens
  const erc20ApprovalClient = getErc20ApprovalToolClient();
  
  const approvalResult = await erc20ApprovalClient.execute(
    {
      tokenAddress: tokenAddress,
      spenderAddress: TRADING_CONTRACT_ADDRESS,
      tokenAmount: depositAmount,
      chainId: BASE_CHAIN_ID,
      rpcUrl: BASE_RPC_URL,
      alchemyGasSponsor: false, // Set to false for now, can be configured later
    },
    {
      delegatorPkpEthAddress: order.ethAddress,
    }
  );

  if (!approvalResult.success) {
    throw new Error(`Approval failed for user ${order.ethAddress}: ${approvalResult.result?.error || 'Unknown error'}`);
  }

  // Now call the deposit function on the Trading contract
  const caip10Wallet = `eip155:${BASE_CHAIN_ID}:${order.ethAddress}`;
  const caip10Token = `eip155:${BASE_CHAIN_ID}:${tokenAddress}`;
  
  const callContractClient = getCallContractWhitelistToolClient();

  const depositResult = await callContractClient.execute({
    value: '0',
    contractAddress: TRADING_CONTRACT_ADDRESS,
    functionAbi: 'function deposit(string _caip10Token, string _caip10Wallet, uint256 _amount, uint8 _action, string _depositorWalletOrName)',
    functionName: 'deposit',
    functionArgs: [
      caip10Token,
      caip10Wallet,
      depositAmount,
      0, // Action: 0 = Native chain
      order.ethAddress,
    ],
    functionArgsBase64: '',
    appendToCallData: '',
    chain: 'baseSepolia',
    chainId: BASE_CHAIN_ID,
    rpcUrl: BASE_RPC_URL,
  }, {
    delegatorPkpEthAddress: order.ethAddress,
  });
  
  if (!depositResult.success) {
    throw new Error(`Deposit failed for user ${order.ethAddress}: ${depositResult.result?.error || 'Unknown error'}`);
  }
  
  console.log(`Deposit successful for user ${order.ethAddress}: ${depositResult.result?.txHash}`);
  return depositResult;
};

/**
 * Execute syncUp to perform the actual token swap
 */
const executeSyncUp = async (trade: any, fillAmount: number) => {
  console.log(`Executing syncUp for trade ${trade._id}`);
  
  const callContractClient = getCallContractWhitelistToolClient();
  
  // Prepare syncUp arguments for both users using CAIP10 tokens
  const syncUpArgs = [
    // Debit seller (remove tokens they're selling)
    {
      caip10Wallet: trade.sellerCaip10Wallet,
      caip10Token: trade.sellerCaip10Token || `eip155:${BASE_CHAIN_ID}:${trade.tokenAddress}`,
      evmDepositorWallet: trade.sellerEthAddress,
      newAmount: '0', // Seller's balance after selling
    },
    // Credit buyer (give them the tokens they're buying)
    {
      caip10Wallet: trade.buyerCaip10Wallet,
      caip10Token: trade.buyerCaip10Token || `eip155:${BASE_CHAIN_ID}:${trade.tokenAddress}`,
      evmDepositorWallet: trade.buyerEthAddress,
      newAmount: fillAmount.toString(), // Buyer receives the tokens
    }
  ];
  
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
      delegatorPkpEthAddress: trade.buyerEthAddress, // Use buyer as delegator
    }
  );
  
  if (!result.success) {
    throw new Error(`SyncUp failed: ${result.result?.error || 'Unknown error'}`);
  }
  
  console.log(`SyncUp successful for trade ${trade._id}: ${result.result?.txHash}`);
  return result;
};

// Enhanced order matching function with cross-chain support
const processOrderMatchingWithoutTransaction = async (newOrder: any): Promise<{ matchedAmount: number; trades: any[] }> => {
  let matchedAmount = 0;
  const trades: any[] = [];
  let remainingNewOrderAmount = newOrder.amount;

  // Build matching query based on order type
  let query: any = {
    status: 'PENDING', // Only match with PENDING orders
  };

  console.log(`🔍 Matching order: ${newOrder.symbol} ${newOrder.side} @ ${newOrder.price}`);
  console.log(`   Source Chain: ${newOrder.sourceChainId}, Target Chain: ${newOrder.targetChainId}`);
  console.log(`   Is Cross Chain: ${newOrder.isCrossChain}`);

  // Extract token address from CAIP10 token format
  const newOrderTokenAddress = extractTokenAddressFromCaip10(newOrder.caip10Token);
  const newOrderChainId = getChainIdFromCaip10(newOrder.caip10Wallet);
  
  // Matching logic: support both cross-chain and same-chain swaps
  if (newOrder.isCrossChain) {
    // Cross-chain matching: different chains, compatible prices
    query.sourceChainId = { $ne: newOrderChainId }; // Different chain
    console.log(`🌐 Cross-chain matching: looking for orders on different chains`);
  } else {
    // Same-chain matching: same chain, opposite sides, compatible prices
    query.sourceChainId = newOrderChainId; // Same chain
    query.side = { $ne: newOrder.side }; // Opposite side (BUY vs SELL)
    console.log(`🔄 Same-chain matching: looking for ${newOrder.side === 'BUY' ? 'SELL' : 'BUY'} orders on same chain`);
  }
  
  // Price matching: find orders with compatible prices
  if (newOrder.side === 'BUY') {
    // For BUY orders, find orders that can provide tokens at acceptable price
    query.price = { $lte: newOrder.price };
  } else {
    // For SELL orders, find orders willing to buy at acceptable price
    query.price = { $gte: newOrder.price };
  }
  
  console.log(`🔄 CAIP10 matching: token ${newOrder.tokenSymbol} (${newOrderTokenAddress}), chain ${newOrderChainId}`);
  console.log(`   CAIP10 Token: ${newOrder.caip10Token}`);
  console.log(`   CAIP10 Wallet: ${newOrder.caip10Wallet}`);
  console.log(`   Token Symbol: "${newOrder.tokenSymbol}"`);

  // Find potential matches, sorted by price and time priority
  const sortOrder = newOrder.side === 'BUY' 
    ? { price: 1 as const, createdAt: 1 as const } // Ascending price, then oldest first
    : { price: -1 as const, createdAt: 1 as const }; // Descending price, then oldest first

  console.log(`📋 Matching query:`, JSON.stringify(query, null, 2));
  
  const potentialMatches = await Order.find(query)
    .sort(sortOrder);
    
  console.log(`🎯 Found ${potentialMatches.length} potential matches`);

  for (const existingOrder of potentialMatches) {
    if (remainingNewOrderAmount <= 0) {
      break;
    }

    const fillAmount = Math.min(existingOrder.remainingAmount, remainingNewOrderAmount);

    if (fillAmount > 0) {
      // Update the existing order
      const newRemainingAmount = existingOrder.remainingAmount - fillAmount;
      const newFilledAmount = existingOrder.filledAmount + fillAmount;
      const newStatus = newRemainingAmount <= 0 ? 'FILLED' : 'PARTIALLY_FILLED';
      
      await Order.updateOne(
        { _id: existingOrder._id },
        { 
          remainingAmount: newRemainingAmount,
          filledAmount: newFilledAmount,
          status: newStatus
        }
      );

      // Update the new order's remaining amount
      remainingNewOrderAmount -= fillAmount;
      matchedAmount += fillAmount;

      // Determine if this is a cross-chain trade
      const isCrossChainTrade = newOrder.isCrossChain || existingOrder.isCrossChain;
      
      // For cross-chain trades, determine buyer/seller based on chain flow
      let buyerOrder, sellerOrder;
      if (isCrossChainTrade) {
        // For cross-chain: buyer is the one receiving tokens on their target chain
        // seller is the one providing tokens from their source chain
        if (newOrder.targetChainId && existingOrder.sourceChainId === newOrder.targetChainId) {
          buyerOrder = newOrder;
          sellerOrder = existingOrder;
        } else if (existingOrder.targetChainId && newOrder.sourceChainId === existingOrder.targetChainId) {
          buyerOrder = existingOrder;
          sellerOrder = newOrder;
        } else {
          // Fallback to traditional side-based matching
          buyerOrder = newOrder.side === 'BUY' ? newOrder : existingOrder;
          sellerOrder = newOrder.side === 'SELL' ? newOrder : existingOrder;
        }
      } else {
        // Traditional same-chain matching
        buyerOrder = newOrder.side === 'BUY' ? newOrder : existingOrder;
        sellerOrder = newOrder.side === 'SELL' ? newOrder : existingOrder;
      }
      
      // Record the trade with enhanced information
      const trade = new Trade({
        buyOrderId: buyerOrder._id,
        sellOrderId: sellerOrder._id,
        price: existingOrder.price,
        amount: fillAmount,
        fillPrice: existingOrder.price,
        totalValue: fillAmount * existingOrder.price,
        
        // User information
        buyerCaip10Wallet: buyerOrder.caip10Wallet,
        sellerCaip10Wallet: sellerOrder.caip10Wallet,
        buyerEthAddress: buyerOrder.ethAddress,
        sellerEthAddress: sellerOrder.ethAddress,
        
        // CAIP10 tokens for smart contract
        buyerCaip10Token: buyerOrder.caip10Token,
        sellerCaip10Token: sellerOrder.caip10Token,
        
        // Token information
        symbol: newOrder.symbol,
        tokenAddress: newOrder.tokenAddress,
        tokenSymbol: newOrder.tokenSymbol,
        
        // Chain information
        sourceChainId: newOrder.sourceChainId,
        sourceChainType: newOrder.sourceChainType,
        targetChainId: newOrder.targetChainId || existingOrder.targetChainId,
        targetChainType: newOrder.targetChainType || existingOrder.targetChainType,
        
        // Cross-chain specific
        isCrossChain: isCrossChainTrade,
        targetTokenAddress: newOrder.targetTokenAddress || existingOrder.targetTokenAddress,
        targetTokenSymbol: newOrder.targetTokenSymbol || existingOrder.targetTokenSymbol,
        
        status: 'PENDING', // Changed to PENDING - will be updated when Vincent executes the swap
      });
      await trade.save();
      trades.push(trade);

      console.log(`Matched ${fillAmount} of new order (${newOrder._id}) with existing order (${existingOrder._id}). Cross-chain: ${isCrossChainTrade}`);
      
      // Execute the complete trade flow: deposit → syncup → withdrawal
      try {
        await executeTradeFlow(trade, newOrder, existingOrder, fillAmount);
        console.log(`Successfully executed trade flow for trade ${trade._id}`);
      } catch (tradeError) {
        console.error(`Failed to execute trade flow for trade ${trade._id}:`, tradeError);
        // Update trade status to failed
        trade.status = 'FAILED';
        await trade.save();
      }
    }
  }

  return { matchedAmount, trades };
};

// Route 1: Get ALL orders (for order book)
export const handleGetAllOrdersRoute = async (req: VincentAuthenticatedRequest, res: Response) => {
  try {
    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .lean();

    res.json({ data: orders, success: true });
  } catch (error: any) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({
      error: 'Failed to fetch all orders',
      success: false,
      details: error.message,
    });
  }
};

// Route 2: Get MY orders (for user's order management)
export const handleGetMyOrdersRoute = async (req: VincentAuthenticatedRequest, res: Response) => {
  try {
    const { ethAddress } = getPKPInfo(req.user.decodedJWT);

    const orders = await Order.find({
      ethAddress: ethAddress.toLowerCase()
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ data: orders, success: true });
  } catch (error: any) {
    console.error('Error fetching my orders:', error);
    res.status(500).json({
      error: 'Failed to fetch my orders',
      success: false,
      details: error.message,
    });
  }
};

export const handleCreateOrderRoute = async (req: VincentAuthenticatedRequest, res: Response) => {
  const { ethAddress } = getPKPInfo(req.user.decodedJWT);

  // req.body is validated by Zod middleware
  const { 
    amount, 
    side, 
    price, 
    caip10Token, 
    caip10Wallet, 
    symbol, 
    metadata,
    // New multi-chain fields
    targetChainId,
    targetTokenAddress,
    targetTokenSymbol
  } = req.body;

  try {
    // Extract addresses and chain information
    const tokenAddress = extractTokenAddressFromCaip10(caip10Token);
    const sourceChainId = getChainIdFromCaip10(caip10Wallet);
    const sourceChainType = getChainTypeFromChainId(sourceChainId);
    const isCrossChain = isCrossChainOrder(sourceChainId, targetChainId);
    
    // No balance check required - users can place orders without depositing first
    // Vincent will handle the actual deposits when orders match
    console.log(`Creating order for user ${ethAddress}: ${amount} ${symbol} at price ${price}`);

    let newOrder = new Order({
      // Basic order information
      amount,
      side,
      price,
      symbol,
      remainingAmount: amount,
      status: 'PENDING',
      
      // User information
      caip10Wallet,
      ethAddress,
      
      // Token information
      caip10Token,
      tokenAddress,
      tokenSymbol: symbol.split('/')[0], // Extract token symbol from trading pair
      
      // Chain information
      sourceChainId,
      sourceChainType,
      targetChainId,
      targetChainType: targetChainId ? getChainTypeFromChainId(targetChainId) : undefined,
      
      // Cross-chain specific fields
      isCrossChain,
      targetTokenAddress,
      targetTokenSymbol,
      
      // Order execution
      filledAmount: 0,
      
      metadata,
    });

    // Save the new order first
    await newOrder.save();

    // Process order matching without transactions
    const { matchedAmount, trades } = await processOrderMatchingWithoutTransaction(newOrder);
    
    // Update the order with matching results if any matches occurred
    if (matchedAmount > 0) {
      const newRemainingAmount = newOrder.remainingAmount - matchedAmount;
      const newFilledAmount = newOrder.filledAmount + matchedAmount;
      const newStatus = newRemainingAmount <= 0 ? 'FILLED' : 'PARTIALLY_FILLED';
      
      await Order.updateOne(
        { _id: newOrder._id },
        { 
          remainingAmount: newRemainingAmount,
          filledAmount: newFilledAmount,
          status: newStatus
        }
      );
      
      // Update the local object for response
      newOrder.remainingAmount = newRemainingAmount;
      newOrder.filledAmount = newFilledAmount;
      newOrder.status = newStatus;
    }

    // Return enhanced order information
    return res.status(201).json({ 
      data: newOrder, 
      matchedAmount, 
      trades, 
      success: true,
      isCrossChain,
      chainInfo: {
        source: { chainId: sourceChainId, type: sourceChainType },
        target: targetChainId ? { chainId: targetChainId, type: getChainTypeFromChainId(targetChainId) } : null
      },
      message: 'Order placed successfully. Vincent will handle deposits when matched.'
    });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return res.status(500).json({ error: 'Failed to create order', success: false, details: error.message });
  }
};

export const handleGetOrderRoute = async (req: VincentAuthenticatedRequest, res: Response) => {
    const { ethAddress } = getPKPInfo(req.user.decodedJWT);
    const { orderId } = req.params;

    const order = await Order.findOne({ 
      _id: orderId, 
      $or: [
        { caip10Wallet: ethAddress },
        { caip10Wallet: { $regex: ethAddress, $options: 'i' } }
      ]
    }).lean();

    if (!order) {
        res.status(404).json({ error: `Order with ID ${orderId} not found for wallet address ${ethAddress}` });
        return;
    }

    res.json({ data: order, success: true });
}

export const handleCancelOrderRoute = async (req: VincentAuthenticatedRequest, res: Response) => {
  const { ethAddress } = getPKPInfo(req.user.decodedJWT);
  const { orderId } = req.params; // Validated by Zod middleware

  try {
    const order = await Order.findOne({
      _id: orderId,
      $or: [
        { caip10Wallet: ethAddress },
        { caip10Wallet: { $regex: ethAddress, $options: 'i' } }
      ],
      status: 'PENDING', // Only PENDING orders can be cancelled
    });

    if (!order) {
      return res.status(404).json({ error: `Order with ID ${orderId} not found, already completed, or already cancelled for wallet ${ethAddress}.`, success: false });
    }

    order.status = 'CANCELED';
    order.remainingAmount = 0; // No remaining amount after cancellation
    await order.save();

    res.status(200).json({ data: order, message: 'Order cancelled successfully', success: true });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Failed to cancel order', success: false });
  }
};

/**
 * Get order book (bids and asks) for a trading pair
 * GET /api/orders/orderbook/:symbol
 */
export const handleGetOrderBookRoute = async (req: VincentAuthenticatedRequest, res: Response) => {
  try {
    const { symbol } = req.params;
    const { limit = '20', includeCrossChain = 'true' } = req.query;

    if (!symbol) {
      return res.status(400).json({
        error: 'Symbol parameter is required',
        success: false,
      });
    }

    const limitNum = parseInt(limit as string);
    const includeCrossChainBool = includeCrossChain === 'true';

    // Build query for active orders
    const baseQuery: any = {
      symbol,
      status: { $in: ['PENDING', 'PARTIALLY_FILLED'] },
    };

    if (!includeCrossChainBool) {
      baseQuery.isCrossChain = false;
    }

    // Get buy orders (bids) - sorted by price descending (highest first)
    const buyOrders = await Order.find({
      ...baseQuery,
      side: 'BUY',
    })
      .sort({ price: -1, createdAt: 1 })
      .limit(limitNum)
      .lean();

    // Get sell orders (asks) - sorted by price ascending (lowest first)
    const sellOrders = await Order.find({
      ...baseQuery,
      side: 'SELL',
    })
      .sort({ price: 1, createdAt: 1 })
      .limit(limitNum)
      .lean();

    // Calculate market depth
    const bids = buyOrders.map(order => ({
      price: order.price,
      amount: order.remainingAmount,
      total: order.remainingAmount * order.price,
      chainInfo: {
        source: { chainId: order.sourceChainId, type: order.sourceChainType },
        target: order.targetChainId ? { chainId: order.targetChainId, type: order.targetChainType } : null
      },
      isCrossChain: order.isCrossChain,
      createdAt: order.createdAt,
    }));

    const asks = sellOrders.map(order => ({
      price: order.price,
      amount: order.remainingAmount,
      total: order.remainingAmount * order.price,
      chainInfo: {
        source: { chainId: order.sourceChainId, type: order.sourceChainType },
        target: order.targetChainId ? { chainId: order.targetChainId, type: order.targetChainType } : null
      },
      isCrossChain: order.isCrossChain,
      createdAt: order.createdAt,
    }));

    // Calculate best bid and ask
    const bestBid = bids.length > 0 ? bids[0] : null;
    const bestAsk = asks.length > 0 ? asks[0] : null;
    const spread = bestBid && bestAsk ? bestAsk.price - bestBid.price : null;
    const spreadPercentage = spread && bestBid ? (spread / bestBid.price) * 100 : null;

    res.json({
      success: true,
      data: {
        symbol,
        bids,
        asks,
        bestBid,
        bestAsk,
        spread,
        spreadPercentage,
        timestamp: new Date().toISOString(),
        includeCrossChain: includeCrossChainBool,
      }
    });
  } catch (error: any) {
    console.error('Error getting order book:', error);
    return res.status(500).json({
      error: 'Failed to get order book',
      success: false,
      details: error.message,
    });
  }
};
