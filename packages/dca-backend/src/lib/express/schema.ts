import { Types } from 'mongoose';
import { z } from 'zod';

export const ScheduleParamsSchema = z.object({
  app: z.object({
    id: z.number(),
    version: z.number(),
  }),
  name: z.string().default('DCASwap'),
  pkpInfo: z.object({
    ethAddress: z
      .string()
      .refine((val) => /^0x[a-fA-F0-9]{40}$/.test(val), { message: 'Invalid Ethereum address' }),
    publicKey: z.string(),
    tokenId: z.string(),
  }),
  purchaseAmount: z
    .string()
    .refine((val) => /^\d+(\.\d{1,2})?$/.test(val), {
      message: 'Must be a valid decimal number with up to 2 decimal places (USD currency)',
    })
    .transform((val) => parseFloat(val)),
  purchaseIntervalHuman: z.string(),
});
export const ScheduleIdentitySchema = z.object({
  scheduleId: z
    .string()
    .refine((val) => Types.ObjectId.isValid(val), { message: 'Invalid ObjectId' }),
});

export const OrderCreateSchema = z.object({
  amount: z
    .number({
      required_error: 'Amount is required.',
      invalid_type_error: 'Amount must be a number.',
    })
    .positive('Amount must be positive.'),
  side: z.union([z.literal('BUY'), z.literal('SELL')], {
    required_error: 'Side is required and must be BUY or SELL.',
    invalid_type_error: 'Side must be "BUY" or "SELL".',
  }),
  price: z
    .number({
      required_error: 'Price is required.',
      invalid_type_error: 'Price must be a number.',
    })
    .positive('Price must be positive.'),
  caip10Token: z.string({
    required_error: 'CAIP-10 Token is required.',
    invalid_type_error: 'CAIP-10 Token must be a string.',
  }).min(1, 'CAIP-10 Token cannot be empty.'), // Example: "eip155:1/erc20:0x..."
  caip10Wallet: z.string({
    required_error: 'CAIP-10 Wallet is required.',
    invalid_type_error: 'CAIP-10 Wallet must be a string.',
  }).min(1, 'CAIP-10 Wallet cannot be empty.'), // Example: "eip155:1:0x..."
  metadata: z.record(z.any()).optional(), // Optional metadata object
});

/**
 * Zod schema for identifying an existing order by its ID.
 * Useful for routes like GET /orders/:orderId or DELETE /orders/:orderId.
 */
export const OrderIdentitySchema = z.object({
  orderId: z
    .string()
    .refine((val) => Types.ObjectId.isValid(val), { message: 'Invalid Order ID (ObjectId)' }),
});


/**
 * Zod schema for the full structure of an Order as it would be stored in the database.
 * This extends `OrderCreateSchema` and adds database-managed fields.
 */
export const OrderSchema = OrderCreateSchema.extend({
  id: z.string().refine((val) => Types.ObjectId.isValid(val), { message: 'Invalid Order ID' }), // MongoDB _id
  ownerCaip10: z.string().min(1, 'Owner CAIP-10 Wallet cannot be empty.'), // The wallet that owns the order, redundant with caip10Wallet but often kept for clarity
  remaining: z.number().min(0, 'Remaining amount cannot be negative.'),
  status: z.union([
    z.literal('OPEN'),
    z.literal('PARTIALLY_FILLED'),
    z.literal('FILLED'),
    z.literal('CANCELED'),
  ]),
  createdAt: z.preprocess((arg) => {
    if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
    return arg;
  }, z.date()),
  updatedAt: z.preprocess((arg) => {
    if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
    return arg;
  }, z.date()).optional(), // Often auto-updated by mongoose
});