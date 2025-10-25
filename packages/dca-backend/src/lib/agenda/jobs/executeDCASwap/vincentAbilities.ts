import { bundledVincentAbility as bungeeAbility } from '@qwe638853/ability-bungee';
import { bundledVincentAbility as getAbilitySponsorTransactionClient } from '@qwe638853/ability-sponsor-transaction';

import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { bundledVincentAbility as deBridgeAbility } from '@lit-protocol/vincent-ability-debridge';
import { bundledVincentAbility as erc20ApprovalBundledVincentAbility } from '@lit-protocol/vincent-ability-erc20-approval';
import {
  bundledVincentAbility as uniswapSwapBundledVincentAbility,
  getSignedUniswapQuote as getSignedUniswapQuoteAction,
  QuoteParams,
} from '@lit-protocol/vincent-ability-uniswap-swap';
import { getVincentAbilityClient } from '@lit-protocol/vincent-app-sdk/abilityClient';


import { delegateeSigner } from './utils/signer';

const litNodeClient = new LitNodeClient({
  debug: true,
  litNetwork: 'datil',
});

export async function getSignedUniswapQuote(
  quoteParams: QuoteParams
): Promise<ReturnType<typeof getSignedUniswapQuoteAction>> {
  // Ensure litNodeClient is connected
  if (!litNodeClient.ready) {
    await litNodeClient.connect();
  }

  return getSignedUniswapQuoteAction({
    litNodeClient,
    quoteParams,
    ethersSigner: delegateeSigner,
  });
}
export function getDebridgeClient() {
  return getVincentAbilityClient({
    bundledVincentAbility: deBridgeAbility,
    ethersSigner: delegateeSigner, // Your ethers signer
  });
}

export function getErc20ApprovalToolClient() {
  return getVincentAbilityClient({
    bundledVincentAbility: erc20ApprovalBundledVincentAbility,
    ethersSigner: delegateeSigner,
  });
}

export function getUniswapToolClient() {
  return getVincentAbilityClient({
    bundledVincentAbility: uniswapSwapBundledVincentAbility,
    ethersSigner: delegateeSigner,
  });
}
export function getBungeeClient() {
  return getVincentAbilityClient({
    bundledVincentAbility: bungeeAbility,
    ethersSigner: delegateeSigner,
  });
}

export function getSponsorClient() {
  return getVincentAbilityClient({
    bundledVincentAbility: getAbilitySponsorTransactionClient,
    ethersSigner: delegateeSigner,
  });
}
