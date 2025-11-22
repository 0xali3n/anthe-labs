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
}

export interface OrderTypeInfo {
  isBuy: boolean;
  isSell: boolean;
  isExit: boolean;
  isLong: boolean;
  isShort: boolean;
}

export interface ServiceStatus {
  isMonitoring: boolean;
  targetProfileAddress: string | null;
  trackedOrdersCount: number;
  reconnectAttempts: number;
}

