/**
 * Aptos Browser Wallet Connection Utility
 * Now using the official @aptos-labs/wallet-adapter-react
 * This file provides a compatibility layer for existing code
 */

import { useWallet, WalletName } from "@aptos-labs/wallet-adapter-react";

export interface AptosWallet {
  name: string;
  icon?: string;
  iconPath?: string; // Path to icon image
  connect: () => Promise<string>; // Returns wallet address
  isInstalled: () => boolean;
}

/**
 * Hook to get wallet utilities using the official adapter
 * This replaces the old manual wallet connection approach
 */
export function useAptosWallet() {
  const { connect, disconnect, connected, account, wallet, wallets } = useWallet();

  return {
    connect,
    disconnect,
    connected,
    account,
    wallet,
    wallets,
  };
}

/**
 * Get all available Aptos wallets using the official adapter
 * This function now uses the wallet adapter's wallet registry
 */
export function getAvailableWallets(): AptosWallet[] {
  // This function is kept for backward compatibility
  // But it should be used with the useWallet hook instead
  // For now, return an empty array and let components use useWallet directly
  return [];
}

/**
 * Connect to the first available wallet
 * @deprecated Use useWallet hook from @aptos-labs/wallet-adapter-react instead
 */
export async function connectToWallet(): Promise<{
  address: string;
  walletName: string;
}> {
  throw new Error(
    "connectToWallet is deprecated. Use the useWallet hook from @aptos-labs/wallet-adapter-react instead."
  );
}

/**
 * Connect to a specific wallet by name
 * @deprecated Use useWallet hook from @aptos-labs/wallet-adapter-react instead
 */
export async function connectToSpecificWallet(
  walletName: string
): Promise<{ address: string; walletName: string }> {
  throw new Error(
    "connectToSpecificWallet is deprecated. Use the useWallet hook from @aptos-labs/wallet-adapter-react instead."
  );
}
