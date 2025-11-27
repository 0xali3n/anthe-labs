# Redis Stream JSON Specification for Trade Execution

## Overview
This document specifies the exact JSON structure that should be pushed to `orders:stream` in Redis for the trade service to execute trades directly without any conversion.

## Required Fields for All Orders

### Core Identification
- **`address`** (string, required): Profile address of the trader who initiated the order
  - Example: `"0x7a38039fffd016adcac2c53795ee49325e5ec6fddf3bf02651c09f9a583655a6"`

### Order Type & Execution
- **`orderType`** (string, required): Type of order to place
  - `"MARKET"` - Market order (immediate execution)
  - `"LIMIT"` - Limit order (executes at specific price)
  - `"STOP"` - Stop order (triggers at stop price)
  
- **`tradeSide`** (string, required): Trade side (already converted, no calculation needed)
  - `"true"` - Long position
  - `"false"` - Short position

- **`direction`** (string, required): Position direction (already converted, no calculation needed)
  - `"false"` - Open position
  - `"true"` - Close position

### Market & Size
- **`marketId`** (string, required): Market ID where order will be placed
  - Example: `"15"` (BTC-USD), `"14"` (APT-USD), `"16"` (ETH-USD)

- **`size`** (string, required): Size of the order (as number string)
  - Example: `"0.00023"`, `"1000"`

- **`leverage`** (string, required): Leverage to use (as number string)
  - Example: `"20"`, `"10"`, `"5"`

### Optional Fields (for Limit/Stop Orders)
- **`price`** (string, optional): Price for limit/stop orders
  - Example: `"89846.00"`
  - Required for LIMIT and STOP orders
  - Not needed for MARKET orders

- **`restriction`** (string, optional): Order restriction type
  - Default: `"0"` (no restriction)
  - Other values depend on Kana Labs API

- **`takeProfit`** (string, optional): Take profit value
  - Default: `"0"` if not provided

- **`stopLoss`** (string, optional): Stop loss value
  - Default: `"0"` if not provided

### Additional Metadata (Optional but Recommended)
- **`percentage`** (string, optional): Percentage of trader's balance used (for scaling subscriber trades)
  - Example: `"14.911941"` (14.91%)
  - Used to calculate subscriber trade size

- **`order_value`** (string, optional): Total order value
  - Example: `"18.0014"`

- **`timestamp`** (string, optional): Order timestamp
  - Example: `"1701234567"`

- **`order_id`** (string, optional): Unique order identifier
  - Example: `"12345"`

- **`transaction_version`** (string, optional): Transaction version for deduplication
  - Example: `"987654321"`

## Example JSON Structures

### Market Order (Long, Open)
```json
{
  "address": "0x7a38039fffd016adcac2c53795ee49325e5ec6fddf3bf02651c09f9a583655a6",
  "orderType": "MARKET",
  "tradeSide": "true",
  "direction": "false",
  "marketId": "15",
  "size": "0.00023",
  "leverage": "20",
  "percentage": "14.911941",
  "order_value": "18.0014"
}
```

### Market Order (Short, Open)
```json
{
  "address": "0x7a38039fffd016adcac2c53795ee49325e5ec6fddf3bf02651c09f9a583655a6",
  "orderType": "MARKET",
  "tradeSide": "false",
  "direction": "false",
  "marketId": "15",
  "size": "0.00023",
  "leverage": "20",
  "percentage": "14.911941"
}
```

### Market Order (Exit Long)
```json
{
  "address": "0x7a38039fffd016adcac2c53795ee49325e5ec6fddf3bf02651c09f9a583655a6",
  "orderType": "MARKET",
  "tradeSide": "true",
  "direction": "true",
  "marketId": "15",
  "size": "0.00023",
  "leverage": "20",
  "percentage": "100.000000"
}
```

### Limit Order (Long, Open)
```json
{
  "address": "0x7a38039fffd016adcac2c53795ee49325e5ec6fddf3bf02651c09f9a583655a6",
  "orderType": "LIMIT",
  "tradeSide": "true",
  "direction": "false",
  "marketId": "15",
  "size": "0.00023",
  "leverage": "20",
  "price": "89846.00",
  "restriction": "0",
  "percentage": "14.911941"
}
```

## Order Type Mapping (for reference)

If you're converting from numeric order types, here's the mapping:

| Numeric Type | orderType | tradeSide | direction | Description |
|-------------|-----------|-----------|-----------|-------------|
| 1 | MARKET | true | false | Market Buy (Long Open) |
| 2 | LIMIT | true | false | Limit Buy (Long Open) |
| 3 | STOP | true | false | Stop Buy (Long Open) |
| 4 | MARKET | false | false | Market Sell (Short Open) |
| 5 | LIMIT | false | false | Limit Sell (Short Open) |
| 6 | STOP | false | false | Stop Sell (Short Open) |
| 7 | MARKET | true | true | Market Exit Long |
| 8 | LIMIT | true | true | Limit Exit Long |
| 9 | STOP | true | true | Stop Exit Long |
| 10 | MARKET | false | true | Market Exit Short |
| 11 | LIMIT | false | true | Limit Exit Short |
| 12 | STOP | false | true | Stop Exit Short |

## Benefits of This Structure

1. **No Conversion Needed**: `tradeSide` and `direction` are already in the correct format
2. **Direct API Calls**: Can directly use values for Kana Labs API
3. **Type Safety**: Clear `orderType` field indicates which API endpoint to use
4. **Flexibility**: Supports market, limit, and stop orders
5. **Performance**: Eliminates calculation overhead in trade service

## Implementation Notes

- All numeric values should be strings (Redis streams store everything as strings)
- Boolean values should be strings: `"true"` or `"false"`
- The `address` field is the profile address (not wallet address)
- The trade service will:
  1. Read from `orders:stream`
  2. Get subscribers for the `address` (trader)
  3. Calculate subscriber trade size using `percentage` and `size`
  4. Place order directly using `tradeSide`, `direction`, `marketId`, `size`, `leverage`
  5. Use `orderType` to determine which API endpoint (`/placeMarketOrder` or `/placeLimitOrder`)

