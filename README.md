# Macaque

🐒 Macaque is a decentralized software stack that allows anyone to spin up their own Macaque Virtual Trading Chain (MVTC), completely chain and chain architecture agnostic. Building with this stack, builders can offer users slippage free cross chain trading at CEX level speed, with DEX level certainty.

This project demonstrates how to schedule and execute recurring DCA (Dollar-Cost Averaging) swaps on behalf of end-users using a Vincent App and delegated agent wallets.

## Order Book & CLOB Integration

Macaque features a sophisticated **Central Limit Order Book (CLOB)** system that enables slippage-free trading at CEX-level speeds:

### Multi-Order Book Architecture
- **Symbol-based Order Books**: Each trading pair (e.g., ETH/USDC, UNI/USDC) maintains its own dedicated order book
- **Price-Time Priority**: Orders are matched based on price priority (best price first) and time priority (first-come-first-served)
- **Real-time Matching**: Orders are processed instantly through our off-chain matching engine
- **Cross-chain Compatibility**: Order books support CAIP10 addresses for seamless multi-chain trading

### Order Types Supported
- **Market Orders**: Execute immediately at the best available price
- **Limit Orders**: Execute only at specified price or better
- **Buy/Sell Orders**: Full support for both sides of the order book
- **Partial Fills**: Orders can be partially filled and remain active

### Matching Engine Features
- **Atomic Matching**: Orders are matched atomically to prevent partial fills without counterparties
- **Price Discovery**: Real-time price discovery through order book depth
- **Liquidity Aggregation**: Multiple orders can be matched against a single large order
- **Trade Settlement**: Automatic trade recording and settlement through Vincent integration

### Order Book API Endpoints
- `POST /orders` - Create new orders
- `GET /orders` - List orders for a wallet
- `GET /orders/:orderId` - Get specific order details
- `DELETE /orders/:orderId` - Cancel pending orders
- `GET /trades` - View trade history

## Prerequisites

- Node ^22.16.0
- pnpm ^10.7.0
- Docker or a local MongoDB instance
- A Vincent App with ERC20 approval and Uniswap swap abilities

## Monorepo Structure

This codebase is composed of three main parts, enhanced with Macaque's CLOB order book functionality:

- **Frontend**: React app where users can create, edit, and delete DCA tasks, plus advanced order book trading interface with real-time order book visualization.
- **Database**: MongoDB to persist DCA tasks and comprehensive order book data (orders, trades, matching engine state, order book depth).
- **Backend (Node.js)**:
  - Express.js API server with comprehensive order book endpoints
  - Agenda-based job scheduler that runs DCA jobs
  - **Macaque CLOB Matching Engine**: High-performance order matching system with price-time priority
  - **Multi-Symbol Order Books**: Separate order books for each trading pair
  - Integration with a Vincent App to execute swaps on behalf of users
    - Vincent ERC20 Approval ability: authorizes Uniswap to spend user tokens
    - Vincent Uniswap Swap ability: executes the actual token swaps
    - **Cross-chain CAIP10 support**: Enhanced for multi-chain order book trading

## Packages

| Package                                         | Purpose                                                                          |
| ----------------------------------------------- | -------------------------------------------------------------------------------- |
| [dca-frontend](packages/dca-frontend/README.md) | Frontend for end-users to define DCA tasks to be run on a schedule               |
| [dca-backend](packages/dca-backend/README.md)   | Backend REST API and worker instance using NodeJS; deployed to Heroku currently. |

## Vincent App

To execute operations on behalf of your users (delegators), you need a Vincent App to which they can delegate their agent wallet.

A demo Vincent App already exists: [wBTC DCA](https://dashboard.heyvincent.ai/explorer/appId/9796398001) in the [Vincent Dashboard](https://dashboard.heyvincent.ai/).

You can access the demo app frontend at: https://dca.heyvincent.ai/

### Create your own Vincent App

To run this code and sign on behalf of your delegators, create your own Vincent App:

1. Go to the [Vincent Dashboard](https://dashboard.heyvincent.ai/) and log in as a builder.
2. Create a new app similar to [wBTC DCA](https://dashboard.heyvincent.ai/user/appId/9796398001/connect).
3. Add the ERC20 Approval ability.
4. Add the Uniswap Swap ability.
5. Publish the app.
6. Once users can connect to it, configure the backend with your App ID and the delegatee private key via environment variables. You can use the Deploy on Railway button below to deploy the entire app.
7. Once deployed, you'll need to update the `App User URL` and `Redirect URIs` to the URL deployed from Railway.

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/UY2g5I?referralCode=iNEMKY&utm_medium=integration&utm_source=template&utm_campaign=generic)

## Quick Start

Install dependencies and build the packages (works for both local and production setups):

```zsh
pnpm install && pnpm build
```

Note: remember to enable [Corepack](https://github.com/nodejs/corepack): `corepack enable`

## Local Development

Local development uses `dotenvx` to load environment variables from `.env` files. You should have a `.env` at the repository root and one for each package that needs it.

Each project includes a `.env.example` with placeholders and defaults you can copy and fill in.

### Start a local MongoDB

A Dockerfile is provided to run MongoDB locally:

```zsh
pnpm -r mongo:build
```

### Run all services

After setting environment variables and starting the database, run:

```zsh
pnpm dev
```

## Production

Production does not use `dotenvx`. Inject environment variables via your platform’s secret manager or environment configuration—do not write them to the runtime filesystem.

Then start the services with:

```zsh
pnpm start
```

## Notes and Gotchas

- You will most likely not run API and Worker instances on the same server.
- The abilities you execute MUST match the exact versions connected in each user’s agent wallet.
  - If you update an ability, users must reconnect; you cannot use a newer version they haven’t approved.
  - If you support multiple versions of the same Vincent App, your server may need to run multiple versions of abilities side-by-side.
  - Install specific versions of abilities in your app to avoid version conflicts.
- Users can revoke or update their connection at any time; handle revocations and version changes gracefully.
- Always call prepare and precheck functions for abilities to avoid preventable errors.
- Users’ agent wallets send their own transactions. Ensure they have sufficient funds for gas, unless you plan to sponsor it.

## Disclaimers

- This is a demo application and is not intended for production use without considerable modifications.
- The software is provided “as is”, without warranty of any kind, express or implied, including but
  not limited to the warranties of merchantability, fitness for a particular purpose and
  noninfringement. We make no guarantees about its stability or suitability for production use. It
  is provided for demo and educational purposes.
- It's your responsibility to comply with all applicable laws and regulations for your jurisdiction
  with respect to the use of this software.
