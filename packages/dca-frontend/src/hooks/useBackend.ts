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

export interface CreateDCARequest {
  name: string;
  purchaseAmount: string;
  purchaseIntervalHuman: string;
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
    return sendRequest<any[]>('/orders', 'GET');
  }, [sendRequest]);

  const createOrder = useCallback(
    async (order: any) => {
      return sendRequest<any>('/orders', 'POST', order);
    },
    [sendRequest]
  );

  const cancelOrder = useCallback(
    async (orderId: string) => {
      return sendRequest<any>(`/orders/${orderId}`, 'DELETE');
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
    // Deposit functions
    getDeposits,
    getDepositById,
    createDeposit,
  };
};
