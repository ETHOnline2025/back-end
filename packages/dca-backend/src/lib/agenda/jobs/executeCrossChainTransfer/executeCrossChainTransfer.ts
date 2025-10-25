// ...existing code...
import axios from 'axios';

import { approveIfNeeded, bridge, sponsorIfNeeded } from './crossChainTransfer/vincentBridge';
import { env } from '../../../env';
import { CrossChainTransfer } from '../../../mongo/models/CrossChainTransfer';
import { waitForUserOperation, waitForTransaction } from '../executeDCASwap/utils';

export async function executeCrossChainTransfer(job: any) {
  const data = job.attrs?.data;
  const transferId = data?.transferId;
  if (!transferId) throw new Error('missing transferId');

  const transfer = await CrossChainTransfer.findById(transferId);
  if (!transfer) throw new Error('transfer not found');

  if (transfer.status === 'completed') return;

  transfer.attempts += 1;
  await transfer.save();

  try {
    // 1) approve if necessary
    // TODO: decide whether approval required for token or wrapper
    await approveIfNeeded({
      amount: transfer.amount,
      from: transfer.fromEthAddress,
      token: transfer.asset,
    });

    // 2) optional swap (e.g. USDC -> bridgeable token)
    // If you don't need swap, send path = []
    // const swapRes = await swapIfNeeded({ from: transfer.fromEthAddress, amountIn: transfer.amount, path: [] });

    // 3) call bridge ability (debridge or bungee)
    transfer.status = 'submitted';
    await transfer.save();

    const bridgeRes: any = await bridge({
      amount: transfer.amount,
      asset: transfer.asset,
      bridge: 'debridge',
      from: transfer.fromEthAddress,
      to: transfer.toSolAddress, // or 'bungee' - choose based on env or transfer record
    });

    // bridgeRes should include an operation id (vincent UserOp id) or transaction
    transfer.vincentOpId = bridgeRes?.operationId ?? bridgeRes?.opId ?? bridgeRes?.id;
    await transfer.save();

    // 4) sponsor if applicable (optional)
    if (bridgeRes?.requiresSponsorship) {
      await sponsorIfNeeded(transfer.vincentOpId as string);
    }

    // 5) wait for user op or tx
    const userOpResult = await waitForUserOperation(transfer.vincentOpId as any);

    // 6) get txHash (if not provided)
    const txHash = userOpResult ?? (await waitForTransaction(userOpResult));
    transfer.txHash = txHash;
    transfer.status = 'finalizing';
    await transfer.save();

    // 7) notify Solana side / call Trading.sol syncUp endpoint to reconcile bookkeeping
    if (env.SOLANA_SYNC_RPC) {
      try {
        await axios.post(
          env.SOLANA_SYNC_RPC,
          {
            amount: transfer.amount,
            asset: transfer.asset,
            ethTx: txHash,
            toSolAddress: transfer.toSolAddress,
            transferId: transfer._id,
          },
          { timeout: 10000 }
        );
      } catch (err) {
        // do not fail hard — log and continue to completion; Solana side can reconcile later.
      }
    }

    transfer.status = 'completed';
    transfer.completedAt = new Date();
    await transfer.save();
  } catch (err: any) {
    transfer.status = 'failed';
    transfer.error = err?.message ?? String(err);
    await transfer.save();
    throw err;
  }
}
