# WebSocket Service (WS)

Real-time WebSocket service for the Anthé Labs platform.

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Start development server:
```bash
pnpm run dev
```

Or from root:
```bash
pnpm run dev:ws
```

3. Build for production:
```bash
pnpm run build
pnpm start
```

## Configuration

- **Port**: 3002 (default, configurable via `PORT` env variable)
- **Host**: localhost (configurable via `HOST` env variable)

## Usage

Connect to the WebSocket server:
```
ws://localhost:3002
```

### Example Client Connection

```javascript
const ws = new WebSocket('ws://localhost:3002');

ws.onopen = () => {
  console.log('Connected');
  ws.send(JSON.stringify({ type: 'ping', message: 'Hello' }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

## Message Format

Messages should be JSON strings:

```json
{
  "type": "message_type",
  "data": {}
}
```

The server will echo back messages with a timestamp.

