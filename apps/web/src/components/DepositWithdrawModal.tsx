"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Wallet,
  ArrowDown,
  ArrowUp,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import dynamic from "next/dynamic";
import { checkDepositAndAirdrop } from "@/lib/walletsApi";

// Dynamically import QRCode to avoid SSR issues
const QRCodeSVG = dynamic(
  () => import("qrcode.react").then((mod) => mod.QRCodeSVG) as any,
  { ssr: false }
) as any;

interface DepositWithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress?: string | null;
  balance?: string;
  onRefreshBalance?: () => void | Promise<void>;
  isRefreshingBalance?: boolean;
}

export default function DepositWithdrawModal({
  isOpen,
  onClose,
  walletAddress,
  balance = "0.00",
  onRefreshBalance,
  isRefreshingBalance = false,
}: DepositWithdrawModalProps) {
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const isRefreshingRef = useRef(false); // Prevent infinite loops
  const timeoutRef = useRef<NodeJS.Timeout | null>(null); // Cleanup timeouts
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Cleanup copy timeout
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Cleanup refresh timeout

  // Close modal on Escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Close modal when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Sync local ref with parent's loading state to prevent infinite loops
  useEffect(() => {
    // When parent finishes refreshing, reset our local ref
    if (!isRefreshingBalance && isRefreshingRef.current) {
      // Clear any pending timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      // Reset ref after a small delay to ensure state is stable
      const syncTimeout = setTimeout(() => {
        isRefreshingRef.current = false;
      }, 100);
      return () => clearTimeout(syncTimeout);
    }
  }, [isRefreshingBalance]);

  // Reset form state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset all form states when modal closes
      setActiveTab("deposit");
      setDepositAmount("");
      setWithdrawAmount("");
      setWithdrawAddress("");
      setCopied(false);
      setIsProcessing(false);
      isRefreshingRef.current = false;

      // Clear any pending timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = null;
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts when component unmounts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      // Clear previous timeout if exists
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false);
        copyTimeoutRef.current = null;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;
    setIsProcessing(true);
    // TODO: Implement deposit logic
    // Clear previous timeout if exists
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(async () => {
      setIsProcessing(false);
      setDepositAmount("");
      // Refresh balance after deposit
      if (onRefreshBalance && !isRefreshingRef.current) {
        isRefreshingRef.current = true;
        try {
          await onRefreshBalance();
        } catch (error) {
          console.error("Error refreshing balance after deposit:", error);
        } finally {
          isRefreshingRef.current = false;
        }
      }
      timeoutRef.current = null;
    }, 2000);
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return;
    if (!withdrawAddress || withdrawAddress.trim() === "") {
      alert("Please enter a withdrawal address");
      return;
    }
    if (parseFloat(withdrawAmount) > parseFloat(balance)) {
      alert("Insufficient balance");
      return;
    }
    setIsProcessing(true);
    // TODO: Implement withdraw logic
    // Clear previous timeout if exists
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(async () => {
      setIsProcessing(false);
      setWithdrawAmount("");
      setWithdrawAddress("");
      // Refresh balance after withdrawal
      if (onRefreshBalance && !isRefreshingRef.current) {
        isRefreshingRef.current = true;
        try {
          await onRefreshBalance();
        } catch (error) {
          console.error("Error refreshing balance after withdrawal:", error);
        } finally {
          isRefreshingRef.current = false;
        }
      }
      timeoutRef.current = null;
    }, 2000);
  };

  const quickAmounts = ["10", "50", "100", "500"];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative w-full max-w-lg rounded-2xl overflow-hidden animate-modalSlideIn"
        style={{
          background: "rgba(6, 9, 19, 0.95)",
          border: "1px solid rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          boxShadow:
            "0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <Wallet size={20} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Wallet</h2>
              <p className="text-xs text-slate-400">Manage your funds</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800/50 transition-colors text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Balance Display */}
        <div className="px-6 py-3 bg-slate-900/30 border-b border-slate-800/50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-1">Available Balance</p>
              <div className="flex items-center gap-2">
                <img
                  src="/aptos.png"
                  alt="Aptos"
                  className="h-5 w-5 rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <p className="text-2xl font-bold text-white">
                  {parseFloat(balance || "0").toFixed(2)} USDT
                </p>
              </div>
            </div>
            {/* Refresh Button - Checks deposit and triggers airdrop if first deposit */}
            <button
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Prevent multiple simultaneous calls - strict guard
                if (
                  !onRefreshBalance ||
                  isRefreshingBalance ||
                  isRefreshingRef.current
                ) {
                  return;
                }

                // Set flag immediately to prevent re-entry
                isRefreshingRef.current = true;

                // Clear any existing refresh timeout
                if (refreshTimeoutRef.current) {
                  clearTimeout(refreshTimeoutRef.current);
                  refreshTimeoutRef.current = null;
                }

                try {
                  // Check deposit and trigger airdrop if needed
                  const result = await checkDepositAndAirdrop();
                  
                  if (result.success) {
                    // Show success message if airdrop was sent
                    if (result.airdropped && result.airdropTxHash) {
                      console.log(`✅ Airdrop sent! Transaction: ${result.airdropTxHash}`);
                      // You can show a toast notification here if needed
                    }
                    
                    // Refresh balance after checking deposit
                    if (onRefreshBalance) {
                      const refreshPromise = onRefreshBalance();
                      if (
                        refreshPromise &&
                        typeof refreshPromise.then === "function"
                      ) {
                        refreshPromise.catch((error: any) => {
                          console.error("Error refreshing balance:", error);
                        });
                      }
                    }
                  } else {
                    console.error("Error checking deposit:", result.error);
                    // Still try to refresh balance even if airdrop check failed
                    if (onRefreshBalance) {
                      const refreshPromise = onRefreshBalance();
                      if (
                        refreshPromise &&
                        typeof refreshPromise.then === "function"
                      ) {
                        refreshPromise.catch((error: any) => {
                          console.error("Error refreshing balance:", error);
                        });
                      }
                    }
                  }
                } catch (error: any) {
                  console.error("Error calling check deposit:", error);
                  // If it throws synchronously, reset immediately
                  isRefreshingRef.current = false;
                  
                  // Still try to refresh balance
                  if (onRefreshBalance) {
                    try {
                      await onRefreshBalance();
                    } catch (refreshError) {
                      console.error("Error refreshing balance:", refreshError);
                    }
                  }
                }
              }}
              disabled={isRefreshingBalance || isRefreshingRef.current}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-500/50 text-blue-400 hover:text-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500/10 whitespace-nowrap"
              type="button"
            >
              {isRefreshingBalance || isRefreshingRef.current ? (
                <span className="flex items-center gap-1.5">
                  <RefreshCw size={14} className="animate-spin" />
                  Checking...
                </span>
              ) : (
                "Check Deposit"
              )}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800/50">
          <button
            onClick={() => setActiveTab("deposit")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 ${
              activeTab === "deposit"
                ? "text-white border-b-2 border-blue-500 bg-blue-500/5"
                : "text-slate-400 hover:text-white hover:bg-slate-800/30"
            }`}
          >
            <ArrowDown
              size={18}
              className={activeTab === "deposit" ? "text-blue-400" : ""}
            />
            Deposit
          </button>
          <button
            onClick={() => setActiveTab("withdraw")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 ${
              activeTab === "withdraw"
                ? "text-white border-b-2 border-blue-500 bg-blue-500/5"
                : "text-slate-400 hover:text-white hover:bg-slate-800/30"
            }`}
          >
            <ArrowUp
              size={18}
              className={activeTab === "withdraw" ? "text-blue-400" : ""}
            />
            Withdraw
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === "deposit" ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              {/* Header Text */}
              <div className="text-center space-y-1">
                <h3 className="text-base font-semibold text-white">
                  Deposit USDT
                </h3>
                <p className="text-xs text-slate-400">
                  Send USDT on Aptos network only
                </p>
              </div>

              {/* QR Code Section */}
              {walletAddress ? (
                <>
                  <div className="flex flex-col items-center space-y-2">
                    <div className="relative inline-block">
                      <div className="p-2.5 bg-white rounded-2xl border border-slate-800/30 shadow-xl">
                        {/* QR Code */}
                        <QRCodeSVG
                          value={walletAddress}
                          size={160}
                          level="H"
                          includeMargin={false}
                          fgColor="#000000"
                          bgColor="#ffffff"
                        />
                      </div>
                      {/* Logo Overlay - Centered */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                        <div className="w-12 h-12 rounded-full bg-white p-1.5 shadow-xl border border-slate-200">
                          <div className="relative w-full h-full">
                            {/* USDT Logo */}
                            <img
                              src="/usdt.png"
                              alt="USDT"
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                // Fallback to Aptos logo if USDT logo fails
                                const img = e.target as HTMLImageElement;
                                img.src = "/aptos.png";
                                img.onerror = () => {
                                  img.style.display = "none";
                                };
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 text-center max-w-xs">
                      Scan QR code with your wallet app
                    </p>
                  </div>

                  {/* Wallet Address */}
                  <div className="w-full space-y-1.5">
                    <label className="block text-xs font-medium text-slate-400 text-center">
                      Or copy wallet address
                    </label>
                    <div className="relative">
                      <div
                        className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-800/50 bg-slate-900/50"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(30,41,59,0.45), rgba(15,23,42,0.35))",
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-mono text-white break-all text-center">
                            {walletAddress}
                          </p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(walletAddress)}
                          className="p-2 rounded-lg hover:bg-slate-800/50 transition-colors text-slate-400 hover:text-white flex-shrink-0"
                          title="Copy address"
                        >
                          {copied ? (
                            <Check size={18} className="text-green-400" />
                          ) : (
                            <Copy size={18} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-48 h-48 bg-slate-800/50 rounded-xl border border-slate-800/50 flex items-center justify-center">
                    <p className="text-sm text-slate-400">
                      Generating wallet address...
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Withdraw Amount */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Amount to Withdraw (USDT)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    max={balance}
                    className="w-full px-4 py-3 rounded-xl border border-slate-800/50 bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(30,41,59,0.45), rgba(15,23,42,0.35))",
                    }}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    USDT
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-slate-500">
                    Available: {parseFloat(balance).toFixed(2)} USDT
                  </p>
                  <button
                    onClick={() => setWithdrawAmount(balance)}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Max
                  </button>
                </div>

                {/* Quick Amount Buttons */}
                <div className="flex gap-2 mt-3">
                  {quickAmounts.map((amount) => {
                    const numAmount = parseFloat(amount);
                    const numBalance = parseFloat(balance);
                    const isDisabled = numAmount > numBalance;
                    return (
                      <button
                        key={amount}
                        onClick={() => !isDisabled && setWithdrawAmount(amount)}
                        disabled={isDisabled}
                        className="flex-1 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white border border-slate-800/50 hover:border-blue-500/50 bg-slate-900/30 hover:bg-blue-500/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        ${amount}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Withdraw Address */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Withdraw to Address
                </label>
                <input
                  type="text"
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  placeholder="Enter Aptos wallet address"
                  className="w-full px-4 py-3 rounded-xl border border-slate-800/50 bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-sm"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(30,41,59,0.45), rgba(15,23,42,0.35))",
                  }}
                />
                <p className="text-xs text-slate-500 mt-2">
                  Enter the Aptos wallet address to receive funds
                </p>
              </div>

              {/* Withdraw Button */}
              <button
                onClick={handleWithdraw}
                disabled={
                  !withdrawAmount ||
                  parseFloat(withdrawAmount) <= 0 ||
                  parseFloat(withdrawAmount) > parseFloat(balance) ||
                  !withdrawAddress ||
                  withdrawAddress.trim() === "" ||
                  isProcessing
                }
                className="w-full px-4 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <ArrowUp size={18} />
                    Withdraw USDT
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
