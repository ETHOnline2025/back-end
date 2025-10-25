import { Types } from 'mongoose';

import { CrossChainTransfer } from '../../mongo/models/CrossChainTransfer';
import { getAgenda } from '../agendaClient';

const agendaClient = getAgenda();
type CreateOpts = { interval?: string, scheduledAt?: string | Date; };
type EditArgs = { data: Partial<any>, transferId: string; };
type OwnerCheck = { ethAddress: string; transferId: string };

function toPublic(doc: any) {
  return {
    amount: doc.amount,
    asset: doc.asset,
    createdAt: doc.createdAt,
    enabled: typeof doc.enabled === 'boolean' ? doc.enabled : true,
    fromEthAddress: doc.fromEthAddress,
    id: doc._id?.toString?.() ?? doc.id,
    interval: doc.interval,
    metadata: doc.metadata,
    scheduledAt: doc.scheduledAt,
    status: doc.status,
    toSolAddress: doc.toSolAddress,
    updatedAt: doc.updatedAt,
  };
}

// list by owner
export async function listJobsByEthAddress({ ethAddress }: { ethAddress: string }) {
  const docs = await CrossChainTransfer.find({ fromEthAddress: ethAddress }).sort({
    createdAt: -1,
  });
  return docs.map((d) => ({ ...d.toObject(), toJson: () => toPublic(d) }));
}

// create job + schedule
export async function createJob(data: any, opts: CreateOpts = {}) {
  let scheduledAt: Date | undefined;
  if (opts.scheduledAt) scheduledAt = new Date(opts.scheduledAt);
  else if (data.scheduledAt) scheduledAt = new Date(data.scheduledAt);
  const doc = await CrossChainTransfer.create({
    ...data,
    scheduledAt,
    enabled: typeof data.enabled === 'boolean' ? data.enabled : true,
  });

  const transferId = doc._id.toString();

  if (opts.interval) {
    await agendaClient.every(opts.interval, 'executeCrossChainTransfer', { transferId });
  } else if ((doc as any).interval) {
    await agendaClient.every((doc as any).interval, 'executeCrossChainTransfer', { transferId });
  } else if (doc.scheduledAt) {
    await agendaClient.schedule(doc.scheduledAt, 'executeCrossChainTransfer', { transferId });
  } else {
    await agendaClient.now('executeCrossChainTransfer', { transferId });
  }

  return { ...doc.toObject(), toJson: () => toPublic(doc) };
}

// edit job: update DB and reschedule
export async function editJob({ data, transferId }: EditArgs) {
  if (!Types.ObjectId.isValid(transferId)) throw new Error('Invalid transferId');
  const doc = await CrossChainTransfer.findByIdAndUpdate(transferId, { ...data }, { new: true });
  if (!doc) throw new Error('Transfer not found');

  // cancel existing scheduled jobs for this transfer and reschedule if enabled
  await agendaClient.cancel({ 'data.transferId': transferId });
  const enabled = typeof doc.enabled === 'boolean' ? doc.enabled : true;
  if (enabled) {
    if ((doc as any).interval) {
      await agendaClient.every((doc as any).interval, 'executeCrossChainTransfer', { transferId });
    } else if (doc.scheduledAt) {
      await agendaClient.schedule(doc.scheduledAt, 'executeCrossChainTransfer', { transferId });
    } else {
      await agendaClient.now('executeCrossChainTransfer', { transferId });
    }
  }

  return { ...doc.toObject(), toJson: () => toPublic(doc) };
}

async function _ownerCheck({ ethAddress, transferId }: OwnerCheck) {
  if (!Types.ObjectId.isValid(transferId)) return null;
  const doc = await CrossChainTransfer.findById(transferId);
  if (!doc) return null;
  if (doc.fromEthAddress.toLowerCase() !== ethAddress.toLowerCase()) return null;
  return doc;
}

export async function disableJob({ ethAddress, transferId }: OwnerCheck) {
  const doc = await _ownerCheck({ ethAddress, transferId });
  if (!doc) return null;
  await agendaClient.cancel({ 'data.transferId': transferId });
  doc.enabled = false;
  await doc.save();
  return { ...doc.toObject(), toJson: () => toPublic(doc) };
}

export async function enableJob({ ethAddress, transferId }: OwnerCheck) {
  const doc = await _ownerCheck({ ethAddress, transferId });
  if (!doc) throw new Error('Transfer not found or not owner');
  if (doc.enabled) return { ...doc.toObject(), toJson: () => toPublic(doc) };
  doc.enabled = true;
  await doc.save();

  if ((doc as any).interval) {
    await agendaClient.every((doc as any).interval, 'executeCrossChainTransfer', { transferId });
  } else if (doc.scheduledAt) {
    await agendaClient.schedule(doc.scheduledAt, 'executeCrossChainTransfer', { transferId });
  } else {
    await agendaClient.now('executeCrossChainTransfer', { transferId });
  }
  return { ...doc.toObject(), toJson: () => toPublic(doc) };
}

export async function cancelJob({ ethAddress, transferId }: OwnerCheck) {
  const doc = await _ownerCheck({ ethAddress, transferId });
  if (!doc) return null;
  await agendaClient.cancel({ 'data.transferId': transferId });
  await doc.remove();
  return true;
}
