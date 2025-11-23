# Order History Monitor

A Node.js service that monitors order history for active trader addresses from Redis using WebSocket subscriptions to Kana Labs.

## Features

- 🔍 Monitors order history for multiple wallet addresses dynamically
- 📡 Real-time WebSocket connection to Kana Labs
- 🔄 Fetches initial addresses from Redis `profiles:active` set
- 📊 Displays order details (market, type, price, size, leverage, etc.)
- 🔄 Automatic reconnection on connection loss
- ⚡ Low latency order processing

## Prerequisites

- Node.js >= 18
- npm, yarn, or pnpm
- Redis server running
- Kana Labs API Key

## Installation

1. **Navigate to the project directory:**

   ```bash
   cd apps/ws
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Configure environment variables:**

   Create a `.env` file in the root directory with:
   ```env
   KANA_API_KEY=your_kana_api_key_here
   REDIS_HOST=localhost
   REDIS_PORT=6379
   NODE_ENV=development
   ```

## Running the Service

### Development Mode

From the root directory:
```bash
pnpm run dev:ws
```

Or from `apps/ws`:
```bash
pnpm dev
```

### Production Mode

1. **Build the project:**

   ```bash
   pnpm build
   ```

2. **Start the server:**
   ```bash
   pnpm start
   ```

## Environment Variables

| Variable                | Required | Description                                    | Default                                      |
| ----------------------- | -------- | ---------------------------------------------- | -------------------------------------------- |
| `KANA_API_KEY`          | Yes      | Your Kana Labs API key                         | -                                            |
| `REDIS_HOST`            | No       | Redis server host                              | `localhost`                                  |
| `REDIS_PORT`            | No       | Redis server port                              | `6379`                                       |
| `NODE_ENV`              | No       | Environment (development/production)            | `development`                                |
| `KANA_REST`             | No       | Kana Labs REST API URL                         | `https://perps-tradeapi.kana.trade`          |
| `KANA_WS`               | No       | Kana Labs WebSocket URL                        | `wss://perpetuals-indexer-ws.kana.trade/ws/` |

## How It Works

1. **Redis Integration**: The service connects to Redis and reads the `profiles:active` set, which contains active trader wallet addresses
2. **Initial Load**: Fetches all active addresses from Redis on startup
3. **Profile Resolution**: For each wallet address, the service fetches the corresponding profile address from Kana Labs API
4. **WebSocket Connection**: Establishes a WebSocket connection to Kana Labs
5. **Subscription**: Subscribes to order history updates for all active profile addresses
6. **Real-time Updates**: Displays new orders in real-time as they are received

## Redis Integration

The service reads the Redis key `profiles:active` on startup, which is a SET containing active trader wallet addresses. This key is managed by the API service when copy trade bots are started/stopped.

- When a bot starts, the trader address is added to `profiles:active`
- When all bots for a trader stop, the trader address is removed from `profiles:active`
- The WS service loads the initial set of addresses from Redis when it starts

## Order Information Displayed

For each order, the service displays:

- 📅 Timestamp
- 🆔 Order ID
- 👤 Wallet Address
- 📊 Market (e.g., BTC-USD, ETH-USD)
- 📈 Order Type (Market Buy, Limit Sell, etc.)
- 💰 Price
- 📏 Size
- ⚡ Leverage
- 📊 Status
- 📍 Profile Address

## Troubleshooting

### Connection Issues

- Verify your `KANA_API_KEY` is correct
- Check that Redis is running and accessible
- Ensure your network can reach the Kana Labs WebSocket endpoint

### No Orders Showing

- The service only shows NEW orders created after it starts
- Historical orders are filtered out
- Verify that addresses exist in Redis `profiles:active` set
- Check that the target addresses have recent trading activity

### Redis Connection Issues

- Verify Redis is running: `redis-cli ping` (should return `PONG`)
- Check `REDIS_HOST` and `REDIS_PORT` environment variables
- Ensure Redis is accessible from the service

## Project Structure

```
apps/ws/
├── src/
│   ├── config/
│   │   └── index.ts              # Configuration and environment variables
│   ├── constants/
│   │   └── index.ts              # Application constants
│   ├── services/
│   │   ├── orderHistoryService.ts # WebSocket connection and order processing
│   │   └── redis.service.ts      # Redis client service
│   ├── types/
│   │   └── index.ts              # TypeScript type definitions
│   ├── utils/
│   │   └── logger.ts             # Logging utility
│   └── server.ts                 # Server entry point
├── dist/                         # Compiled JavaScript (generated)
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # This file
```

## License

UNLICENSED
