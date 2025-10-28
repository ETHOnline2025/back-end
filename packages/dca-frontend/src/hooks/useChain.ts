import { useState } from 'react';
import { LIT_EVM_CHAINS } from '@lit-protocol/constants';
import { LITEVMChain } from '@lit-protocol/types';
import { ethers } from 'ethers';

const ERC20_ABI = ['function balanceOf(address owner) view returns (uint256)'];

const EURC_CONTRACT_ADDRESSES: Record<number, string> = {
  84532: '0x808456652fdb597867f38412077A9182bf77359F', // Base Sepolia EURC
};

const USDC_CONTRACT_ADDRESSES: Record<number, string> = {
  [LIT_EVM_CHAINS.base.chainId]: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // Base mainnet USDC
  84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
};

export const useChain = () => {
  // Use Base Sepolia for testing
  const [chain, setChain] = useState<LITEVMChain>({
    chainId: 84532,
    name: 'Base Sepolia',
    symbol: 'ETH',
    decimals: 18,
    rpcUrls: ['https://sepolia.base.org'],
    blockExplorerUrls: ['https://sepolia-explorer.base.org'],
    vmType: 'evm',
    contractAddress: null,
    type: null,
  });

  const provider = new ethers.providers.JsonRpcProvider(chain.rpcUrls[0]);

  const usdcContract = new ethers.Contract(
    USDC_CONTRACT_ADDRESSES[chain.chainId],
    ERC20_ABI,
    provider
  );

  const eurcContract = new ethers.Contract(
    EURC_CONTRACT_ADDRESSES[chain.chainId],
    ERC20_ABI,
    provider
  );

  return {
    chain,
    setChain,
    provider,
    usdcContract,
    eurcContract,
  };
};
