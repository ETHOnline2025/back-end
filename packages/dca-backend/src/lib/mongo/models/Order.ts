import mongoose, { Schema} from 'mongoose';
export interface IOrder extends mongoose.Document {
  amount: number;
  side: 'BUY' | 'SELL';
  price: number;
  caip10Token: string;
  caip10Wallet: string;
  symbol: string;
  remainingAmount: number;
  status: 'OPEN' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED';
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}
export const OrderSchema = new Schema({
  amount: { type: Number, required: true },
  side: { type: String, enum: ['BUY', 'SELL'], required: true },
  price: { type: Number, required: true },
  caip10Token: { type: String, required: true },
  caip10Wallet: { type: String, required: true },
  symbol: { type: String, required: true },
  remainingAmount: { type: Number, required: true },
  status: { // "OPEN", "PARTIALLY_FILLED", "FILLED", "CANCELED"
        type: String,
        enum: ['OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELED'],
        default: 'OPEN'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  metadata: { type: Object},
});

export const Order = mongoose.model('Order', OrderSchema);