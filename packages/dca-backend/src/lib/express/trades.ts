import { Response } from 'express';
import { getPKPInfo } from '@lit-protocol/vincent-app-sdk/jwt';
import { VincentAuthenticatedRequest } from './types';
import { Trade } from '../mongo/models/Trade'; // Assuming you have a Trade model

export const handleListTradesRoute = async (req: VincentAuthenticatedRequest, res: Response) => {
  const { ethAddress } = getPKPInfo(req.user.decodedJWT);

  try {
    // Find trades where the authenticated user was either the buyer or seller
    // You'll need to adjust 'caip10Wallet' or similar fields in your Trade model
    // to link trades back to user wallets.
    const trades = await Trade.find({
        $or: [
            { buyCaip10Wallet: ethAddress }, // Assuming Trade has a field for buyer's wallet
            { sellCaip10Wallet: ethAddress }  // Assuming Trade has a field for seller's wallet
        ]
    })
      .sort({ executedAt: -1 }) // Sort by most recent trades
      .lean();

    res.json({ data: trades, success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list trades', success: false });
  }
};