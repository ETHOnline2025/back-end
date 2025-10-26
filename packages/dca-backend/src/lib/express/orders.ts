import { Request, Response } from 'express';

import { Order } from '../mongo/models/Order';
import { Trade } from '../mongo/models/Trade';
import mongoose from 'mongoose';

// Simplified order matching function without transactions
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
      if (existingOrder.remainingAmount <= 0) {
        existingOrder.status = 'FILLED';
      } else {
        existingOrder.status = 'PARTIALLY_FILLED';
      }
      await existingOrder.save();

      // Update the new order's remaining amount
      remainingNewOrderAmount -= fillAmount;
      matchedAmount += fillAmount;

      // Record the trade
      const trade = new Trade({
        buyOrderId: newOrder.side === 'BUY' ? newOrder._id : existingOrder._id,
        sellOrderId: newOrder.side === 'SELL' ? newOrder._id : existingOrder._id,
        price: existingOrder.price,
        amount: fillAmount,
        buyerCaip10Wallet: newOrder.side === 'BUY' ? newOrder.caip10Wallet : existingOrder.caip10Wallet,
        sellerCaip10Wallet: newOrder.side === 'SELL' ? newOrder.caip10Wallet : existingOrder.caip10Wallet,
        symbol: newOrder.symbol,
        status: 'COMPLETED',
      });
      await trade.save();
      trades.push(trade);

      console.log(`Matched ${fillAmount} of new order (${newOrder._id}) with existing order (${existingOrder._id}).`);
    }
  }

  return { matchedAmount, trades };
};

export const handleListOrdersRoute = async (req: Request, res: Response) => {
  const { ethAddress } = req.query;

  if (!ethAddress || typeof ethAddress !== 'string') {
    res.status(400).json({ error: 'ethAddress query parameter is required' });
    return;
  }

  // Search for orders where caip10Wallet contains the ethAddress
  // This handles both formats: "0xabc123..." and "eip155:1:0xabc123..."
  const orders = await Order.find({ 
    $or: [
      { caip10Wallet: ethAddress },
      { caip10Wallet: { $regex: ethAddress, $options: 'i' } }
    ]
  })
    .sort({
      createdAt: -1,
    })
    .lean();

  if (orders.length === 0) {
    res.status(404).json({ error: `No orders found for wallet address ${ethAddress}` });
    return;
  }

  res.json({ data: orders, success: true });
};
export const handleCreateOrderRoute = async (req: Request, res: Response) => {
  const { ethAddress } = req.body;

  if (!ethAddress || typeof ethAddress !== 'string') {
    res.status(400).json({ error: 'ethAddress is required in request body' });
    return;
  }

  // req.body is validated by Zod middleware
  const { amount, side, price, caip10Token, caip10Wallet, symbol, metadata } = req.body;

  try {
    let newOrder = new Order({
      amount,
      side,
      price,
      caip10Token,
      caip10Wallet, // Use the caip10Wallet from request body
      symbol,
      remainingAmount: amount, // Initially, remaining amount is the full amount
      status: 'PENDING', // All new orders start as PENDING
      metadata,
    });

    // Save the new order first
    await newOrder.save();

    // Process order matching without transactions
    const { matchedAmount, trades } = await processOrderMatchingWithoutTransaction(newOrder);
    
    // Update the order with matching results if any matches occurred
    if (matchedAmount > 0) {
      newOrder.remainingAmount -= matchedAmount;
      if (newOrder.remainingAmount <= 0) {
        newOrder.status = 'FILLED';
      } else {
        newOrder.status = 'PARTIALLY_FILLED';
      }
      await newOrder.save();
    }

    // You might want to return trades along with the order
    res.status(201).json({ data: newOrder, matchedAmount, trades, success: true });
  } catch (error: any) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order', success: false, details: error.message });
  }
};
export const handleGetOrderRoute = async (req: Request, res: Response) => {
    const { ethAddress } = req.query;
    const { orderId } = req.params;

    if (!ethAddress || typeof ethAddress !== 'string') {
        res.status(400).json({ error: 'ethAddress query parameter is required' });
        return;
    }

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


export const handleCancelOrderRoute = async (req: Request, res: Response) => {
  const { ethAddress } = req.query;
  const { orderId } = req.params; // Validated by Zod middleware

  if (!ethAddress || typeof ethAddress !== 'string') {
    res.status(400).json({ error: 'ethAddress query parameter is required' });
    return;
  }

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