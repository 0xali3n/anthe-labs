# Order History Monitor

A simple Node.js service that monitors order history for a target wallet address on Kana Labs using WebSocket subscriptions.

## Features

- 🔍 Monitors order history for a single wallet address
- 📡 Real-time WebSocket connection to Kana Labs
- 📊 Displays order details (market, type, price, size, leverage, etc.)
- 🔄 Automatic reconnection on connection loss
- 🚀 Simple Express API for health checks

## Prerequisites

- Node.js >= 18
- npm, yarn, or pnpm
- Kana Labs API Key
- Target wallet address to monitor

## Installation

1. **Clone or navigate to the project directory:**

   ```bash
   cd apps/ws
   ```

2. **Install dependencies:**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Create a `.env` file:**

   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables:**
   Edit `.env` and set the following:
   ```env
   KANA_API_KEY=your_kana_api_key_here
   TARGET_WALLET_ADDRESS=0x...
   PORT=3001
   ```

## Running the Service

### Development Mode

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

### Production Mode

1. **Build the project:**

   ```bash
   npm run build
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

## Environment Variables

| Variable                | Required | Description                         | Default                                      |
| ----------------------- | -------- | ----------------------------------- | -------------------------------------------- |
| `KANA_API_KEY`          | Yes      | Your Kana Labs API key              | -                                            |
| `TARGET_WALLET_ADDRESS` | Yes      | The Aptos wallet address to monitor | -                                            |
| `PORT`                  | No       | Server port                         | `3001`                                       |
| `KANA_REST`             | No       | Kana Labs REST API URL              | `https://perps-tradeapi.kana.trade`          |
| `KANA_WS`               | No       | Kana Labs WebSocket URL             | `wss://perpetuals-indexer-ws.kana.trade/ws/` |

## API Endpoints

### Health Check

```
GET /health
```

Returns the service health status.

### Status

```
GET /api/status
```

Returns detailed service status including monitoring state.

## How It Works

1. The service reads the target wallet address from environment variables
2. It fetches the profile address for the wallet using Kana Labs API
3. It establishes a WebSocket connection to Kana Labs
4. It subscribes to order history updates for the profile address
5. It displays new orders in real-time as they are received

## Order Information Displayed

For each order, the service displays:

- 📅 Timestamp
- 🆔 Order ID
- 📊 Market (e.g., BTC-USD, ETH-USD)
- 📈 Order Type (Market Buy, Limit Sell, etc.)
- 💰 Price
- 📏 Size
- ⚡ Leverage
- 📊 Status
- 📍 Address

## Troubleshooting

### Connection Issues

- Verify your `KANA_API_KEY` is correct
- Check that the `TARGET_WALLET_ADDRESS` is a valid Aptos address
- Ensure your network can reach the Kana Labs WebSocket endpoint

### No Orders Showing

- The service only shows NEW orders created after it starts
- Historical orders are filtered out
- Verify the target address has recent trading activity

### Build Errors

- Ensure you have TypeScript installed globally or locally
- Check that all dependencies are installed: `npm install`

## Project Structure

```
apps/ws/
├── server.ts              # Express server and initialization
├── orderHistoryService.ts # WebSocket connection and order processing
├── config.ts              # Configuration and environment variables
├── kanaClient.ts          # Kana Labs API client utilities
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── .env.example           # Environment variables template
├── .gitignore             # Git ignore rules
└── README.md              # This file
```

## License

UNLICENSED
