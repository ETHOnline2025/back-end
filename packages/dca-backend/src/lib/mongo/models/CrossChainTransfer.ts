import { Schema, model, Document } from 'mongoose';

export interface ICrossChainTransfer extends Document {
  amount: string;
  asset: string;
  attempts: number;
  completedAt?: Date;
  error?: string;
  fromEthAddress: string;
  scheduledAt?: Date;
  status: 'pending' | 'submitted' | 'finalizing' | 'completed' | 'failed';
  toSolAddress: string;
  txHash?: string;
  vincentOpId?: string;
}

const CrossChainTransferSchema = new Schema<ICrossChainTransfer>(
  {
    amount: { required: true, type: String },
    asset: { required: true, type: String },
    attempts: { default: 0, type: Number },
    completedAt: Date,
    error: String,
    fromEthAddress: { required: true, type: String },
    scheduledAt: Date,
    status: { default: 'pending', type: String },
    toSolAddress: { required: true, type: String },
    txHash: String,
    vincentOpId: String,
  },
  { timestamps: true }
);

export const CrossChainTransfer = model<ICrossChainTransfer>(
  'CrossChainTransfer',
  CrossChainTransferSchema
);
