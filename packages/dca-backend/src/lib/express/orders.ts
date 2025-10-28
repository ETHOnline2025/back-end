import { Response } from 'express';
import { ethers } from 'ethers';
import { getPKPInfo } from '@lit-protocol/vincent-app-sdk/jwt';

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

// Enhanced order matching function with cross-chain support
const processOrderMatchingWithoutTransaction = async (newOrder: any): Promise<{ matchedAmount: number; trades: any[] }> => {
  let matchedAmount = 0;
  const trades: any[] = [];
  let remainingNewOrderAmount = newOrder.amount;

  const oppositeSide = newOrder.side === 'BUY' ? 'SELL' : 'BUY';

  // Find potential matching orders
  const query: any = {
    symbol: newOrder.symbol,
    side: oppositeSide,
    status: 'PENDING', // Only match with PENDING orders
  };

  if (newOrder.side === 'BUY') {
    // For a BUY order, find SELL orders with price <= newOrder.price (lowest ask first)
    query.price = { $lte: newOrder.price };
  } else {
    // For a SELL order, find BUY orders with price >= newOrder.price (highest bid first)
    query.price = { $gte: newOrder.price };
  }

  // Cross-chain matching logic
  if (newOrder.isCrossChain) {
    // For cross-chain orders, we need to match with orders that can fulfill the cross-chain requirement
    // This is a simplified version - in production, you'd have more complex matching logic
    query.isCrossChain = true;
    
    // Match orders that can provide tokens on the target chain
    if (newOrder.targetChainId) {
      query.$or = [
        { targetChainId: newOrder.targetChainId },
        { sourceChainId: newOrder.targetChainId }
      ];
    }
  } else {
    // For same-chain orders, prefer same-chain matches
    query.isCrossChain = false;
  }

  // Find potential matches, sorted by price and time priority
  const sortOrder = newOrder.side === 'BUY' 
    ? { price: 1 as const, createdAt: 1 as const } // Ascending price, then oldest first
    : { price: -1 as const, createdAt: 1 as const }; // Descending price, then oldest first

  const potentialMatches = await Order.find(query)
    .sort(sortOrder)
    .lean();

  for (const existingOrderDoc of potentialMatches) {
    if (remainingNewOrderAmount <= 0) {
      break;
    }

    const existingOrder = await Order.findById(existingOrderDoc._id);
    if (!existingOrder) continue;

    const fillAmount = Math.min(existingOrder.remainingAmount, remainingNewOrderAmount);

    if (fillAmount > 0) {
      // Update the existing order
      existingOrder.remainingAmount -= fillAmount;
      existingOrder.filledAmount += fillAmount;
      
      if (existingOrder.remainingAmount <= 0) {
        existingOrder.status = 'FILLED';
      } else {
        existingOrder.status = 'PARTIALLY_FILLED';
      }
      await existingOrder.save();

      // Update the new order's remaining amount
      remainingNewOrderAmount -= fillAmount;
      matchedAmount += fillAmount;

      // Determine if this is a cross-chain trade
      const isCrossChainTrade = newOrder.isCrossChain || existingOrder.isCrossChain;
      
      // Record the trade with enhanced information
      const trade = new Trade({
        buyOrderId: newOrder.side === 'BUY' ? newOrder._id : existingOrder._id,
        sellOrderId: newOrder.side === 'SELL' ? newOrder._id : existingOrder._id,
        price: existingOrder.price,
        amount: fillAmount,
        fillPrice: existingOrder.price,
        totalValue: fillAmount * existingOrder.price,
        
        // User information
        buyerCaip10Wallet: newOrder.side === 'BUY' ? newOrder.caip10Wallet : existingOrder.caip10Wallet,
        sellerCaip10Wallet: newOrder.side === 'SELL' ? newOrder.caip10Wallet : existingOrder.caip10Wallet,
        buyerEthAddress: newOrder.side === 'BUY' ? newOrder.ethAddress : existingOrder.ethAddress,
        sellerEthAddress: newOrder.side === 'SELL' ? newOrder.caip10Wallet : existingOrder.caip10Wallet,
        
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
      
      // TODO: Trigger Vincent to execute the actual swap
      // This would involve:
      // 1. Vincent deposits required assets to smart contract
      // 2. Smart contract performs the swap
      // 3. Vincent returns exchanged assets to users
      // 4. Update trade status to 'COMPLETED'
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
      newOrder.remainingAmount -= matchedAmount;
      newOrder.filledAmount += matchedAmount;
      
      if (newOrder.remainingAmount <= 0) {
        newOrder.status = 'FILLED';
      } else {
        newOrder.status = 'PARTIALLY_FILLED';
      }
      await newOrder.save();
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
