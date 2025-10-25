import { env } from '../../../../env';
import {
  getErc20ApprovalToolClient,
  getBungeeClient,
  getUniswapToolClient,
  getDebridgeClient,
  getSponsorClient,
} from '../../executeDCASwap/vincentAbilities';

type OpResult = {
  [k: string]: any;
  id?: string;
  opId?: string;
  operationId?: string;
  rawTx?: string;
  requiresSponsorship?: boolean;
  txHash?: string;
};

function safeCall(client: any, methods: string[], args: any) {
  if (!client) return null;
  for (const m of methods) {
    if (typeof client[m] === 'function') {
      return client[m](args);
    }
  }
  return null;
}

export async function approveIfNeeded(params: {
  amount: string;
  from: string;
  token: string;
}): Promise<OpResult | null> {
  const approvalClient = getErc20ApprovalToolClient?.() ?? getErc20ApprovalToolClient?.();
  if (!approvalClient) return null;

  return (
    safeCall(approvalClient, ['createApproval', 'approve', 'sendApproval'], {
      amount: params.amount,
      owner: params.from,
      token: params.token,
    }) ?? null
  );
}

export async function swapIfNeeded(params: {
  amountIn: string;
  from: string;
  path?: string[];
}): Promise<OpResult | null> {
  if (!params.path || params.path.length === 0) return null;
  const swapClient = getUniswapToolClient?.();
  if (!swapClient) return null;

  return (
    safeCall(swapClient, ['createSwap', 'swap', 'executeSwap'], {
      amountIn: params.amountIn,
      owner: params.from,
      path: params.path,
    }) ?? null
  );
}

export async function bridge(params: {
  amount: string;
  asset: string;
  bridge?: 'debridge' | 'bungee';
  from: string;
  to: string;
}): Promise<OpResult> {
  const prefer = params.bridge ?? (env.VINCENT_BRIDGE_PREFERRED as 'debridge' | 'bungee');

  if (prefer === 'bungee') {
    const bungee = getBungeeClient?.();
    if (!bungee) throw new Error('Bungee ability client not available');
    return (
      safeCall(bungee, ['createBridge', 'bridge', 'sendBridge'], {
        amount: params.amount,
        from: params.from,
        to: params.to,
        token: params.asset,
      }) ?? {}
    );
  }

  const debridge = getDebridgeClient?.();
  if (!debridge) throw new Error('Debridge ability client not available');
  return (
    safeCall(debridge, ['createBridge', 'bridge', 'sendBridge'], {
      amount: params.amount,
      from: params.from,
      to: params.to,
      token: params.asset,
    }) ?? {}
  );
}

export async function sponsorIfNeeded(opId: string): Promise<OpResult | null> {
  const sponsor = getSponsorClient?.();
  if (!sponsor) return null;

  return safeCall(sponsor, ['sponsor', 'sponsorOperation', 'createSponsorship'], { opId });
}
