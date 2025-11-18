/**
 * TypeScript declarations for Aptos wallet browser extensions
 */

interface Window {
  aptos?: {
    connect: () => Promise<{ address?: string } | void>;
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

