/* eslint-disable sort-keys-plus/sort-keys */

export const swaggerSpec = {
  openapi: '3.0.1',
  info: {
    title: 'Vincent DCA / Orderbook API',
    version: '1.0.0',
    description: 'Orderbook, trades and balance withdraw endpoints',
  },
  servers: [{ url: 'http://localhost:3000', description: 'local' }],
  components: {
    securitySchemes: {
      VincentJWT: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      OrderCreate: {
        type: 'object',
        required: ['amount', 'side', 'price', 'caip10Token', 'caip10Wallet'],
        properties: {
          amount: { type: 'number', example: 1300 },
          side: { type: 'string', enum: ['BUY', 'SELL'] },
          price: { type: 'number', example: 0.6 },
          caip10Token: { type: 'string' },
          caip10Wallet: { type: 'string' },
          metadata: { type: 'object' },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          ownerCaip10: { type: 'string' },
          caip10Token: { type: 'string' },
          amount: { type: 'number' },
          remaining: { type: 'number' },
          price: { type: 'number' },
          side: { type: 'string' },
          status: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Trade: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          buyOrderId: { type: 'string' },
          sellOrderId: { type: 'string' },
          price: { type: 'number' },
          amount: { type: 'number' },
          status: { type: 'string' },
          executedAt: { type: 'string', format: 'date-time' },
        },
      },
      Withdraw: {
        type: 'object',
        required: ['amount', 'caip10Token', 'caip10Wallet'],
        properties: {
          amount: { type: 'number' },
          caip10Token: { type: 'string' },
          caip10Wallet: { type: 'string' },
        },
      },
    },
  },
  security: [{ VincentJWT: [] }],
  paths: {
    '/orders': {
      post: {
        summary: 'Create order',
        security: [{ VincentJWT: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/OrderCreate' } } },
        },
        responses: { '201': { description: 'Created' } },
      },
      get: {
        summary: 'List orders',
        security: [{ VincentJWT: [] }],
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    },
    '/orders/{orderId}': {
      delete: {
        summary: 'Cancel order',
        security: [{ VincentJWT: [] }],
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } },
      },
    },
    '/trades': {
      get: {
        summary: 'List recent trades',
        security: [{ VincentJWT: [] }],
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    },
    '/balance/withdraw': {
      post: {
        summary: 'Withdraw (create cross-chain transfer / withdraw)',
        security: [{ VincentJWT: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Withdraw' } } },
        },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/purchases': {
      get: {
        summary: 'List purchases',
        security: [{ VincentJWT: [] }],
        responses: { '200': { description: 'OK' } },
      },
    },
  },
};
