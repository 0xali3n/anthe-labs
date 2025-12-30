/**
 * TypeScript declarations for Aptos wallet browser extensions
 * Supports both legacy API and Wallet Standard API
 */

// Wallet Standard interface
interface WalletStandardAccount {
  address: string;
  publicKey?: Uint8Array;
  chains?: string[];
  features?: string[];
}

interface WalletStandardConnectResult {
  accounts: WalletStandardAccount[];
}

interface WalletStandardFeature {
  connect: () => Promise<WalletStandardConnectResult>;
  disconnect?: () => Promise<void>;
  account?: () => Promise<WalletStandardAccount>;
}

interface WalletStandardWallet {
  name: string;
  icon?: string;
  version?: string;
  features: {
    "standard:connect"?: WalletStandardFeature;
    [key: string]: any;
  };
}

interface Navigator {
  wallets?: WalletStandardWallet[];
}

interface Window {
  // Legacy Petra API (deprecated, but may still work)
  aptos?: {
    connect: () => Promise<{ address?: string; accounts?: WalletStandardAccount[] } | void>;
    account: () => Promise<string | { address: string }>;
    disconnect?: () => Promise<void>;
    isConnected?: () => Promise<boolean>;
    network?: () => Promise<string>;
  };
  martian?: {
    connect: () => Promise<{ address?: string } | void>;
    account: () => Promise<string | { address: string }>;
    disconnect?: () => Promise<void>;
    isConnected?: () => Promise<boolean>;
  };
  pontem?: {
    connect: () => Promise<{ address?: string } | void>;
    account: () => Promise<string | { address: string }>;
    disconnect?: () => Promise<void>;
    isConnected?: () => Promise<boolean>;
  };
  fewcha?: {
    connect: () => Promise<{ address?: string } | void>;
    account: () => Promise<string | { address: string }>;
    disconnect?: () => Promise<void>;
    isConnected?: () => Promise<boolean>;
  };
  okxwallet?: {
    aptos?: {
      connect: () => Promise<{ address?: string } | void>;
      account: () => Promise<string | { address: string }>;
      disconnect?: () => Promise<void>;
      isConnected?: () => Promise<boolean>;
    };
  };
}

