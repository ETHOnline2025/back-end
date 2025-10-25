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

export const CrossChainTransferSchema = z.object({
  amount: z
    .string()
    .refine((val) => /^\d+(\.\d{1,8})?$/.test(val), {
      message: 'Amount must be a valid decimal (up to 8 decimals)',
    })
    .transform((val) => parseFloat(val)),
  app: z
    .object({
      id: z.number(),
      version: z.number(),
    })
    .optional(),
  asset: z.string().min(1, { message: 'Asset must be provided (symbol or token address)' }),
  bridge: z.enum(['debridge', 'bungee']).optional(),
  fromEthAddress: z
    .string()
    .refine((val) => /^0x[a-fA-F0-9]{40}$/.test(val), { message: 'Invalid Ethereum address' }),
  scheduledAt: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        return !Number.isNaN(Date.parse(val));
      },
      { message: 'scheduledAt must be an ISO date string' }
    )
    .optional(),
  toSolAddress: z
    .string()
    .refine((val) => /^[A-Za-z0-9]{32,44}$/.test(val), { message: 'Invalid Solana address' }),
  
  metadata: z.record(z.any()).optional(),
  // optional swap path (token contract addresses or symbols) if you want to swap before bridging
swapPath: z.array(z.string()).optional(),
});

export const CrossChainTransferIdentitySchema = z.object({
  transferId: z
    .string()
    .refine((val) => Types.ObjectId.isValid(val), { message: 'Invalid ObjectId' }),
});
