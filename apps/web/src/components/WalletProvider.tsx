"use client";

import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";
import { ReactNode } from "react";

interface WalletProviderProps {
  children: ReactNode;
}

export default function WalletProvider({ children }: WalletProviderProps) {
  // Use mainnet by default, but can be configured via environment variable
  // NEXT_PUBLIC_* env vars are available in client components in Next.js
  const network = (process.env.NEXT_PUBLIC_APTOS_NETWORK as Network) || Network.MAINNET;

  return (
    <AptosWalletAdapterProvider
      network={network}
      autoConnect={false}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}

