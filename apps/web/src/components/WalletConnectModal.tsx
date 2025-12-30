"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Wallet, Loader } from "lucide-react";
import { useWallet, WalletReadyState, groupAndSortWallets } from "@aptos-labs/wallet-adapter-react";

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (address: string, walletName: string) => void;
}

export default function WalletConnectModal({
  isOpen,
  onClose,
  onConnect,
}: WalletConnectModalProps) {
  const { connect, wallets = [], notDetectedWallets = [], account, connected, wallet } = useWallet();
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasCalledOnConnect = useRef(false);
  const connectionAttemptRef = useRef<string | null>(null);

  // Group and sort wallets using the official adapter utility
  const { aptosConnectWallets, availableWallets, installableWallets } = groupAndSortWallets([
    ...wallets,
    ...notDetectedWallets,
  ]);

  // Filter out social login wallets - only show browser extension wallets
  const socialWalletNames = ["google", "apple", "cosmostation", "continue with"];
  const isSocialWallet = (walletName: string) => 
    socialWalletNames.some(name => walletName.toLowerCase().includes(name));

  // Only include browser extension wallets (exclude social login wallets)
  const browserWallets = [
    ...availableWallets.filter(w => !isSocialWallet(w.name)),
    ...installableWallets.filter(w => !isSocialWallet(w.name)),
  ];

  // Separate Petra (main wallet) from others
  const petraWallet = browserWallets.find((w) => 
    w.name.toLowerCase().includes("petra") || w.name === "Petra"
  );
  const otherWallets = browserWallets.filter((w) => 
    !w.name.toLowerCase().includes("petra") && w.name !== "Petra"
  );

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setConnectingWallet(null);
      hasCalledOnConnect.current = false;
      connectionAttemptRef.current = null;
    }
  }, [isOpen]);

  // Memoize the onConnect callback to prevent useEffect re-runs
  const handleOnConnect = useCallback((address: string, walletName: string) => {
    if (!hasCalledOnConnect.current) {
      hasCalledOnConnect.current = true;
      setConnectingWallet(null);
      connectionAttemptRef.current = null;
      
      // Call the parent's onConnect callback
      onConnect(address, walletName);
      
      // Wait before closing to ensure wallet extension popup has time to appear/close
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  }, [onConnect, onClose]);

  // Helper function to convert address to string
  const convertAddressToString = (address: any): string | null => {
    if (!address) return null;
    
    // If it's already a string, return it
    if (typeof address === 'string') {
      return address;
    }
    
    // If it's an object with a toString method, try it first
    if (address && typeof address === 'object') {
      try {
        if (typeof address.toString === 'function') {
          const str = address.toString();
          if (typeof str === 'string' && str.length > 0 && str.startsWith('0x')) {
            return str;
          }
        }
        
        // Manual Uint8Array to hex conversion
        if (address.data && address.data instanceof Uint8Array) {
          const uint8Array = address.data;
          const hex = [...uint8Array]
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
          return '0x' + hex;
        }
      } catch (e) {
        // Continue to next conversion method
      }
    }
    
    // If it's a Uint8Array directly
    if (address instanceof Uint8Array) {
      const hex = [...address]
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return '0x' + hex;
    }
    
    return null;
  };

  // Watch for successful connection - this is the primary way to detect connection
  useEffect(() => {
    // Only proceed if:
    // 1. We have a connection and wallet
    // 2. We haven't already called onConnect
    // 3. We're actually in a connection attempt (connectingWallet is set)
    // 4. Modal is still open
    if (connected && wallet && !hasCalledOnConnect.current && connectingWallet && isOpen) {
      // Get address from account or wallet accounts
      const rawAddress = account?.address || (wallet.accounts && wallet.accounts[0]?.address);
      
      // Convert address to string (handles both string and object formats)
      const address = convertAddressToString(rawAddress);
      
      if (address && typeof address === 'string' && address.length > 0) {
        handleOnConnect(address, wallet.name);
      } else {
        // If address conversion fails, don't close modal - let user try again
        setError("Failed to get wallet address. Please try again.");
        setConnectingWallet(null);
        hasCalledOnConnect.current = false;
        connectionAttemptRef.current = null;
      }
    }
  }, [connected, account, wallet, handleOnConnect, connectingWallet, isOpen]);

  const handleConnect = async (walletName: string) => {
    // Prevent multiple simultaneous connection attempts
    if (connectionAttemptRef.current === walletName || connectingWallet) {
      return;
    }

    // Reset the flag
    hasCalledOnConnect.current = false;
    connectionAttemptRef.current = walletName;
    setConnectingWallet(walletName);
    setError(null);

    try {
      // Connect to the wallet - this should trigger the wallet extension popup
      // The promise will resolve when user approves/rejects in the wallet extension
      await connect(walletName as any);
      
      // Wait a bit for the wallet adapter state to update after user approval
      // The wallet extension popup might take a moment to close
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // The useEffect above will handle calling onConnect when the state updates
    } catch (error: any) {
      // Check if user rejected
      if (error.code === 4001 || error.message?.includes("reject") || error.message?.includes("denied")) {
        setError("Connection rejected. Please try again and approve the connection in your wallet.");
      } else {
        setError(error.message || "Failed to connect wallet");
      }
      
      setConnectingWallet(null);
      hasCalledOnConnect.current = false;
      connectionAttemptRef.current = null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pt-20 sm:pt-24">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal - Premium Professional Design */}
      <div 
        className="relative w-full max-w-md bg-slate-900/98 border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden z-10"
        style={{
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) inset, 0 1px 2px 0 rgba(0, 0, 0, 0.3)",
        }}
      >
        {/* Subtle premium gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.02] via-transparent to-purple-500/[0.02] pointer-events-none" />
        
        {/* Header - Premium */}
        <div className="relative flex items-center justify-between px-6 py-5 border-b border-slate-800/60 bg-slate-900/50">
          <h2 className="text-lg font-semibold text-white tracking-tight">
            Connect Wallet
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800/60 rounded-lg transition-all duration-200 group"
          >
            <X size={18} className="text-slate-400 group-hover:text-white transition-colors" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-950/40 border border-red-800/60 rounded-lg p-3.5 backdrop-blur-sm">
              <p className="text-red-400 text-sm font-medium">{error}</p>
            </div>
          )}

          {browserWallets.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-center mx-auto mb-4">
                <Wallet size={32} className="text-slate-500" />
              </div>
              <h3 className="text-base font-semibold text-slate-200 mb-1.5">
                No Wallets Found
              </h3>
              <p className="text-slate-400 text-sm">
                Please install an Aptos wallet extension.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Featured Wallet - Petra (Premium Styling) */}
              {petraWallet && (
                <button
                  onClick={() => handleConnect(petraWallet.name)}
                  disabled={connectingWallet !== null || petraWallet.readyState !== WalletReadyState.Installed}
                  className="relative w-full flex items-center gap-4 p-5 bg-gradient-to-br from-slate-800/50 via-slate-800/40 to-slate-900/50 hover:from-slate-800/70 hover:via-slate-800/60 hover:to-slate-900/70 border border-slate-700/60 hover:border-blue-500/30 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden"
                  style={{
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
                  }}
                >
                  {/* Premium hover effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Wallet Icon */}
                  <div 
                    className="relative w-14 h-14 rounded-xl bg-slate-900/80 border border-slate-700/60 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:scale-105 group-hover:border-slate-600/80 transition-all duration-300"
                    style={{
                      boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)",
                    }}
                  >
                    {petraWallet.icon ? (
                      <img
                        src={petraWallet.icon}
                        alt={petraWallet.name}
                        className="w-10 h-10 object-contain"
                      />
                    ) : (
                      <span className="text-2xl">🦎</span>
                    )}
                  </div>
                  
                  {/* Wallet Info */}
                  <div className="text-left flex-1 min-w-0 relative z-10">
                    <div className="flex items-center gap-2.5 mb-1">
                      <h3 className="text-base font-semibold text-white group-hover:text-blue-400 transition-colors duration-200">
                        {petraWallet.name}
                      </h3>
                      {petraWallet.readyState === WalletReadyState.Installed && (
                        <span 
                          className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/30 rounded-md text-xs font-medium text-blue-400"
                          style={{
                            boxShadow: "0 1px 2px rgba(59, 130, 246, 0.1)",
                          }}
                        >
                          Ready
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-medium">
                      {petraWallet.readyState === WalletReadyState.Installed 
                        ? "Official Aptos wallet" 
                        : "Install to continue"}
                    </p>
                  </div>
                  
                  {/* Arrow or Loading */}
                  <div className="flex-shrink-0 relative z-10">
                    {connectingWallet === petraWallet.name ? (
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                        <Loader className="animate-spin text-blue-400" size={20} />
                      </div>
                    ) : (
                      <div 
                        className="w-10 h-10 rounded-lg bg-slate-700/60 group-hover:bg-blue-500/20 border border-slate-600/50 group-hover:border-blue-500/30 flex items-center justify-center transition-all duration-200"
                        style={{
                          boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.2)",
                        }}
                      >
                        <div className="text-slate-400 group-hover:text-blue-400 transition-colors duration-200 text-base font-semibold">
                          →
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              )}

              {/* Other Wallets - Premium Grid */}
              {otherWallets.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700/60 to-transparent" />
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
                      More Options
                    </p>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700/60 to-transparent" />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {otherWallets.map((wallet) => {
                      const isWalletReady = wallet.readyState === WalletReadyState.Installed;
                      const isConnecting = connectingWallet === wallet.name;

                      return (
                        <button
                          key={wallet.name}
                          onClick={() => handleConnect(wallet.name)}
                          disabled={connectingWallet !== null || !isWalletReady}
                          className="group flex flex-col items-center justify-center p-3.5 bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/60 hover:border-slate-600/70 rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden"
                          style={{
                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
                          }}
                        >
                          {/* Premium hover effect */}
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-blue-500/3 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                          
                          {/* Wallet Icon */}
                          <div 
                            className="relative w-11 h-11 rounded-lg bg-slate-900/70 border border-slate-700/60 flex items-center justify-center overflow-hidden mb-2.5 group-hover:scale-105 transition-transform duration-200"
                            style={{
                              boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.3)",
                            }}
                          >
                            {wallet.icon ? (
                              <img
                                src={wallet.icon}
                                alt={wallet.name}
                                className="w-7 h-7 object-contain"
                              />
                            ) : (
                              <span className="text-lg">🔷</span>
                            )}
                          </div>
                          
                          {/* Wallet Name */}
                          <div className="text-center w-full relative z-10">
                            <div className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors duration-200 mb-1 truncate">
                              {wallet.name.replace(" Wallet", "").replace("Wallet", "")}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {isConnecting ? (
                                <Loader className="animate-spin text-blue-400 mx-auto" size={10} />
                              ) : isWalletReady ? (
                                "Ready"
                              ) : (
                                "Install"
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Premium */}
        <div 
          className="px-6 py-4 border-t border-slate-800/60 bg-slate-900/40"
          style={{
            backdropFilter: "blur(8px)",
          }}
        >
          <p className="text-[10px] text-slate-500 text-center leading-relaxed">
            By connecting, you agree to our{" "}
            <span className="text-blue-400 hover:text-blue-300 cursor-pointer transition-colors duration-200 font-medium">Terms</span>
            {" "}and{" "}
            <span className="text-blue-400 hover:text-blue-300 cursor-pointer transition-colors duration-200 font-medium">Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  );
}
