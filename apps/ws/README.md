# Order History Monitor (WebSocket Service)

A Node.js service that monitors order history for active trader addresses from Redis using WebSocket subscriptions to Kana Labs. The service processes orders in real-time, calculates position percentages, and stores them in Redis streams for downstream processing.

## Features

- 🔍 Monitors order history for multiple wallet addresses dynamically
- 📡 Real-time WebSocket connection to Kana Labs
- 🔄 Fetches initial addresses from Redis `profiles:active` set
- 📊 Displays order details (market, type, price, size, leverage, etc.)
- 🔄 Automatic reconnection on connection loss with exponential backoff
- ⚡ Low latency order processing with batch deduplication
- 🧮 **Percentage Calculation System** for all order types
- 🔐 **Duplicate Prevention** - In-memory and Redis-based deduplication
- 📈 **API Integration** - Balance and positions fetching from Kana Labs
- 💾 **Redis Stream Storage** - All orders stored in `orders:stream` with percentage

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

| Variable       | Required | Description                          | Default                                      |
| -------------- | -------- | ------------------------------------ | -------------------------------------------- |
| `KANA_API_KEY` | Yes      | Your Kana Labs API key               | -                                            |
| `REDIS_HOST`   | No       | Redis server host                    | `localhost`                                  |
| `REDIS_PORT`   | No       | Redis server port                    | `6379`                                       |
| `NODE_ENV`     | No       | Environment (development/production) | `development`                                |
| `KANA_REST`    | No       | Kana Labs REST API URL               | `https://perps-tradeapi.kana.trade`          |
| `KANA_WS`      | No       | Kana Labs WebSocket URL              | `wss://perpetuals-indexer-ws.kana.trade/ws/` |

## How It Works

1. **Redis Integration**: The service connects to Redis and reads the `profiles:active` set, which contains active trader wallet addresses
2. **Initial Load**: Fetches all active addresses from Redis on startup
3. **Profile Resolution**: For each wallet address, the service fetches the corresponding profile address from Kana Labs API using `getProfileAddress` endpoint
4. **WebSocket Connection**: Establishes a WebSocket connection to Kana Labs perpetuals indexer
5. **Subscription**: Subscribes to order history updates for all active profile addresses
6. **Order Processing**: When orders are received:
   - Filters orders by status (only "Open" orders)
   - Checks timestamp (only orders after service start)
   - Deduplicates using transaction version
   - Calculates percentage based on order type
   - Stores in Redis stream with percentage
7. **Real-time Updates**: Processes and displays new orders in real-time as they are received

## Redis Integration

### Redis Keys Used

1. **`profiles:active`** (SET)
   - Contains active trader wallet addresses
   - Managed by API service when copy trade bots start/stop
   - WS service reads this on startup and subscribes to all addresses

2. **`profiles:not_synced`** (SET)
   - Contains trader addresses that need to be synced
   - API service adds addresses here when bots start
   - WS service processes these and moves them to `profiles:active`

3. **`orders:stream`** (STREAM)
   - Stores all processed orders with full details
   - Each entry includes: order data + calculated percentage
   - Used for deduplication (checks last 100 entries)
   - Can be consumed by other services for order processing

4. **`ws:check`** (PUB/SUB Channel)
   - API service publishes signals here when new addresses need processing
   - WS service subscribes and processes `profiles:not_synced` addresses

### Redis Operations

- **XADD**: Adds orders to `orders:stream` with auto-generated IDs
- **XREVRANGE**: Reads recent entries for deduplication (last 100 entries)
- **SMEMBERS**: Reads active/not_synced profile sets
- **SADD/SREM**: Manages profile sets (moved to active after sync)
- **PUB/SUB**: Real-time communication with API service

### Deduplication Strategy

1. **In-Memory Cache**: Tracks processed transaction versions (5-minute TTL)
2. **Batch Deduplication**: Prevents duplicates within a single message batch
3. **Redis Check**: Verifies against last 100 entries in stream before adding
4. **Transaction Version**: Uses `transaction_version` or `order_id` as unique identifier

## Order Types Reference

The service handles 8 different order types:

| Type | Name           | Description                       | Percentage Calculation |
| ---- | -------------- | --------------------------------- | ---------------------- |
| 1    | OPEN_LONG      | Opens a new long position         | Balance API            |
| 2    | OPEN_SHORT     | Opens a new short position        | Balance API            |
| 3    | INCREASE_LONG  | Increases existing long position  | Balance API            |
| 4    | INCREASE_SHORT | Increases existing short position | Balance API            |
| 5    | DECREASE_LONG  | Reduces existing long position    | Positions API          |
| 6    | DECREASE_SHORT | Reduces existing short position   | Positions API          |
| 7    | CLOSE_LONG     | Closes existing long position     | 100% (direct)          |
| 8    | CLOSE_SHORT    | Closes existing short position    | 100% (direct)          |

## Order Information Displayed

For each order, the service displays:

- 📅 Timestamp
- 🆔 Order ID
- 👤 Wallet Address
- 📊 Market (e.g., BTC-USD, ETH-USD)
- 📈 Order Type (1-8: Open/Increase/Decrease/Close positions)
- 💰 Price
- 📏 Size
- ⚡ Leverage
- 📊 Status
- 📍 Profile Address
- 📈 **Percentage** (calculated based on order type)
- 💵 Order Value (for types 1-4)

## Percentage Calculation System

The service calculates and stores a `percentage` field for each order based on the order type:

### Order Types 1-4: Open/Increase Positions

**Calculation Method:**

1. Fetches user balance from `getProfileBalanceSnapshot` API (requires wallet address)
2. Calculates:
   - `user_trade = order_value / leverage`
   - `user_real_balance = balance + user_trade`
   - `percentage = (user_trade / user_real_balance) * 100`

**Example:**

```
Balance: 100 USDT
Order Value: 50 USDT
Leverage: 10x
→ user_trade = 50 / 10 = 5
→ user_real_balance = 100 + 5 = 105
→ percentage = (5 / 105) * 100 = 4.761905%
```

### Order Types 5-6: Decrease Positions

**Calculation Method:**

1. Fetches positions from `getPositions` API (requires wallet address and market_id)
2. Finds matching position for the order's market
3. Calculates:
   - `ws_order_size = order.size` (from WebSocket)
   - `available_order_size = position.available_order_size` (from API)
   - `total_size = ws_order_size + available_order_size`
   - `percentage = (ws_order_size / total_size) * 100`

**Example:**

```
WS Order Size: 0.5
Available Order Size: 1.5
→ total_size = 0.5 + 1.5 = 2.0
→ percentage = (0.5 / 2.0) * 100 = 25.000000%
```

### Order Types 7-8: Close Positions

**Calculation Method:**

- Percentage is set directly to **100%** (no calculation needed)
- These orders close entire positions, so percentage is always 100%

## API Integrations

The service integrates with Kana Labs REST API:

### 1. Get Profile Address

- **Endpoint**: `GET /getProfileAddress?userAddress={walletAddress}`
- **Purpose**: Resolves profile address from wallet address
- **Used**: When adding new wallets to monitoring

### 2. Get Profile Balance Snapshot

- **Endpoint**: `GET /getProfileBalanceSnapshot?userAddress={walletAddress}`
- **Purpose**: Fetches user's trading account balance
- **Used**: For order types 1-4 percentage calculation
- **Note**: Requires **wallet address**, not profile address

### 3. Get Positions

- **Endpoint**: `GET /getPositions?userAddress={walletAddress}&marketId={marketId}`
- **Purpose**: Fetches open positions for a user
- **Used**: For order types 5-6 percentage calculation
- **Note**: Requires **wallet address**, not profile address

**Base URL**: `https://perps-tradeapi.kana.trade` (Mainnet)

## Service Lifecycle

### Startup Sequence

1. **Validate Configuration**: Check required environment variables
2. **Connect to Redis**: Wait for connection (max 10 retries, 1s intervals)
3. **Load Active Profiles**: Read `profiles:active` set from Redis
4. **Resolve Profile Addresses**: Fetch profile addresses for all wallet addresses
5. **Connect WebSocket**: Establish connection to Kana Labs
6. **Subscribe to Orders**: Subscribe to all resolved profile addresses
7. **Process Not-Synced**: Check and process any addresses in `profiles:not_synced`
8. **Subscribe to Signals**: Listen to `ws:check` channel for new addresses

### Runtime Operations

- **Order Processing**: Continuous processing of incoming orders
- **Dynamic Wallet Management**: Add/remove wallets without restart
- **Reconnection Handling**: Automatic reconnection with exponential backoff
- **Health Monitoring**: Ping/pong keepalive every 60 seconds

### Shutdown Sequence

1. **Receive Signal**: SIGTERM or SIGINT
2. **Stop Monitoring**: Close WebSocket connection
3. **Cleanup Timers**: Clear ping interval and debounce timers
4. **Disconnect Redis**: Close all Redis connections
5. **Exit Process**: Graceful shutdown

## Order Processing Flow

```
1. WebSocket receives order message
   ↓
2. Parse and validate message structure
   - Check for "order_history" message type
   - Validate data array exists
   ↓
3. Filter orders:
   - Status must be "Open"
   - Timestamp after service start (30-second buffer)
   - Address must be in monitored profiles (profileToWallet map)
   ↓
4. Deduplication checks (multi-layer):
   a. Within batch: Check processedInBatch Set
   b. In-memory cache: Check processedTransactions Map (5-min TTL)
   c. Redis stream: Check last 100 entries for transaction_version
   ↓
5. Calculate percentage based on order type:
   - Types 1-4:
     * Get wallet address from profile address
     * Fetch balance from getProfileBalanceSnapshot API
     * Calculate: percentage = (user_trade / user_real_balance) * 100
   - Types 5-6:
     * Get wallet address from profile address
     * Fetch positions from getPositions API
     * Find matching position by market_id
     * Calculate: percentage = (ws_order_size / total_size) * 100
   - Types 7-8:
     * Set percentage = 100% directly
   ↓
6. Store in Redis stream:
   - Convert order to Record<string, string>
   - Add percentage field
   - Use XADD to add to orders:stream
   ↓
7. Display in console (development mode only):
   - Order details
   - Calculation steps (for types 1-6)
   - Percentage value
```

## Error Handling

- **API Failures**: If balance/positions API fails, order is still stored without percentage
- **WebSocket Errors**: Automatic reconnection with exponential backoff (max 10 attempts)
- **Redis Errors**: Logged but don't stop order processing
- **Missing Wallet Mapping**: Warns and skips percentage calculation if wallet address not found

## Performance Optimizations

- ✅ **Batch Processing**: Processes multiple orders in parallel
- ✅ **Fast Filters**: Early exit for invalid orders (status, timestamp, address)
- ✅ **In-Memory Cache**: Reduces Redis lookups for recent transactions
- ✅ **Efficient Redis Queries**: Only checks last 100 stream entries for deduplication
- ✅ **Connection Pooling**: Separate Redis connections for pub/sub and operations
- ✅ **Optimized Logging**: Console logs only in development mode

## Troubleshooting

### Connection Issues

- Verify your `KANA_API_KEY` is correct
- Check that Redis is running and accessible
- Ensure your network can reach the Kana Labs WebSocket endpoint
- Verify mainnet URL: `https://perps-tradeapi.kana.trade`

### No Orders Showing

- The service only shows NEW orders created after it starts
- Historical orders are filtered out (30-second buffer)
- Verify that addresses exist in Redis `profiles:active` set
- Check that the target addresses have recent trading activity
- Ensure profile addresses are correctly resolved from wallet addresses

### Percentage Calculation Issues

- **Types 1-4**: Verify wallet address mapping exists (check logs for warnings)
- **Types 5-6**: Ensure position exists for the market (check API response)
- **API Errors**: Check API key and network connectivity
- **400 Errors**: Usually means wrong address type (wallet vs profile)

### Redis Connection Issues

- Verify Redis is running: `redis-cli ping` (should return `PONG`)
- Check `REDIS_HOST` and `REDIS_PORT` environment variables
- Ensure Redis is accessible from the service
- Check Redis logs: `docker logs redis-anthe` (if using Docker)

### Duplicate Orders

- Check in-memory cache TTL (5 minutes)
- Verify transaction version is unique
- Check Redis stream for existing entries
- Review deduplication logs in console

## Project Structure

```
apps/ws/
├── src/
│   ├── config/
│   │   └── index.ts              # Configuration and environment variables
│   │                             # - Kana Labs API URLs (mainnet)
│   │                             # - Redis connection settings
│   │                             # - Environment validation
│   ├── constants/
│   │   └── index.ts              # Application constants
│   │                             # - WebSocket config (reconnect, ping intervals)
│   ├── services/
│   │   ├── orderHistoryService.ts # Main service
│   │   │                          # - WebSocket connection management
│   │   │                          # - Order processing and filtering
│   │   │                          # - Percentage calculation (all types)
│   │   │                          # - Profile/wallet address mapping
│   │   │                          # - API integrations (balance, positions)
│   │   └── redis.service.ts      # Redis client service
│   │                             # - Stream operations (XADD, XREVRANGE)
│   │                             # - Set operations (SMEMBERS, SADD, SREM)
│   │                             # - Pub/Sub subscriptions
│   │                             # - Deduplication checks
│   ├── types/
│   │   └── index.ts              # TypeScript type definitions
│   │                             # - OrderData interface
│   │                             # - ServiceStatus interface
│   ├── utils/
│   │   └── logger.ts             # Logging utility
│   │                             # - Timestamped logs
│   │                             # - Error/warning/success formatting
│   │                             # - Development mode filtering
│   └── server.ts                 # Server entry point
│                                 # - Service initialization
│                                 # - Redis connection handling
│                                 # - Signal handlers (SIGTERM, SIGINT)
│                                 # - Not-synced address processing
├── dist/                         # Compiled JavaScript (generated)
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # This file
```

## Key Components

### OrderHistoryService

Main service class that handles:

- WebSocket connection lifecycle
- Order subscription management
- Percentage calculation logic
- API calls (balance, positions)
- Wallet ↔ Profile address mapping

**Key Methods:**

- `startMonitoring()` - Initialize service with wallet addresses
- `addWallet()` - Dynamically add new wallet to monitor
- `removeWallet()` - Remove wallet from monitoring
- `processOrders()` - Process and calculate percentages
- `getProfileBalance()` - Fetch balance from API
- `getPositions()` - Fetch positions from API

### RedisService

Handles all Redis operations:

- Stream operations for order storage
- Set operations for profile management
- Pub/Sub for real-time updates
- Deduplication checks

**Key Methods:**

- `addOrderToStream()` - Store order in Redis stream
- `transactionVersionExists()` - Check for duplicates
- `getActiveProfiles()` - Get active trader addresses
- `getNotSyncedProfiles()` - Get addresses needing sync
- `moveToActive()` - Move address from not_synced to active
- `subscribeToChannel()` - Subscribe to pub/sub channels

## License

UNLICENSED
