// mongo/models/Trade.ts (create this file)
import mongoose, { Schema, Document } from 'mongoose';

export interface ITrade extends Document {
  buyOrderId: mongoose.Types.ObjectId;
  sellOrderId: mongoose.Types.ObjectId;
  price: number;
  amount: number;
  executedAt: Date;
  status: 'COMPLETED' | 'PENDING' | 'FAILED'; // Adjust as needed
  
  // User information
  buyerCaip10Wallet: string;
  sellerCaip10Wallet: string;
  buyerEthAddress: string; // Extracted for easier querying
  sellerEthAddress: string; // Extracted for easier querying
  
  // CAIP10 tokens for smart contract
  buyerCaip10Token: string;
  sellerCaip10Token: string;
  
  // Token information
  symbol: string;
  tokenAddress: string; // Token being traded
  tokenSymbol?: string; // Token symbol for display
  
  // Chain information
  sourceChainId: number; // Chain where trade originated
  sourceChainType: 'NATIVE' | 'OTHER';
  targetChainId?: number; // Chain where tokens are delivered (for cross-chain)
  targetChainType?: 'NATIVE' | 'OTHER';
  
  // Cross-chain specific fields
  isCrossChain: boolean; // Whether this is a cross-chain trade
  targetTokenAddress?: string; // Token address on target chain
  targetTokenSymbol?: string; // Token symbol on target chain
  
  // Trade execution details
  fillPrice: number; // Actual price at which trade was executed
  totalValue: number; // Total value of the trade (amount * price)
  
  // Transaction information
  sourceTxHash?: string; // Transaction hash on source chain
  targetTxHash?: string; // Transaction hash on target chain (for cross-chain)
  
  // Optional metadata
  metadata?: Record<string, any>;
}

export const TradeSchema = new Schema<ITrade>({
  buyOrderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  sellOrderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  price: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0.000000000000000001 },
  executedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['COMPLETED', 'PENDING', 'FAILED'], default: 'COMPLETED', required: true },
  
  // User information
  buyerCaip10Wallet: { type: String, required: true, trim: true, index: true },
  sellerCaip10Wallet: { type: String, required: true, trim: true, index: true },
  buyerEthAddress: { 
    type: String, 
    required: true, 
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/,
    index: true 
  },
  sellerEthAddress: { 
    type: String, 
    required: true, 
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/,
    index: true 
  },
  
  // CAIP10 tokens for smart contract
  buyerCaip10Token: { type: String, required: true, trim: true },
  sellerCaip10Token: { type: String, required: true, trim: true },
  
  // Token information
  symbol: { type: String, required: true, uppercase: true, trim: true, index: true },
  tokenAddress: { 
    type: String, 
    required: true, 
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/,
    index: true 
  },
  tokenSymbol: { type: String, trim: true, uppercase: true },
  
  // Chain information
  sourceChainId: { type: Number, required: true, index: true },
  sourceChainType: { 
    type: String, 
    required: true,
    enum: ['NATIVE', 'OTHER'],
    index: true 
  },
  targetChainId: { type: Number, index: true },
  targetChainType: { 
    type: String,
    enum: ['NATIVE', 'OTHER'],
    index: true 
  },
  
  // Cross-chain specific fields
  isCrossChain: { type: Boolean, default: false, index: true },
  targetTokenAddress: { 
    type: String, 
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/,
    index: true 
  },
  targetTokenSymbol: { type: String, trim: true, uppercase: true },
  
  // Trade execution details
  fillPrice: { type: Number, required: true, min: 0 },
  totalValue: { type: Number, required: true, min: 0 },
  
  // Transaction information
  sourceTxHash: { type: String, sparse: true, unique: true, trim: true },
  targetTxHash: { type: String, sparse: true, trim: true },
  
  // Optional metadata
  metadata: { type: Object },
});

// Indexes for faster trade history retrieval
TradeSchema.index({ executedAt: -1 }); // Most recent trades first
TradeSchema.index({ symbol: 1, executedAt: -1 }); // Trades for a specific symbol
TradeSchema.index({ buyerCaip10Wallet: 1, executedAt: -1 });
TradeSchema.index({ sellerCaip10Wallet: 1, executedAt: -1 });
TradeSchema.index({ buyerEthAddress: 1, executedAt: -1 });
TradeSchema.index({ sellerEthAddress: 1, executedAt: -1 });
TradeSchema.index({ isCrossChain: 1, executedAt: -1 }); // Cross-chain trades
TradeSchema.index({ sourceChainId: 1, targetChainId: 1 }); // Chain-specific trades
TradeSchema.index({ status: 1, executedAt: -1 }); // Trade status queries

export const Trade = mongoose.model<ITrade>('Trade', TradeSchema);