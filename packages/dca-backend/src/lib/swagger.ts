/* eslint-disable sort-keys-plus/sort-keys */

export const swaggerSpec = {
  openapi: '3.0.1',
  info: {
    title: 'Vincent DCA Backend API',
    version: '1.0.0',
    description: 'API for managing orders and trades in the Vincent DCA backend.',
  },
  servers: [{ url: '/', description: 'whatever' }, { url: 'http://localhost:3000', description: 'local' }],
  components: {
    securitySchemes: {
      VincentJWT: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT for PKP authentication (from Lit Protocol Vincent SDK)',
      },
    },
    schemas: {
      // --- Order Schemas (from previous output, unchanged) ---
      OrderCreateRequest: {
        type: 'object',
        required: [
          'amount',
          'side',
          'price',
          'caip10Token',
          'caip10Wallet',
          'ethAddress',
          'symbol',
          'metadata',
        ],
        properties: {
          amount: {
            type: 'number',
            description: 'The total amount of the asset to be traded.',
            example: 100.5,
            minimum: 0.000000000000000001,
          },
          side: {
            type: 'string',
            enum: ['BUY', 'SELL'],
            description: 'The type of order: BUY or SELL.',
            example: 'BUY',
          },
          price: {
            type: 'number',
            description: 'The price per unit of the asset.',
            example: 0.75,
            minimum: 0,
          },
          caip10Token: {
            type: 'string',
            description: 'CAIP-10 identifier for the token being traded (e.g., eip155:1/erc20:0x...).',
            example: 'eip155:1/erc20:0x1f9840a85d5af5bf1d1762fcd6407d85fd2df3ef',
          },
          caip10Wallet: {
            type: 'string',
            description: 'CAIP-10 identifier for the wallet (e.g., eip155:1:0x...).',
            example: 'eip155:1:0xabc123def4567890123456789012345678901234',
          },
          ethAddress: {
            type: 'string',
            description: 'Ethereum address of the wallet creating the order.',
            example: '0xabc123def4567890123456789012345678901234',
            pattern: '^0x[a-fA-F0-9]{40}$',
          },
          symbol: {
            type: 'string',
            description: 'The trading pair symbol (e.g., UNI/USDC, ETH/DAI).',
            example: 'UNI/USDC',
          },
          metadata: {
            type: 'object',
            description: 'Arbitrary key-value metadata associated with the order.',
            additionalProperties: true,
            example: {
              clientOrderId: 'my-unique-order-ref-123',
              dcaPlanId: 'dca-plan-abc',
            },
          },
        },
      },
      OrderResponse: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique identifier of the order.',
            example: '654c600f7e1b9b1a2c3d4e5f',
          },
          amount: {
            type: 'number',
            description: 'The total amount of the asset to be traded.',
            example: 100.5,
          },
          side: {
            type: 'string',
            enum: ['BUY', 'SELL'],
            description: 'The type of order: BUY or SELL.',
            example: 'BUY',
          },
          price: {
            type: 'number',
            description: 'The price per unit of the asset.',
            example: 0.75,
          },
          caip10Token: {
            type: 'string',
            description: 'CAIP-10 identifier for the token being traded.',
            example: 'eip155:1/erc20:0x1f9840a85d5af5bf1d1762fcd6407d85fd2df3ef',
          },
          caip10Wallet: {
            type: 'string',
            format: 'ethereum-address',
            description: 'CAIP-10 identifier of the wallet associated with this order (owner).',
            example: 'eip155:1:0xabc123...',
          },
          symbol: {
            type: 'string',
            description: 'The trading pair symbol.',
            example: 'UNI/USDC',
          },
          remainingAmount: {
            type: 'number',
            description: 'The amount of the order that has not yet been filled.',
            example: 100.5,
          },
          status: {
            type: 'string',
            enum: ['PENDING', 'PARTIALLY_FILLED', 'FILLED', 'CANCELED'],
            description: 'The current status of the order.',
            example: 'PENDING',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Timestamp when the order was created.',
            example: '2023-11-08T12:00:00.000Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Timestamp when the order was last updated.',
            example: '2023-11-08T12:05:00.000Z',
          },
          metadata: {
            type: 'object',
            description: 'Arbitrary key-value metadata associated with the order.',
            additionalProperties: true,
            example: { clientOrderId: 'my-unique-order-ref-123' },
          },
        },
      },
      // --- NEW Trade Schema ---
      TradeResponse: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique identifier of the trade.',
            example: '654c600f7e1b9b1a2c3d4e5f',
          },
          buyOrderId: {
            type: 'string',
            format: 'uuid',
            description: 'The ID of the BUY order involved in this trade.',
            example: '654c600f7e1b9b1a2c3d4e5a',
          },
          sellOrderId: {
            type: 'string',
            format: 'uuid',
            description: 'The ID of the SELL order involved in this trade.',
            example: '654c600f7e1b9b1a2c3d4e5b',
          },
          price: {
            type: 'number',
            description: 'The price at which the trade was executed.',
            example: 0.75,
          },
          amount: {
            type: 'number',
            description: 'The amount of asset traded.',
            example: 10.0,
          },
          status: {
            type: 'string',
            enum: ['COMPLETED', 'PENDING', 'FAILED'], // Adjust as per your Trade model statuses
            description: 'The status of the trade execution.',
            example: 'COMPLETED',
          },
          executedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Timestamp when the trade was executed.',
            example: '2023-11-08T12:01:30.000Z',
          },
          // Add any other relevant fields from your Trade model here
        },
      },
      // --- Common Response Schemas (unchanged) ---
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            example: 'Order not found for wallet address 0xabc123...'
          },
          success: {
            type: 'boolean',
            example: false
          }
        }
      },
      SuccessListResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/OrderResponse'
            },
            description: 'List of orders.'
          },
          success: {
            type: 'boolean',
            example: true
          }
        }
      },
      SuccessSingleResponse: {
        type: 'object',
        properties: {
          data: {
            $ref: '#/components/schemas/OrderResponse',
            description: 'Single order object.'
          },
          success: {
            type: 'boolean',
            example: true
          }
        }
      },
      SuccessTradeListResponse: { // New list response for trades
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/TradeResponse'
            },
            description: 'List of trades.'
          },
          success: {
            type: 'boolean',
            example: true
          }
        }
      }
    },
  },
  security: [{ VincentJWT: [] }],
  paths: {
    '/orders': {
      get: {
        summary: 'List all orders for a wallet address',
        description: 'Retrieves a list of all orders associated with the provided `ethAddress` query parameter. These orders are filtered by the `caip10Wallet` field in the database.',
        tags: ['Orders'],
        parameters: [
          {
            name: 'ethAddress',
            in: 'query',
            required: true,
            description: 'The Ethereum address of the wallet to retrieve orders for.',
            schema: {
              type: 'string',
              pattern: '^0x[a-fA-F0-9]{40}$',
              example: '0xabc123def4567890123456789012345678901234',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Successfully retrieved orders.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SuccessListResponse'
                },
              },
            },
          },
          '400': {
            description: 'Bad Request - ethAddress parameter is required.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                },
              },
            },
          },
          '404': {
            description: 'No orders found for the provided wallet address.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                },
              },
            },
          },
          '500': {
            description: 'Server error.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create a new order',
        description: 'Creates a new order. The `ethAddress` field must be provided in the request body.',
        tags: ['Orders'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/OrderCreateRequest',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Order created successfully.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SuccessSingleResponse'
                },
              },
            },
          },
          '400': {
            description: 'Bad Request - invalid input data (e.g., missing amount, side, or ethAddress).',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                },
              },
            },
          },
          '500': {
            description: 'Failed to create order due to a server error.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                },
              },
            },
          },
        },
      },
    },
    '/orders/{orderId}': {
      get: {
        summary: 'Get a specific order by ID',
        description: 'Retrieves a single order by its ID, ensuring it belongs to the provided `ethAddress` query parameter.',
        tags: ['Orders'],
        parameters: [
          {
            name: 'orderId',
            in: 'path',
            required: true,
            description: 'The unique identifier of the order.',
            schema: {
              type: 'string',
              format: 'uuid',
              example: '654c600f7e1b9b1a2c3d4e5f',
            },
          },
          {
            name: 'ethAddress',
            in: 'query',
            required: true,
            description: 'The Ethereum address of the wallet that owns the order.',
            schema: {
              type: 'string',
              pattern: '^0x[a-fA-F0-9]{40}$',
              example: '0xabc123def4567890123456789012345678901234',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Successfully retrieved the order.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SuccessSingleResponse'
                },
              },
            },
          },
          '400': {
            description: 'Bad Request - ethAddress parameter is required.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                },
              },
            },
          },
          '404': {
            description: 'Order with the specified ID not found for the provided wallet address.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                },
              },
            },
          },
          '500': {
            description: 'Server error.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                },
              },
            },
          },
        },
      },
      delete: {
        summary: 'Cancel an order',
        description: 'Cancels a PENDING order by its ID, ensuring it belongs to the provided `ethAddress` query parameter.',
        tags: ['Orders'],
        parameters: [
          {
            name: 'orderId',
            in: 'path',
            required: true,
            description: 'The unique identifier of the order to cancel.',
            schema: {
              type: 'string',
              format: 'uuid',
              example: '654c600f7e1b9b1a2c3d4e5f',
            },
          },
          {
            name: 'ethAddress',
            in: 'query',
            required: true,
            description: 'The Ethereum address of the wallet that owns the order.',
            schema: {
              type: 'string',
              pattern: '^0x[a-fA-F0-9]{40}$',
              example: '0xabc123def4567890123456789012345678901234',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Order cancelled successfully.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SuccessSingleResponse'
                },
              },
            },
          },
          '400': {
            description: 'Bad Request - ethAddress parameter is required.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                },
              },
            },
          },
          '404': {
            description: 'Order with the specified ID not found for the provided wallet, already completed, or already cancelled.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                },
              },
            },
          },
          '500': {
            description: 'Failed to cancel order due to a server error.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                },
              },
            },
          },
        },
      },
    },
    // --- NEW Trade Routes ---
    '/trades': {
      get: {
        summary: 'List recent trades for the authenticated wallet',
        description: 'Retrieves a list of trades where the authenticated wallet (`ethAddress` from JWT) was involved (either as the buyer or seller).',
        security: [{ VincentJWT: [] }],
        tags: ['Trades'],
        parameters: [
          // You might add query parameters here for filtering/pagination if your controller supports it
          // e.g., { name: 'symbol', in: 'query', description: 'Filter by trading symbol', schema: { type: 'string' } }
          // e.g., { name: 'limit', in: 'query', description: 'Number of trades to return', schema: { type: 'integer', default: 50 } }
        ],
        responses: {
          '200': {
            description: 'Successfully retrieved trades.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SuccessTradeListResponse' // Use the new Trade-specific list response
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized - invalid or missing JWT.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                },
              },
            },
          },
          '500': {
            description: 'Server error.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                },
              },
            },
          },
        },
      },
    },
  },
};
