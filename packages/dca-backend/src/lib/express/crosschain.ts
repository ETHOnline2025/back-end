import { Response } from 'express';

import { getAppInfo, getPKPInfo, isAppUser } from '@lit-protocol/vincent-app-sdk/jwt';

import { CrossChainTransferSchema, CrossChainTransferIdentitySchema } from './schema';
import { VincentAuthenticatedRequest } from './types';
import * as jobManager from '../agenda/jobs/crossChainJobManager';

const { cancelJob, createJob, disableJob, editJob, enableJob, listJobsByEthAddress } = jobManager;

function getDataFromJWT(req: VincentAuthenticatedRequest) {
  if (!isAppUser(req.user.decodedJWT)) {
    throw new Error('Vincent JWT is not an app user');
  }
  const app = getAppInfo(req.user.decodedJWT);
  const pkpInfo = getPKPInfo(req.user.decodedJWT);
  return { app, pkpInfo };
}

export const handleListCrossTransfersRoute = async (
  req: VincentAuthenticatedRequest,
  res: Response
) => {
  const {
    pkpInfo: { ethAddress },
  } = getDataFromJWT(req);

  const transfers = await listJobsByEthAddress({ ethAddress });
  res.json({
    data: transfers.map((t) => (typeof t.toJson === 'function' ? t.toJson() : t)),
    success: true,
  });
};

export const handleCreateCrossTransferRoute = async (
  req: VincentAuthenticatedRequest,
  res: Response
) => {
  const { app, pkpInfo } = getDataFromJWT(req);

  const transferParams = CrossChainTransferSchema.parse({
    ...req.body,
    app: {
      id: app.appId,
      version: app.version,
    },
    fromEthAddress: req.body.fromEthAddress ?? pkpInfo.ethAddress,
  });

  const job = await createJob({ ...transferParams }, { scheduledAt: transferParams.scheduledAt });
  res.status(201).json({ data: job.toJson ? job.toJson() : job, success: true });
};

export const handleEditCrossTransferRoute = async (
  req: VincentAuthenticatedRequest,
  res: Response
) => {
  const { app, pkpInfo } = getDataFromJWT(req);
  const { transferId } = CrossChainTransferIdentitySchema.parse(req.params);

  const transferParams = CrossChainTransferSchema.parse({
    ...req.body,
    app: {
      id: app.appId,
      version: app.version,
    },
    fromEthAddress: req.body.fromEthAddress ?? pkpInfo.ethAddress,
  });

  const job = await editJob({
    transferId,
    data: { ...transferParams },
  });

  res.status(201).json({ data: job.toJson ? job.toJson() : job, success: true });
};

export const handleDisableCrossTransferRoute = async (
  req: VincentAuthenticatedRequest,
  res: Response
) => {
  const {
    pkpInfo: { ethAddress },
  } = getDataFromJWT(req);
  const { transferId } = CrossChainTransferIdentitySchema.parse(req.params);

  const job = await disableJob({ ethAddress, transferId });
  if (!job) {
    res.status(404).json({ error: 'Transfer not found' });
    return;
  }
  res.json({ data: job.toJson ? job.toJson() : job, success: true });
};

export const handleEnableCrossTransferRoute = async (
  req: VincentAuthenticatedRequest,
  res: Response
) => {
  const {
    pkpInfo: { ethAddress },
  } = getDataFromJWT(req);
  const { transferId } = CrossChainTransferIdentitySchema.parse(req.params);

  const job = await enableJob({ ethAddress, transferId });
  res.json({ data: job.toJson ? job.toJson() : job, success: true });
};

export const handleDeleteCrossTransferRoute = async (
  req: VincentAuthenticatedRequest,
  res: Response
) => {
  const {
    pkpInfo: { ethAddress },
  } = getDataFromJWT(req);
  const { transferId } = CrossChainTransferIdentitySchema.parse(req.params);

  await cancelJob({ ethAddress, transferId });

  res.json({ success: true });
};
