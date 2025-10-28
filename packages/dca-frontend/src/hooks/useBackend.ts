import { useCallback } from 'react';

import { useJwtContext, useVincentWebAuthClient } from '@lit-protocol/vincent-app-sdk/react';

import { env } from '@/config/env';

const { VITE_APP_ID, VITE_BACKEND_URL, VITE_REDIRECT_URI } = env;

type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type DCA = {
  lastRunAt: string;
  nextRunAt: string;
  lastFinishedAt: string;
  failedAt: string;
  _id: string;
  disabled: boolean;
  failReason: string;
  data: {
    name: string;
    purchaseAmount: number;
    purchaseIntervalHuman: string;
    vincentAppVersion: number;
    pkpInfo: {
      ethAddress: string;
      publicKey: string;
      tokenId: string;
    };
    updatedAt: string;
  };
};

export interface Order {
  _id: string;
  amount: number;
  side: 'BUY' | 'SELL';
  price: number;
  caip10Wallet: string;
  symbol: string;
  remainingAmount: number;
  status: 'PENDING' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED';
  createdAt: string;
  // Enhanced multi-chain fields
  ethAddress: string;
  tokenAddress: string;
  tokenSymbol?: string;
  sourceChainId: number;
  sourceChainType: 'NATIVE' | 'OTHER';
  targetChainId?: number;
  targetChainType?: 'NATIVE' | 'OTHER';
  isCrossChain: boolean;
  targetTokenAddress?: string;
  targetTokenSymbol?: string;
  filledAmount: number;
  averageFillPrice?: number;
}

export interface CreateDCARequest {
  name: string;
  purchaseAmount: string;
  purchaseIntervalHuman: string;
}

export interface CreateOrderRequest {
  amount: number;
  side: 'BUY' | 'SELL';
  price: number;
  caip10Token: string;
  caip10Wallet: string;
  symbol: string;
  metadata?: Record<string, any>;
  // Multi-chain fields
  targetChainId?: number;
  targetTokenAddress?: string;
  targetTokenSymbol?: string;
}

export interface OrderBookResponse {
  symbol: string;
  bids: Array<{
    price: number;
    amount: number;
    total: number;
    chainInfo: {
      source: { chainId: number; type: 'NATIVE' | 'OTHER' };
      target: { chainId: number; type: 'NATIVE' | 'OTHER' } | null;
    };
    isCrossChain: boolean;
    createdAt: string;
  }>;
  asks: Array<{
    price: number;
    amount: number;
    total: number;
    chainInfo: {
      source: { chainId: number; type: 'NATIVE' | 'OTHER' };
      target: { chainId: number; type: 'NATIVE' | 'OTHER' } | null;
    };
    isCrossChain: boolean;
    createdAt: string;
  }>;
  bestBid: any;
  bestAsk: any;
  spread: number | null;
  spreadPercentage: number | null;
  timestamp: string;
  includeCrossChain: boolean;
}

export interface AllOrdersResponse {
  ordersBySymbol: Record<string, {
    symbol: string;
    bids: Array<{
      price: number;
      amount: number;
      total: number;
      chainInfo: {
        source: { chainId: number; type: 'NATIVE' | 'OTHER' };
        target: { chainId: number; type: 'NATIVE' | 'OTHER' } | null;
      };
      isCrossChain: boolean;
      createdAt: string;
      orderId: string;
      ethAddress: string;
      filledAmount: number;
      status: string;
    }>;
    asks: Array<{
      price: number;
      amount: number;
      total: number;
      chainInfo: {
        source: { chainId: number; type: 'NATIVE' | 'OTHER' };
        target: { chainId: number; type: 'NATIVE' | 'OTHER' } | null;
      };
      isCrossChain: boolean;
      createdAt: string;
      orderId: string;
      ethAddress: string;
      filledAmount: number;
      status: string;
    }>;
    totalOrders: number;
  }>;
  totalOrders: number;
  symbols: string[];
  timestamp: string;
  includeCrossChain: boolean;
}

export interface Deposit {
  _id: string;
  caip10Wallet: string;
  ethAddress: string;
  caip10Token: string;
  tokenAddress: string;
  tokenSymbol?: string;
  amount: string;
  action: number;
  chainType: 'NATIVE' | 'OTHER';
  txHash?: string;
  blockNumber?: number;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  contractAddress: string;
  chainId: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface DepositResponse {
  deposits: Deposit[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export const useBackend = () => {
  const { authInfo } = useJwtContext();
  const vincentWebAuthClient = useVincentWebAuthClient(VITE_APP_ID);

  const getJwt = useCallback(() => {
    // Redirect to Vincent Auth consent page with appId and version
    vincentWebAuthClient.redirectToConnectPage({
      // consentPageUrl: `http://localhost:3000/`,
      redirectUri: VITE_REDIRECT_URI,
    });
  }, [vincentWebAuthClient]);

  const sendRequest = useCallback(
    async <T>(endpoint: string, method: HTTPMethod, body?: unknown): Promise<T> => {
      if (!authInfo?.jwt) {
        throw new Error('No JWT to query backend');
      }

      const headers: HeadersInit = {
        Authorization: `Bearer ${authInfo.jwt}`,
      };
      if (body != null) {
        headers['Content-Type'] = 'application/json';
      }

      console.log('Making request to:', `${VITE_BACKEND_URL}${endpoint}`);
      const response = await fetch(`${VITE_BACKEND_URL}${endpoint}`, {
        method,
        headers,
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      console.log('Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = (await response.json()) as { data: T; success: boolean };
      console.log('Response JSON:', json);

      if (!json.success) {
        throw new Error(`Backend error: ${json.data}`);
      }

      return json.data;
    },
    [authInfo]
  );

  const createDCA = useCallback(
    async (dca: CreateDCARequest) => {
      return sendRequest<DCA>('/schedule', 'POST', dca);
    },
    [sendRequest]
  );

  const getDCAs = useCallback(async () => {
    return sendRequest<DCA[]>('/schedules', 'GET');
  }, [sendRequest]);

  const disableDCA = useCallback(
    async (scheduleId: string) => {
      return sendRequest<DCA>(`/schedules/${scheduleId}/disable`, 'PUT');
    },
    [sendRequest]
  );

  const enableDCA = useCallback(
    async (scheduleId: string) => {
      return sendRequest<DCA>(`/schedules/${scheduleId}/enable`, 'PUT');
    },
    [sendRequest]
  );

  const editDCA = useCallback(
    async (scheduleId: string, dca: CreateDCARequest) => {
      return sendRequest<DCA>(`/schedules/${scheduleId}`, 'PUT', dca);
    },
    [sendRequest]
  );

  const deleteDCA = useCallback(
    async (scheduleId: string) => {
      return sendRequest<DCA>(`/schedules/${scheduleId}`, 'DELETE');
    },
    [sendRequest]
  );

  // Order functions
  const getOrders = useCallback(async () => {
    return sendRequest<Order[]>('/orders/my', 'GET');
  }, [sendRequest]);

  const getAllOrders = useCallback(async () => {
    return sendRequest<Order[]>('/orders/all', 'GET');
  }, [sendRequest]);

  const createOrder = useCallback(
    async (order: CreateOrderRequest) => {
      return sendRequest<Order>('/orders', 'POST', order);
    },
    [sendRequest]
  );

  const cancelOrder = useCallback(
    async (orderId: string) => {
      return sendRequest<Order>(`/orders/${orderId}`, 'DELETE');
    },
    [sendRequest]
  );

  const getOrderBook = useCallback(
    async (symbol: string, limit?: number, includeCrossChain?: boolean) => {
      const queryParams = new URLSearchParams();
      if (limit) queryParams.append('limit', limit.toString());
      if (includeCrossChain !== undefined) queryParams.append('includeCrossChain', includeCrossChain.toString());
      
      const endpoint = `/orders/orderbook/${symbol}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      return sendRequest<OrderBookResponse>(endpoint, 'GET');
    },
    [sendRequest]
  );


  // Deposit functions
  const getDeposits = useCallback(
    async (params?: { status?: string; chainType?: string; limit?: number; offset?: number }) => {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.chainType) queryParams.append('chainType', params.chainType);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());
      
      const endpoint = `/trading/my-deposits${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      console.log('Making request to:', endpoint);
      return sendRequest<DepositResponse>(endpoint, 'GET');
    },
    [sendRequest]
  );

  const getDepositById = useCallback(
    async (depositId: string) => {
      return sendRequest<{ deposit: Deposit }>(`/trading/deposit/${depositId}`, 'GET');
    },
    [sendRequest]
  );

  const createDeposit = useCallback(
    async (depositData: { tokenAddress: string; amount: number; chainType?: number }) => {
      return sendRequest<any>('/trading/deposit', 'POST', depositData);
    },
    [sendRequest]
  );

  return {
    createDCA,
    deleteDCA,
    disableDCA,
    editDCA,
    enableDCA,
    getDCAs,
    getJwt,
    // Order functions
    getOrders,
    createOrder,
    cancelOrder,
    getOrderBook,
    getAllOrders,
    // Deposit functions
    getDeposits,
    getDepositById,
    createDeposit,
  };
};
