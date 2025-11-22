import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

const PORT = process.env.PORT || 3002;
const HOST = process.env.HOST || 'localhost';

// Create HTTP server
const server = createServer();

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Store connected clients
const clients = new Set<WebSocket>();

// Handle WebSocket connections
wss.on('connection', (ws: WebSocket) => {
  console.log('✅ New WebSocket client connected');
  clients.add(ws);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to WebSocket server',
    timestamp: new Date().toISOString(),
  }));

  // Handle incoming messages
  ws.on('message', (message: Buffer) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('📨 Received message:', data);

      // Echo message back to client
      ws.send(JSON.stringify({
        type: 'echo',
        original: data,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('❌ Error parsing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid JSON format',
        timestamp: new Date().toISOString(),
      }));
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    console.log('👋 WebSocket client disconnected');
    clients.delete(ws);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
    clients.delete(ws);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 WebSocket server running on ws://${HOST}:${PORT}`);
  console.log(`📡 Listening for connections...`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, closing server...');
  wss.close(() => {
    console.log('✅ WebSocket server closed');
    server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, closing server...');
  wss.close(() => {
    console.log('✅ WebSocket server closed');
    server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });
  });
});

