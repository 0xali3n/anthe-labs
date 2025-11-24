export interface OrderData {
  address: string;
  market_id: string;
  order_type: number;
  price: string;
  size: string;
  leverage: number;
  order_id: string;
  timestamp: string;
  status: string;
  transaction_version?: string | number;
  [key: string]: any; // Allow additional fields from WebSocket
}

export interface ServiceStatus {
  isMonitoring: boolean;
  monitoredWalletsCount: number;
  reconnectAttempts: number;
}
