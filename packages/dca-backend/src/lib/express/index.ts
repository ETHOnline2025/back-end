import * as Sentry from '@sentry/node';
import cors from 'cors';
import express, { Express, NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

import { createVincentUserMiddleware } from '@lit-protocol/vincent-app-sdk/expressMiddleware';
import { getAppInfo, getPKPInfo, isAppUser } from '@lit-protocol/vincent-app-sdk/jwt';

import { handleListPurchasesRoute } from './purchases';
import {
  handleListSchedulesRoute,
  handleEnableScheduleRoute,
  handleDisableScheduleRoute,
  handleCreateScheduleRoute,
  handleDeleteScheduleRoute,
  handleEditScheduleRoute,
} from './schedules';
import { userKey, VincentAuthenticatedRequest } from './types';
import { env } from '../env';
import { serviceLogger } from '../logger';
import { handleCreateOrderRoute, handleGetOrderRoute, handleCancelOrderRoute, handleGetOrderBookRoute, handleGetAllOrdersRoute, handleGetMyOrdersRoute } from './orders';
import { handleListTradesRoute } from './trades';
import { handleSyncUpRoute, handleGetBalanceRoute, handleDepositRoute, handleGetTokenBalanceRoute, handleGetMyBalanceRoute, handleGetMyDepositsRoute, handleGetDepositByIdRoute } from './trading';
import { OrderCreateSchema, OrderIdentitySchema } from './schema';

const { ALLOWED_AUDIENCE, CORS_ALLOWED_DOMAIN, IS_DEVELOPMENT, VINCENT_APP_ID } = env;

const { handler, middleware } = createVincentUserMiddleware({
  userKey,
  allowedAudience: ALLOWED_AUDIENCE,
  requiredAppId: VINCENT_APP_ID,
});

const corsConfig = {
  optionsSuccessStatus: 204,
  origin: IS_DEVELOPMENT ? true : [CORS_ALLOWED_DOMAIN],
};

const setSentryUserMiddleware = handler(
  (req: VincentAuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!isAppUser(req.user.decodedJWT)) {
      throw new Error('Vincent JWT is not an app user');
    }

    Sentry.setUser({
      app: getAppInfo(req.user.decodedJWT),
      ethAddress: getPKPInfo(req.user.decodedJWT).ethAddress,
    });
    next();
  }
);

// Validation middleware for order creation
const validateOrderCreate = (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body = OrderCreateSchema.parse(req.body);
    next();
  } catch (error: any) {
    res.status(400).json({ 
      error: 'Validation failed', 
      success: false, 
      details: error.errors || error.message 
    });
  }
};

// Validation middleware for order ID parameter
const validateOrderId = (req: Request, res: Response, next: NextFunction) => {
  try {
    OrderIdentitySchema.parse({ orderId: req.params.orderId });
    next();
  } catch (error: any) {
    res.status(400).json({ 
      error: 'Invalid order ID', 
      success: false, 
      details: error.errors || error.message 
    });
  }
};

export const registerRoutes = (app: Express) => {
  app.use(helmet());
  app.use(express.json());

  if (IS_DEVELOPMENT) {
    serviceLogger.info(`CORS is disabled for development`);
  } else {
    serviceLogger.info(`Configuring CORS with allowed domain: ${CORS_ALLOWED_DOMAIN}`);
  }
  app.use(cors(corsConfig));

  app.get('/purchases', middleware, setSentryUserMiddleware, handler(handleListPurchasesRoute));
  app.get('/schedules', middleware, setSentryUserMiddleware, handler(handleListSchedulesRoute));
  app.post('/schedule', middleware, setSentryUserMiddleware, handler(handleCreateScheduleRoute));
  app.put(
    '/schedules/:scheduleId',
    middleware,
    setSentryUserMiddleware,
    handler(handleEditScheduleRoute)
  );
  app.put(
    '/schedules/:scheduleId/enable',
    middleware,
    setSentryUserMiddleware,
    handler(handleEnableScheduleRoute)
  );
  app.put(
    '/schedules/:scheduleId/disable',
    middleware,
    setSentryUserMiddleware,
    handler(handleDisableScheduleRoute)
  );
  app.delete(
    '/schedules/:scheduleId',
    middleware,
    setSentryUserMiddleware,
    handler(handleDeleteScheduleRoute)
  );

  // Simple order routes
  app.post('/orders', middleware, setSentryUserMiddleware, validateOrderCreate, handler(handleCreateOrderRoute));
  app.get('/orders/all', middleware, setSentryUserMiddleware, handler(handleGetAllOrdersRoute)); // All orders
  app.get('/orders/my', middleware, setSentryUserMiddleware, handler(handleGetMyOrdersRoute)); // My orders
  app.get('/orders/:orderId', middleware, setSentryUserMiddleware, validateOrderId, handler(handleGetOrderRoute));
  app.delete('/orders/:orderId', middleware, setSentryUserMiddleware, validateOrderId, handler(handleCancelOrderRoute));
  app.get('/trades', middleware, setSentryUserMiddleware, handler(handleListTradesRoute));
  
  // Trading contract endpoints
  app.post('/trading/sync-up', handler(handleSyncUpRoute));
  app.get('/trading/balance', handler(handleGetBalanceRoute));
  app.get('/trading/token-balance', handler(handleGetTokenBalanceRoute));
  app.post('/trading/deposit', middleware, setSentryUserMiddleware, handler(handleDepositRoute));
  app.get('/trading/my-balance', middleware, setSentryUserMiddleware, handler(handleGetMyBalanceRoute));
  app.get('/trading/my-deposits', middleware, setSentryUserMiddleware, handler(handleGetMyDepositsRoute));
  app.get('/trading/deposit/:id', middleware, setSentryUserMiddleware, handler(handleGetDepositByIdRoute));

  serviceLogger.info(`Routes registered`);
};
