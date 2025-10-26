import mongoose from 'mongoose'; // Import mongoose for sessions

import { IOrder, Order } from '../../../mongo/models/Order';
import { ITrade, Trade } from '../../../mongo/models/Trade'; // Import Trade model

// Helper function to process order matching
export const processOrderMatching = async (newOrder: IOrder, session: mongoose.ClientSession): Promise<{ matchedAmount: number; newOrder: IOrder; trades: ITrade[] }> => {
  let matchedAmount = 0;
  const trades: ITrade[] = [];
  let remainingNewOrderAmount = newOrder.amount; // Start with the new order's full amount
  let newOrderStatus: IOrder['status'] = 'PENDING'; // Default status if no matches

  const oppositeSide = newOrder.side === 'BUY' ? 'SELL' : 'BUY';

  // Find potential matching orders
  const query: mongoose.FilterQuery<IOrder> = {
    symbol: newOrder.symbol,
    side: oppositeSide,
    status: { $in: ['PENDING'] }, // Only match with PENDING orders
  };

  if (newOrder.side === 'BUY') {
    // For a BUY order, find SELL orders with price <= newOrder.price (lowest ask first)
    query.price = { $lte: newOrder.price };
    query.sort = { price: 1, createdAt: 1 }; // Ascending price, then oldest first
  } else {
    // For a SELL order, find BUY orders with price >= newOrder.price (highest bid first)
    query.price = { $gte: newOrder.price };
    query.sort = { price: -1, createdAt: 1 }; // Descending price, then oldest first
  }

  // Find potential matches, sorted by price and time priority
  const potentialMatches = await Order.find(query)
    .sort(query.sort)
    .session(session) // Crucial: operations in a transaction must use the session
    .lean(); // Use lean() for faster retrieval if we're just reading to process

  for (const existingOrderDoc of potentialMatches) {
    if (remainingNewOrderAmount <= 0) {
      newOrderStatus = 'FILLED'; // New order is fully filled
      break;
    }

    // Convert lean document back to Mongoose document to update and save
    const existingOrder = await Order.findById(existingOrderDoc._id).session(session);
    if (!existingOrder) continue; // Should not happen in a transaction, but good safeguard

    const fillAmount = Math.min(existingOrder.remainingAmount, remainingNewOrderAmount);

    if (fillAmount > 0) {
      // Update the existing order
      existingOrder.remainingAmount -= fillAmount;
      if (existingOrder.remainingAmount <= 0) {
        existingOrder.status = 'FILLED';
      } else {
        existingOrder.status = 'PARTIALLY_FILLED'; // Still partially filled, status remains PENDING
      }
      await existingOrder.save({ session }); // Save existing order within the session

      // Update the new order's remaining amount
      remainingNewOrderAmount -= fillAmount;
      matchedAmount += fillAmount;

      // Record the trade
      const trade = new Trade({
        buyOrderId: newOrder.side === 'BUY' ? newOrder._id : existingOrder._id,
        sellOrderId: newOrder.side === 'SELL' ? newOrder._id : existingOrder._id,
        price: existingOrder.price, // Or newOrder.price depending on your exchange's price rule (taker vs maker)
        amount: fillAmount,
        buyerCaip10Wallet: newOrder.side === 'BUY' ? newOrder.caip10Wallet : existingOrder.caip10Wallet,
        sellerCaip10Wallet: newOrder.side === 'SELL' ? newOrder.caip10Wallet : existingOrder.caip10Wallet,
        symbol: newOrder.symbol,
        status: 'COMPLETED',
      });
      await trade.save({ session });
      trades.push(trade);

      console.log(`Matched ${fillAmount} of new order (${newOrder._id}) with existing order (${existingOrder._id}).`);
      console.log(`New order remaining: ${remainingNewOrderAmount}`);
      console.log(`Existing order remaining: ${existingOrder.remainingAmount}`);
    }
  }

  // Update newOrder's status based on matching
  if (matchedAmount > 0 && remainingNewOrderAmount === 0) {
    newOrderStatus = 'FILLED'; // Fully filled
  } else if (matchedAmount > 0 && remainingNewOrderAmount > 0) {
    newOrderStatus = 'PARTIALLY_FILLED'; // Partially filled, still active
  }

  // Return the updated remaining amount and determined status for the new order
  newOrder.remainingAmount = remainingNewOrderAmount;
  newOrder.status = newOrderStatus;

  return { matchedAmount, newOrder, trades };
};