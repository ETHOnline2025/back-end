// mongo/models/Trade.ts (create this file)
import mongoose, { Schema, Document } from 'mongoose';

export interface ITrade extends Document {
  buyOrderId: mongoose.Types.ObjectId;
  sellOrderId: mongoose.Types.ObjectId;
  price: number;
  amount: number;
  executedAt: Date;
  status: 'COMPLETED' | 'PENDING' | 'FAILED'; // Adjust as needed
  // You might add references to the caip10Wallet of buyer/seller here for easier querying
  buyerCaip10Wallet: string;
  sellerCaip10Wallet: string;
  symbol: string;
}

export const TradeSchema = new Schema<ITrade>({
  buyOrderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  sellOrderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  price: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0.000000000000000001 },
  executedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['COMPLETED', 'PENDING', 'FAILED'], default: 'COMPLETED', required: true },
  buyerCaip10Wallet: { type: String, required: true, trim: true },
  sellerCaip10Wallet: { type: String, required: true, trim: true },
  symbol: { type: String, required: true, uppercase: true, trim: true },
});

// Indexes for faster trade history retrieval
TradeSchema.index({ executedAt: -1 }); // Most recent trades first
TradeSchema.index({ symbol: 1, executedAt: -1 }); // Trades for a specific symbol
TradeSchema.index({ buyerCaip10Wallet: 1, executedAt: -1 });
TradeSchema.index({ sellerCaip10Wallet: 1, executedAt: -1 });

export const Trade = mongoose.model<ITrade>('Trade', TradeSchema);