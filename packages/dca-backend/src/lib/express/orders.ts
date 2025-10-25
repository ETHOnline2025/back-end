import { Response } from 'express';

import { getPKPInfo } from '@lit-protocol/vincent-app-sdk/jwt';

import { VincentAuthenticatedRequest } from './types';
import { Order } from '../mongo/models/Order';
import mongoose from 'mongoose';
import { processOrderMatching } from '../agenda/jobs/matchinEngine/processMatching';

export const handleListOrdersRoute = async (req: VincentAuthenticatedRequest, res: Response) => {
  const { ethAddress } = getPKPInfo(req.user.decodedJWT);

  const orders = await Order.find({ ethAddress })
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
export const handleCreateOrderRoute = async (req: VincentAuthenticatedRequest, res: Response) => {
  const { ethAddress } = getPKPInfo(req.user.decodedJWT);
  // req.body is already validated by Zod middleware
  const { amount, side, price, caip10Token, symbol, metadata } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let newOrder = new Order({
      amount,
      side,
      price,
      caip10Token,
      caip10Wallet: ethAddress, // Taken from JWT
      symbol,
      remainingAmount: amount, // Initially, remaining amount is the full amount
      status: 'PENDING', // All new orders start as PENDING
      metadata,
    });

    const { matchedAmount, newOrder: updatedNewOrderAfterMatch, trades } = await processOrderMatching(newOrder, session);
    newOrder = updatedNewOrderAfterMatch; // Use the updated newOrder object after matching

    // Save the new order (or updated new order after matching)
    await newOrder.save({ session });

    await session.commitTransaction();
    session.endSession();

    // You might want to return trades along with the order
    res.status(201).json({ data: newOrder, matchedAmount, trades, success: true });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: 'Failed to create order', success: false });
  }
};
export const handleGetOrderRoute = async (req: VincentAuthenticatedRequest, res: Response) => {
    const { ethAddress } = getPKPInfo(req.user.decodedJWT);
    const { orderId } = req.params;

    const order = await Order.findOne({ _id: orderId, ethAddress }).lean();

    if (!order) {
        res.status(404).json({ error: `Order with ID ${orderId} not found for wallet address ${ethAddress}` });
        return;
    }

    res.json({ data: order, success: true });
}


export const handleCancelOrderRoute = async (req: VincentAuthenticatedRequest, res: Response) => {
  const { ethAddress } = getPKPInfo(req.user.decodedJWT);
  const { orderId } = req.params; // Validated by Zod middleware

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findOne({
      _id: orderId,
      caip10Wallet: ethAddress,
      status: 'PENDING', // Only PENDING orders can be cancelled
    }).session(session);

    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: `Order with ID ${orderId} not found, already completed, or already cancelled for wallet ${ethAddress}.`, success: false });
    }

    order.status = 'CANCELED';
    order.remainingAmount = 0; // No remaining amount after cancellation
    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ data: order, message: 'Order cancelled successfully', success: true });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Failed to cancel order', success: false });
  }
};