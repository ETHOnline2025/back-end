import mongoose, { Schema} from 'mongoose';

export interface IOrder extends mongoose.Document {
  // Basic order information
  amount: number;
  side: 'BUY' | 'SELL';
  price: number;
  symbol: string;
  remainingAmount: number;
  status: 'PENDING' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED';
  
  // User information
  caip10Wallet: string;
  ethAddress: string; // Extracted for easier querying
  
  // Token information
  caip10Token: string;
  tokenAddress: string; // Extracted token address
  tokenSymbol?: string; // Token symbol for display
  
  // Chain information
  sourceChainId: number; // Chain where user deposited funds
  sourceChainType: 'NATIVE' | 'OTHER'; // Chain type (Base/Ethereum vs Solana)
  targetChainId?: number; // Chain where user wants to receive tokens (for cross-chain orders)
  targetChainType?: 'NATIVE' | 'OTHER'; // Target chain type
  
  // Cross-chain specific fields
  isCrossChain: boolean; // Whether this is a cross-chain order
  targetTokenAddress?: string; // Token address on target chain
  targetTokenSymbol?: string; // Token symbol on target chain
  
  // Order execution
  filledAmount: number; // Total amount filled so far
  averageFillPrice?: number; // Average price of fills
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Optional metadata
  metadata?: Record<string, any>;
}
export const OrderSchema = new Schema({
  // Basic order information
  amount: { type: Number, required: true },
  side: { type: String, enum: ['BUY', 'SELL'], required: true },
  price: { type: Number, required: true },
  symbol: { type: String, required: true },
  remainingAmount: { type: Number, required: true },
  status: { 
    type: String,
    enum: ['PENDING', 'PARTIALLY_FILLED', 'FILLED', 'CANCELED'],
    default: 'PENDING'
  },
  
  // User information
  caip10Wallet: { type: String, required: true, index: true },
  ethAddress: { 
    type: String, 
    required: true, 
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/,
    index: true 
  },
  
  // Token information
  caip10Token: { type: String, required: true, index: true },
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
  
  // Order execution
  filledAmount: { type: Number, default: 0 },
  averageFillPrice: { type: Number },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  
  // Optional metadata
  metadata: { type: Object },
});

// Create indexes for efficient querying
OrderSchema.index({ symbol: 1, side: 1, status: 1, price: 1 }); // Order book queries
OrderSchema.index({ caip10Wallet: 1, createdAt: -1 }); // User orders by date
OrderSchema.index({ ethAddress: 1, createdAt: -1 }); // User orders by ETH address
OrderSchema.index({ isCrossChain: 1, status: 1 }); // Cross-chain orders
OrderSchema.index({ sourceChainId: 1, targetChainId: 1 }); // Chain-specific queries
OrderSchema.index({ status: 1, createdAt: 1 }); // Order status queries
OrderSchema.index({ symbol: 1, side: 1, price: 1, createdAt: 1 }); // Price-time priority

// Update the updatedAt field before saving
OrderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Order = mongoose.model('Order', OrderSchema);