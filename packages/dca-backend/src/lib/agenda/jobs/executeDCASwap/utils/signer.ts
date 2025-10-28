import { ethers } from 'ethers';

import { env } from '../../../../env';

const { CHRONICLE_YELLOWSTONE_RPC, VINCENT_DELEGATEE_PRIVATE_KEY } = env;

// Admin address for signing syncUp transactions
const ADMIN_ADDRESS = '0x17e10b80AcC01E671232d2747B53829BB3421C8F';

export const readOnlySigner = new ethers.Wallet(
  ethers.Wallet.createRandom().privateKey,
  new ethers.providers.JsonRpcProvider(CHRONICLE_YELLOWSTONE_RPC)
);

export const delegateeSigner = new ethers.Wallet(
  VINCENT_DELEGATEE_PRIVATE_KEY,
  new ethers.providers.StaticJsonRpcProvider(CHRONICLE_YELLOWSTONE_RPC)
);

// Admin signer for syncUp transactions (must be the owner of the trading contract)
export const adminSigner = new ethers.Wallet(
  VINCENT_DELEGATEE_PRIVATE_KEY, // This private key should correspond to ADMIN_ADDRESS
  new ethers.providers.StaticJsonRpcProvider(CHRONICLE_YELLOWSTONE_RPC)
);

// Trading contract address and ABI
const TRADING_CONTRACT_ADDRESS = '0x0b4aec45bb5f3f70cc6cdb9771c850ff20d812a4';
const TRADING_CONTRACT_ABI = [
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "caip10Wallet",
            "type": "string"
          },
          {
            "internalType": "string", 
            "name": "caip10Token",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "evmDepositorWallet", 
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "newAmount",
            "type": "uint256"
          }
        ],
        "internalType": "struct SyncUpArguments[]",
        "name": "_data",
        "type": "tuple[]"
      }
    ],
    "name": "syncUp",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_caip10Token",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_caip10Wallet",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "_action",
        "type": "uint8"
      },
      {
        "internalType": "string",
        "name": "_depositorWalletOrName",
        "type": "string"
      }
    ],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

export interface SyncUpArgument {
  caip10Wallet: string;
  caip10Token: string;
  evmDepositorWallet: string;
  newAmount: string;
}

/**
 * Execute deposit transaction to the trading contract
 * @param caip10Token CAIP10 token address
 * @param caip10Wallet CAIP10 wallet address
 * @param amount Amount to deposit
 * @param action Action type (0 = Native chain)
 * @param depositorWalletOrName Depositor wallet or name
 * @returns Transaction hash
 */
export const executeDepositTransaction = async (
  caip10Token: string,
  caip10Wallet: string,
  amount: string,
  action: number = 0,
  depositorWalletOrName: string
): Promise<string> => {
  try {
    console.log('Executing deposit transaction:', {
      caip10Token,
      caip10Wallet,
      amount,
      action,
      depositorWalletOrName
    });
    
    // Create contract instance
    const tradingContract = new ethers.Contract(
      TRADING_CONTRACT_ADDRESS,
      TRADING_CONTRACT_ABI,
      delegateeSigner
    );
    
    // Execute the deposit transaction
    const tx = await tradingContract.deposit(
      caip10Token,
      caip10Wallet,
      amount,
      action,
      depositorWalletOrName
    );
    
    console.log('Deposit transaction sent:', tx.hash);
    
    // Wait for transaction confirmation
    const receipt = await tx.wait();
    
    console.log('Deposit transaction confirmed:', receipt.transactionHash);
    console.log('Gas used:', receipt.gasUsed.toString());
    
    return receipt.transactionHash;
    
  } catch (error) {
    console.error('Error executing deposit transaction:', error);
    throw error;
  }
};

/**
 * Execute syncUp transaction to flip coins between users
 * @param syncUpData Array of SyncUpArguments for the transaction
 * @returns Transaction hash
 */
export const executeSyncUpTransaction = async (syncUpData: SyncUpArgument[]): Promise<string> => {
  try {
    console.log('Executing syncUp transaction with data:', JSON.stringify(syncUpData, null, 2));
    console.log('Using admin address for syncUp:', ADMIN_ADDRESS);
    
    // Create contract instance with admin signer (must be contract owner)
    const tradingContract = new ethers.Contract(
      TRADING_CONTRACT_ADDRESS,
      TRADING_CONTRACT_ABI,
      adminSigner
    );
    
    // Execute the syncUp transaction
    const tx = await tradingContract.syncUp(syncUpData);
    
    console.log('SyncUp transaction sent:', tx.hash);
    
    // Wait for transaction confirmation
    const receipt = await tx.wait();
    
    console.log('SyncUp transaction confirmed:', receipt.transactionHash);
    console.log('Gas used:', receipt.gasUsed.toString());
    
    return receipt.transactionHash;
    
  } catch (error) {
    console.error('Error executing syncUp transaction:', error);
    throw error;
  }
};

/**
 * Helper function to create syncUp data for a trade
 * @param buyerCaip10Wallet Buyer's CAIP10 wallet address
 * @param sellerCaip10Wallet Seller's CAIP10 wallet address
 * @param buyerCaip10Token Buyer's CAIP10 token address
 * @param sellerCaip10Token Seller's CAIP10 token address
 * @param buyerEthAddress Buyer's ETH address
 * @param sellerEthAddress Seller's ETH address
 * @param tradeAmount Amount being traded
 * @returns SyncUpArgument array for the transaction
 */
export const createSyncUpData = (
  buyerCaip10Wallet: string,
  sellerCaip10Wallet: string,
  buyerCaip10Token: string,
  sellerCaip10Token: string,
  buyerEthAddress: string,
  sellerEthAddress: string,
  tradeAmount: number
): SyncUpArgument[] => {
  return [
    // Seller: remove their tokens (set to 0)
    {
      caip10Wallet: sellerCaip10Wallet,
      caip10Token: sellerCaip10Token,
      evmDepositorWallet: sellerEthAddress,
      newAmount: '0'
    },
    // Buyer: receive the tokens (set to trade amount)
    {
      caip10Wallet: buyerCaip10Wallet,
      caip10Token: buyerCaip10Token,
      evmDepositorWallet: buyerEthAddress,
      newAmount: tradeAmount.toString()
    }
  ];
};
