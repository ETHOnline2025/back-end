import mongoose, { Schema, Document } from 'mongoose';

export interface IDeposit extends Document {
  // User identification
  caip10Wallet: string; // eip155:CHAIN_ID:ADDRESS format
  ethAddress: string; // Extracted ETH address for easier querying
  
  // Token information
  caip10Token: string; // eip155:CHAIN_ID:TOKEN_ADDRESS format
  tokenAddress: string; // Extracted token address
  tokenSymbol?: string; // Optional token symbol for display
  
  // Deposit details
  amount: string; // Deposit amount as string to handle large numbers
  action: number; // 0 = Native chain (Base/Ethereum), 1 = Other chains (Solana)
  chainType: 'NATIVE' | 'OTHER'; // Human readable chain type
  
  // Transaction information
  txHash?: string; // Transaction hash if available
  blockNumber?: number; // Block number if available
  
  // Status tracking
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  
  // Contract interaction
  contractAddress: string; // Trading contract address used
  chainId: number; // Chain ID where deposit was made
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Optional metadata
  metadata?: Record<string, any>;
}

export const DepositSchema = new Schema<IDeposit>({
  // User identification
  caip10Wallet: { 
    type: String, 
    required: true, 
    trim: true,
    index: true 
  },
  ethAddress: { 
    type: String, 
    required: true, 
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/,
    index: true 
  },
  
  // Token information
  caip10Token: { 
    type: String, 
    required: true, 
    trim: true,
    index: true 
  },
  tokenAddress: { 
    type: String, 
    required: true, 
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/,
    index: true 
  },
  tokenSymbol: { 
    type: String, 
    trim: true,
    uppercase: true 
  },
  
  // Deposit details
  amount: { 
    type: String, 
    required: true,
    validate: {
      message: 'Amount must be a valid decimal number',
      validator(v: string) {
        return /^\d*\.?\d+$/.test(v);
      },
    },
  },
  action: { 
    type: Number, 
    required: true,
    enum: [0, 1], // 0 = Native chain, 1 = Other chains
    index: true 
  },
  chainType: { 
    type: String, 
    required: true,
    enum: ['NATIVE', 'OTHER'],
    index: true 
  },
  
  // Transaction information
  txHash: { 
    type: String, 
    sparse: true,
    unique: true,
    trim: true 
  },
  blockNumber: { 
    type: Number, 
    min: 0 
  },
  
  // Status tracking
  status: { 
    type: String, 
    enum: ['PENDING', 'CONFIRMED', 'FAILED'], 
    default: 'PENDING',
    required: true,
    index: true 
  },
  
  // Contract interaction
  contractAddress: { 
    type: String, 
    required: true, 
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/,
    index: true 
  },
  chainId: { 
    type: Number, 
    required: true,
    index: true 
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  
  // Optional metadata
  metadata: { type: Object },
});

// Create indexes for common query patterns
DepositSchema.index({ caip10Wallet: 1, createdAt: -1 }); // User deposits by date
DepositSchema.index({ caip10Token: 1, createdAt: -1 }); // Deposits by token
DepositSchema.index({ chainType: 1, createdAt: -1 }); // Deposits by chain type
DepositSchema.index({ status: 1, createdAt: -1 }); // Deposits by status
DepositSchema.index({ contractAddress: 1, chainId: 1 }); // Deposits by contract and chain
DepositSchema.index({ ethAddress: 1, tokenAddress: 1 }); // User deposits for specific token

// Update the updatedAt field before saving
DepositSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Deposit = mongoose.model<IDeposit>('Deposit', DepositSchema);
