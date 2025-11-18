"use client";

import { useState, useEffect } from "react";
import { X, Wallet, Loader, ExternalLink, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { getAvailableWallets, connectToSpecificWallet, AptosWallet } from "@/lib/aptosWallet";

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
  const [availableWallets, setAvailableWallets] = useState<AptosWallet[]>([]);
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Refresh available wallets when modal opens
      const wallets = getAvailableWallets();
      setAvailableWallets(wallets);
      setError(null);
      setConnectingWallet(null);
    }
  }, [isOpen]);

  const handleConnect = async (walletName: string) => {
    setConnectingWallet(walletName);
    setError(null);

    try {
      const result = await connectToSpecificWallet(walletName);
      onConnect(result.address, result.walletName);
      onClose();
    } catch (error: any) {
      console.error("Wallet connection error:", error);
      setError(error.message || "Failed to connect wallet");
    } finally {
      setConnectingWallet(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800/50 rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
        
        {/* Header */}
        <div className="relative flex items-center justify-between p-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center shadow-lg">
              <Wallet size={22} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Connect Wallet
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Choose a wallet to connect to Aptos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors group"
          >
            <X size={20} className="text-slate-400 group-hover:text-white transition-colors" />
          </button>
        </div>

        {/* Content */}
        <div className="relative p-6">
          {error && (
            <div className="mb-4 bg-red-900/20 border border-red-500/50 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-red-400 text-sm font-medium">{error}</p>
            </div>
          )}

          {availableWallets.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/50 border border-slate-700 flex items-center justify-center mx-auto mb-4">
                <Wallet size={32} className="text-slate-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-200 mb-2">
                No Wallets Found
              </h3>
              <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">
                Please install an Aptos wallet extension to continue.
              </p>
              <div className="space-y-3 text-left max-w-xs mx-auto">
                <a
                  href="https://petra.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/50 rounded-xl text-blue-400 hover:text-blue-300 text-sm font-medium transition-all group"
                >
                  <ExternalLink size={16} className="group-hover:scale-110 transition-transform" />
                  Install Petra Wallet
                </a>
                <a
                  href="https://www.okx.com/web3"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/50 rounded-xl text-blue-400 hover:text-blue-300 text-sm font-medium transition-all group"
                >
                  <ExternalLink size={16} className="group-hover:scale-110 transition-transform" />
                  Install OKX Wallet
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {availableWallets.map((wallet) => (
                <button
                  key={wallet.name}
                  onClick={() => handleConnect(wallet.name)}
                  disabled={connectingWallet !== null}
                  className="relative w-full flex items-center justify-between p-5 bg-gradient-to-r from-slate-800/40 to-slate-800/20 hover:from-slate-800/60 hover:to-slate-800/40 border border-slate-700/50 hover:border-slate-600/50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden"
                >
                  {/* Hover effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative flex items-center gap-4 flex-1">
                    {/* Wallet Icon */}
                    <div className="relative w-12 h-12 rounded-xl bg-slate-900/50 border border-slate-700/50 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform">
                      {wallet.iconPath ? (
                        <Image
                          src={wallet.iconPath}
                          alt={wallet.name}
                          width={32}
                          height={32}
                          className="object-contain"
                        />
                      ) : (
                        <span className="text-2xl">{wallet.icon || "🔷"}</span>
                      )}
                    </div>
                    
                    {/* Wallet Info */}
                    <div className="text-left flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                          {wallet.name}
                        </div>
                        {wallet.isInstalled() && (
                          <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-medium">
                        {wallet.isInstalled() ? "Ready to connect" : "Not installed"}
                      </div>
                    </div>
                  </div>
                  
                  {/* Arrow or Loading */}
                  <div className="relative flex-shrink-0 ml-4">
                    {connectingWallet === wallet.name ? (
                      <Loader className="animate-spin text-blue-400" size={20} />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-slate-700/50 group-hover:bg-blue-500/20 flex items-center justify-center transition-all">
                        <div className="text-slate-400 group-hover:text-blue-400 transition-colors font-bold">
                          →
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="relative p-4 border-t border-slate-800/50 bg-slate-900/30 backdrop-blur-sm rounded-b-2xl">
          <p className="text-xs text-slate-400 text-center font-medium">
            By connecting, you agree to our{" "}
            <span className="text-blue-400 hover:text-blue-300 cursor-pointer">Terms of Service</span>
            {" "}and{" "}
            <span className="text-blue-400 hover:text-blue-300 cursor-pointer">Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  );
}

