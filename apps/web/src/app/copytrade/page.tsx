"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { getUSDTBalance } from "@/lib/walletsApi";
import {
  createCopyTradeBot,
  getMyCopyTradeBots,
  updateCopyTradeBot,
  type CopyTradeBot as ApiCopyTradeBot,
} from "@/lib/copyTradeBotsApi";
import {
  Play,
  Square,
  Info,
  Wallet,
  Settings,
  AlertCircle,
  Loader,
  Copy,
  CheckCircle2,
  XCircle,
  Sparkles,
  Zap,
  BarChart3,
  Plus,
  X,
  RefreshCw,
  ChevronDown,
  Minus,
  Percent,
  ArrowRight,
} from "lucide-react";

interface CopyTradeBot {
  id: string;
  traderAddress: string | null;
  mode: string;
  allocation: number;
  allocatedAmount: string;
  status: "running" | "stopped";
  pnl: string;
  trades: number;
  startedAt: string;
}

export default function Copytrade() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<string>("0.00");
  const [traderAddress, setTraderAddress] = useState("");
  const [allocation, setAllocation] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showSmartRatioInfo, setShowSmartRatioInfo] = useState(false);
  const [showFeesInfo, setShowFeesInfo] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [tradingMode, setTradingMode] = useState("smart_ratio");
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [runningBots, setRunningBots] = useState<CopyTradeBot[]>([]);
  const [stoppedBots, setStoppedBots] = useState<CopyTradeBot[]>([]);
  const [activeTab, setActiveTab] = useState<"running" | "stopped">("running");
  const [botToRestart, setBotToRestart] = useState<CopyTradeBot | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const modeDropdownRef = useRef<HTMLDivElement>(null);

  // Validate Aptos address format
  const isValidAptosAddress = (address: string): boolean => {
    if (!address || address.trim() === "") return true; // Empty is allowed (optional field)
    // Aptos addresses: 0x followed by exactly 64 hexadecimal characters
    const aptosAddressRegex = /^0x[a-fA-F0-9]{64}$/;
    return aptosAddressRegex.test(address.trim());
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modeDropdownRef.current &&
        !modeDropdownRef.current.contains(event.target as Node)
      ) {
        setShowModeDropdown(false);
      }
    };

    if (showModeDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showModeDropdown]);

  // Fetch balance
  const fetchBalance = async () => {
    try {
      setIsRefreshingBalance(true);
      const result = await getUSDTBalance();
      if (result.success && result.balance) {
        setBalance(result.balance);
      }
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    } finally {
      setIsRefreshingBalance(false);
    }
  };

  // Use shared auth state - no need for separate auth checks
  useEffect(() => {
    // Set loading based on auth state
    setLoading(authLoading);

    // Fetch balance when signed in
    if (!authLoading && isSignedIn) {
      fetchBalance().catch(() => {
        // Ignore balance errors
      });
    } else if (!authLoading && !isSignedIn) {
      setBalance("0.00");
    }
  }, [authLoading, isSignedIn]);

  // Fetch bots from API
  const fetchBots = async () => {
    if (!isSignedIn) {
      setRunningBots([]);
      setStoppedBots([]);
      return;
    }

    try {
      const result = await getMyCopyTradeBots();
      if (result.success && result.data) {
        // Map API response to frontend interface
        const bots: CopyTradeBot[] = result.data.map((bot: ApiCopyTradeBot) => {
          const pnlNum = parseFloat(bot.pnl);
          const pnlFormatted =
            pnlNum >= 0 ? `+${pnlNum.toFixed(2)}` : pnlNum.toFixed(2);
          return {
            id: bot.id,
            traderAddress: bot.traderAddress,
            mode: bot.mode,
            allocation: parseFloat(bot.allocationPercent),
            allocatedAmount: bot.allocatedAmount,
            status: bot.status,
            pnl: pnlFormatted,
            trades: bot.totalTrades,
            startedAt: bot.startedAt,
          };
        });

        // Separate running and stopped bots
        const running = bots.filter((bot) => bot.status === "running");
        const stopped = bots.filter((bot) => bot.status === "stopped");
        setRunningBots(running);
        setStoppedBots(stopped);
      } else {
        setRunningBots([]);
        setStoppedBots([]);
      }
    } catch (error) {
      console.error("Failed to fetch bots:", error);
      setRunningBots([]);
      setStoppedBots([]);
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      fetchBots();
    } else {
      setRunningBots([]);
      setStoppedBots([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  // Handle address query parameter from leaderboard or open parameter for custom bot
  useEffect(() => {
    const addressParam = searchParams.get("address");
    const openParam = searchParams.get("open");

    if (addressParam) {
      const decodedAddress = decodeURIComponent(addressParam);
      // Validate the address
      if (isValidAptosAddress(decodedAddress)) {
        setTraderAddress(decodedAddress);
        // Refresh bots list to get latest running bots count
        if (isSignedIn) {
          fetchBots();
        }
        // Open the form after a short delay to ensure page is loaded
        setTimeout(() => {
          setShowForm(true);
        }, 100);
        // Clear the query parameter from URL
        router.replace("/copytrade", { scroll: false });
      } else {
        setError("Invalid trader address in URL");
      }
    } else if (openParam === "true") {
      // Open form for custom bot (no address pre-filled)
      // Refresh bots list to get latest running bots count
      if (isSignedIn) {
        fetchBots();
      }
      // Open the form after a short delay to ensure page is loaded
      setTimeout(() => {
        setShowForm(true);
      }, 100);
      // Clear the query parameter from URL
      router.replace("/copytrade", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isSignedIn]);

  const formatAddress = (address: string) => {
    if (!address) return "";
    if (address.length <= 12) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const formatBotId = (id: string) => {
    if (!id) return "";
    // Generate a consistent 5-8 digit code from the bot ID
    // Use a simple hash-like approach to convert string to numeric code
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      const char = id.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Convert to positive number and format as 5-8 digit code
    const code = Math.abs(hash).toString().slice(0, 8);
    // Pad with zeros if needed, or take first 5-8 digits
    const finalCode =
      code.length < 5 ? code.padStart(5, "0") : code.slice(0, 8);
    return `#${finalCode}`;
  };

  const formatCurrency = (value: number | string) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const balanceNum = parseFloat(balance) || 0;
  const allocatedAmount = (balanceNum * allocation) / 100;
  const platformFees = allocatedAmount * 0.0075; // 0.75% average
  const netAllocation = allocatedAmount - platformFees;

  const handleStartCopyTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setAddressError(null);

    // Validate Aptos address if provided
    const trimmedAddress = traderAddress.trim();
    if (trimmedAddress && !isValidAptosAddress(trimmedAddress)) {
      setAddressError(
        "Invalid Aptos wallet address. Must be 66 characters starting with 0x followed by 64 hex characters."
      );
      return;
    }

    // Check if user already has a running bot (skip check if restarting the same bot)
    const hasOtherRunningBot = botToRestart
      ? runningBots.some(
          (bot) => bot.id !== botToRestart.id && bot.status === "running"
        )
      : runningBots.length >= 1;

    if (hasOtherRunningBot) {
      setError(
        "You can only run 1 copy trade bot at a time. Please stop your running bot first to start a new one. Multiple bots support coming soon!"
      );
      return;
    }

    if (allocation === 0) {
      setError("Please set allocation percentage");
      return;
    }

    if (allocatedAmount > balanceNum) {
      setError("Allocated amount exceeds your balance");
      return;
    }

    setSubmitting(true);

    try {
      // Round allocatedAmount to 2 decimal places to avoid floating point precision issues
      const roundedAmount = Math.round(allocatedAmount * 100) / 100;

      if (botToRestart) {
        // Restart existing bot
        const result = await updateCopyTradeBot(botToRestart.id, {
          status: "running",
          traderAddress: traderAddress.trim() || undefined,
        });

        if (result.success && result.data) {
          setSuccess(true);
          setTraderAddress("");
          setAllocation(0);
          setBotToRestart(null);
          setShowForm(false);

          // Refresh bots list
          await fetchBots();

          setTimeout(() => setSuccess(false), 3000);
        } else {
          const errorMsg = result.error || "Failed to restart copy trade bot";
          setError(errorMsg);
          setTimeout(() => setError(""), 5000);
        }
      } else {
        // Create new bot
        const result = await createCopyTradeBot({
          traderAddress: traderAddress.trim() || undefined,
          allocatedAmount: roundedAmount,
          allocationPercent: allocation,
          mode: tradingMode,
        });

        if (result.success && result.data) {
          setSuccess(true);
          setTraderAddress("");
          setAllocation(0);
          setShowForm(false);

          // Refresh bots list
          await fetchBots();

          setTimeout(() => setSuccess(false), 3000);
        } else {
          const errorMsg = result.error || "Failed to start copy trade";
          setError(errorMsg);
          setTimeout(() => setError(""), 5000);
        }
      }
    } catch (err: any) {
      const errorMsg =
        err.message || "Failed to start copy trade. Please try again.";
      setError(errorMsg);
      setTimeout(() => setError(""), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStopBot = async (botId: string) => {
    try {
      const result = await updateCopyTradeBot(botId, {
        status: "stopped",
      });

      if (result.success) {
        // Refresh bots list
        await fetchBots();
      } else {
        setError(result.error || "Failed to stop bot");
      }
    } catch (err: any) {
      setError(err.message || "Failed to stop bot");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center relative">
        <div
          className="fixed inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
        <div className="text-center relative z-10">
          <Loader className="animate-spin h-12 w-12 text-blue-400 mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 relative">
        <div
          className="fixed inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 max-w-md text-center relative z-10">
          <h2 className="text-xl font-semibold text-white mb-2 tracking-tight">
            Sign In Required
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            Please sign in to start copy trading
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 relative">
      {/* Background Pattern */}
      <div
        className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />
      {/* Subtle gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-b from-blue-950/5 via-transparent to-slate-950/5 pointer-events-none" />

      <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header Section - Enhanced */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-3">
            <Sparkles size={14} className="text-blue-400 animate-pulse" />
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
              Copy Trading
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent mb-2 tracking-tight">
            Start Copy Trading
          </h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto leading-relaxed mb-2">
            Automatically mirror top traders and their strategies in real-time
          </p>
          {/* Animated underline */}
          <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent mx-auto mt-2" />
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-900/20 border border-green-500/50 rounded-lg p-4">
            <p className="text-green-400 text-sm">
              ✅ Copy trade started successfully!
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Start Copy Trade Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={async () => {
              // Refresh bots list to get latest running bots count
              await fetchBots();
              // Reset form for new bot creation
              setBotToRestart(null);
              setTraderAddress("");
              setAllocation(0);
              setTradingMode("smart_ratio");
              setShowForm(true);
            }}
            className="group relative inline-flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white rounded-xl text-sm font-semibold transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-1 hover:scale-105 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-white/0 to-purple-400/0 group-hover:from-blue-400/20 group-hover:via-white/10 group-hover:to-purple-400/20 transition-all duration-300" />
            <Plus
              size={18}
              className="relative z-10 group-hover:rotate-90 transition-transform duration-300"
            />
            <span className="relative z-10">Start Copy Trade</span>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
            </div>
          </button>
        </div>

        {/* Modal Overlay */}
        {showForm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowForm(false);
                setError(null);
                setSuccess(false);
                setAddressError(null);
                setBotToRestart(null);
                setTraderAddress("");
                setAllocation(0);
              }
            }}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

            {/* Modal Content */}
            <div
              className="relative w-full max-w-md animate-modalSlideIn rounded-xl border border-slate-700/50 shadow-2xl overflow-hidden"
              style={{
                background:
                  "linear-gradient(to bottom, #1a1d2e 0%, #151824 50%, #0f1117 100%)",
                boxShadow:
                  "0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)",
              }}
            >
              {/* Header Section */}
              <div className="relative px-4 pt-4 pb-3 border-b border-slate-800/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center">
                      <Sparkles size={14} className="text-blue-400" />
                    </div>
                    <h2 className="text-base font-bold text-white">
                      {botToRestart
                        ? "Restart Copy Trading"
                        : "Start Copy Trading"}
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setError(null);
                      setSuccess(false);
                      setAddressError(null);
                      setBotToRestart(null);
                      setTraderAddress("");
                      setAllocation(0);
                    }}
                    className="p-1 hover:bg-slate-800/50 rounded transition-all duration-200 text-slate-400 hover:text-white"
                    aria-label="Close modal"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-4">
                <form onSubmit={handleStartCopyTrade}>
                  {/* Error/Success Messages */}
                  {error && (
                    <div className="mb-3 bg-red-900/20 border border-red-500/50 rounded-lg p-2">
                      <p className="text-red-400 text-xs">{error}</p>
                    </div>
                  )}
                  {success && (
                    <div className="mb-3 bg-green-900/20 border border-green-500/50 rounded-lg p-2">
                      <p className="text-green-400 text-xs">
                        ✅ Copy trade started successfully!
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {/* Trader Address Input */}
                    <div>
                      <label
                        htmlFor="trader-address"
                        className="block text-[11px] font-semibold text-slate-300 mb-1.5"
                      >
                        Trader Address
                      </label>
                      <div className="relative">
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10">
                          <Wallet
                            size={14}
                            className={
                              addressError ? "text-red-500" : "text-slate-500"
                            }
                          />
                        </div>
                        <input
                          id="trader-address"
                          type="text"
                          value={traderAddress}
                          onChange={(e) => {
                            const value = e.target.value;
                            setTraderAddress(value);
                            // Real-time validation
                            if (value.trim() && !isValidAptosAddress(value)) {
                              setAddressError("Invalid Aptos address format");
                            } else {
                              setAddressError(null);
                            }
                          }}
                          onBlur={(e) => {
                            // Validate on blur
                            const value = e.target.value.trim();
                            if (value && !isValidAptosAddress(value)) {
                              setAddressError(
                                "Invalid Aptos wallet address. Must be 66 characters starting with 0x followed by 64 hex characters."
                              );
                            } else {
                              setAddressError(null);
                            }
                          }}
                          placeholder="0x1234..."
                          className={`w-full pl-9 pr-3 py-2 bg-slate-900/50 border rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 transition-all font-mono ${
                            addressError
                              ? "border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50"
                              : "border-slate-700/50 focus:ring-blue-500/50 focus:border-blue-500/50"
                          }`}
                        />
                        {traderAddress &&
                          isValidAptosAddress(traderAddress) && (
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10">
                              <CheckCircle2
                                size={14}
                                className="text-green-500"
                              />
                            </div>
                          )}
                      </div>
                      {addressError && (
                        <p className="mt-1 text-[10px] text-red-400">
                          {addressError}
                        </p>
                      )}
                      {!addressError &&
                        traderAddress &&
                        isValidAptosAddress(traderAddress) && (
                          <p className="mt-1 text-[10px] text-green-400">
                            ✓ Valid Aptos address
                          </p>
                        )}
                    </div>

                    {/* Trading Mode */}
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-semibold text-slate-300">
                          Mode
                        </label>
                        <span className="text-xs font-semibold text-white">
                          Smart Ratio
                        </span>
                      </div>
                      <p className="mt-1.5 text-[10px] text-slate-500 leading-relaxed">
                        Automatically matches trader's position size ratio. If
                        trader uses 10% of their balance, you'll use 10% of your
                        allocation.
                      </p>
                    </div>

                    {/* Available Balance */}
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-semibold text-slate-300">
                          Available Balance
                        </label>
                        <div className="flex items-baseline gap-1">
                          <span className="text-base font-bold text-white">
                            {formatCurrency(balanceNum)}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            USDT
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Allocation */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-[11px] font-semibold text-slate-300">
                          Allocation
                        </label>
                        <div className="text-right">
                          <div className="text-base font-bold text-white leading-tight">
                            {allocation}%
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {formatCurrency(allocatedAmount)}
                          </div>
                        </div>
                      </div>
                      <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-2.5">
                        <div className="relative mb-2">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={allocation}
                            onChange={(e) =>
                              setAllocation(Number(e.target.value))
                            }
                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer slider-modern"
                            style={{
                              background: `linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(99, 102, 241) ${allocation}%, rgb(30, 41, 59) ${allocation}%, rgb(30, 41, 59) 100%)`,
                            }}
                          />
                          {/* Percentage display above thumb */}
                          {allocation > 0 && (
                            <div
                              className="absolute top-[-22px] text-[10px] font-bold text-blue-400 transform -translate-x-1/2 pointer-events-none whitespace-nowrap"
                              style={{ left: `${allocation}%` }}
                            >
                              {allocation}%
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>0%</span>
                          <span>25%</span>
                          <span>50%</span>
                          <span>75%</span>
                          <span>100%</span>
                        </div>
                      </div>
                    </div>

                    {/* Platform Fees */}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <label className="block text-[11px] font-semibold text-slate-300">
                          Platform Fees
                        </label>
                        <div className="relative">
                          <button
                            type="button"
                            onMouseEnter={() => setShowFeesInfo(true)}
                            onMouseLeave={() => setShowFeesInfo(false)}
                            className="text-slate-500 hover:text-blue-400 transition-colors"
                          >
                            <Info size={12} />
                          </button>
                          {showFeesInfo && (
                            <div
                              className="absolute left-0 top-5 z-50 w-64 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-[10px] text-slate-300 shadow-xl"
                              style={{ animation: "fadeIn 0.2s ease-out" }}
                            >
                              <p>
                                We charge 0.5-1% as fees of the allocated amount
                                only once at the bot start point.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Start Button */}
                    <button
                      type="submit"
                      disabled={
                        !traderAddress.trim() ||
                        allocation === 0 ||
                        submitting ||
                        allocatedAmount > balanceNum
                      }
                      className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
                    >
                      {submitting ? (
                        <>
                          <Loader className="animate-spin" size={14} />
                          <span>
                            {botToRestart ? "Restarting..." : "Starting..."}
                          </span>
                        </>
                      ) : (
                        <>
                          <span>
                            {botToRestart
                              ? "Restart Copy Trade"
                              : "Start Copy Trade"}
                          </span>
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Bots Section - Premium Redesign */}
        {(runningBots.length > 0 || stoppedBots.length > 0) && (
          <div className="mb-8">
            {/* Section Heading */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">
                Your Active Copy Trades
              </h2>
              <p className="text-slate-400 text-sm">
                Manage your active and stopped copy trading bots.
              </p>
            </div>

            {/* Premium Segmented Tabs - Binance Style */}
            <div className="flex justify-center mb-6">
              <div
                className="relative inline-flex items-center gap-0 p-1 rounded-full"
                style={{
                  background: "rgba(6, 9, 19, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  backdropFilter: "blur(20px) saturate(180%)",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
                }}
              >
                {/* Animated Active Background */}
                <div
                  className={`absolute top-1 bottom-1 rounded-full transition-all duration-300 ease-out ${
                    activeTab === "running"
                      ? "left-1 right-1/2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/40 shadow-lg shadow-green-500/20"
                      : "left-1/2 right-1 bg-gradient-to-r from-slate-500/20 to-slate-600/20 border border-slate-500/40"
                  }`}
                />
                <button
                  onClick={() => setActiveTab("running")}
                  className={`relative z-10 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                    activeTab === "running"
                      ? "text-white"
                      : "text-slate-400 hover:text-slate-300"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      activeTab === "running"
                        ? "bg-green-400 shadow-lg shadow-green-400/50 animate-pulse"
                        : "bg-slate-500"
                    }`}
                  />
                  <span>Running</span>
                  {runningBots.length > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        activeTab === "running"
                          ? "bg-green-500/30 text-green-300"
                          : "bg-slate-700/50 text-slate-500"
                      }`}
                    >
                      {runningBots.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("stopped")}
                  className={`relative z-10 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                    activeTab === "stopped"
                      ? "text-white"
                      : "text-slate-400 hover:text-slate-300"
                  }`}
                >
                  <Square
                    size={12}
                    className={
                      activeTab === "stopped"
                        ? "text-slate-300"
                        : "text-slate-500"
                    }
                  />
                  <span>Stopped</span>
                  {stoppedBots.length > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        activeTab === "stopped"
                          ? "bg-slate-500/30 text-slate-300"
                          : "bg-slate-700/50 text-slate-500"
                      }`}
                    >
                      {stoppedBots.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Running Bots Grid - Centered */}
            {activeTab === "running" && runningBots.length > 0 && (
              <div className="flex justify-center">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl w-full">
                  {runningBots.map((bot, index) => (
                    <div
                      key={bot.id}
                      className="relative rounded-2xl p-5 hover:border-green-500/50 transition-all group flex flex-col animate-fadeIn"
                      style={{
                        background:
                          "linear-gradient(180deg, #1c1f2e 0%, #161821 100%)",
                        border: "1px solid rgba(255, 255, 255, 0.07)",
                        boxShadow: "0 0 30px rgba(0, 0, 0, 0.35)",
                        animationDelay: `${index * 0.1}s`,
                      }}
                    >
                      {/* Header Row with Bot ID */}
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800/50">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-bold text-white mb-1">
                            {formatBotId(bot.id)}
                          </h3>
                          <p className="text-xs text-slate-500 font-mono truncate">
                            {bot.traderAddress
                              ? formatAddress(bot.traderAddress)
                              : "No trader assigned"}
                          </p>
                        </div>
                        {/* Status Badge - Glowing */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/20 border border-green-500/40 rounded-lg backdrop-blur-sm shadow-lg shadow-green-500/20">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50" />
                          <span className="text-[10px] font-bold text-green-400 uppercase">
                            Running
                          </span>
                        </div>
                      </div>

                      {/* Stats Grid - Premium Style */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1.5">
                            Allocation
                          </span>
                          <span className="text-lg font-bold text-white">
                            {formatCurrency(parseFloat(bot.allocatedAmount))}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1.5">
                            PNL
                          </span>
                          <span
                            className={`text-lg font-bold ${
                              bot.pnl && bot.pnl.startsWith("+")
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {bot.pnl || "$0.00"}
                          </span>
                        </div>
                      </div>

                      {/* Number of Trades */}
                      <div className="mb-4 p-3 bg-slate-900/30 rounded-lg border border-slate-800/50">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1.5">
                          Total Trades
                        </span>
                        <span className="text-xl font-bold text-slate-200">
                          {bot.trades || 0}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            router.push(`/copytrade/details/${bot.id}`)
                          }
                          className="flex-1 px-3 py-2.5 bg-transparent hover:bg-slate-500/10 border border-slate-500/30 hover:border-slate-500/50 text-slate-300 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 hover:shadow-lg"
                        >
                          <Info size={14} />
                          <span>Details</span>
                        </button>
                        <button
                          onClick={() => handleStopBot(bot.id)}
                          className="flex-1 px-3 py-2.5 bg-transparent hover:bg-red-500/10 border border-red-500/30 hover:border-red-500/50 text-red-400 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-red-500/20"
                          style={{
                            boxShadow: "0 0 15px rgba(239, 68, 68, 0.1)",
                          }}
                        >
                          <Square size={14} />
                          <span>Stop</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stopped Bots Grid - Centered */}
            {activeTab === "stopped" && stoppedBots.length > 0 && (
              <div className="flex justify-center">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl w-full">
                  {stoppedBots.map((bot, index) => (
                    <div
                      key={bot.id}
                      className="relative rounded-2xl p-5 hover:border-slate-600/50 transition-all group opacity-80 hover:opacity-100 flex flex-col animate-fadeIn"
                      style={{
                        background:
                          "linear-gradient(180deg, #1c1f2e 0%, #161821 100%)",
                        border: "1px solid rgba(255, 255, 255, 0.07)",
                        boxShadow: "0 0 30px rgba(0, 0, 0, 0.35)",
                        animationDelay: `${index * 0.1}s`,
                      }}
                    >
                      {/* Header Row with Bot ID */}
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800/50">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-bold text-white mb-1">
                            {formatBotId(bot.id)}
                          </h3>
                          <p className="text-xs text-slate-500 font-mono truncate">
                            {bot.traderAddress
                              ? formatAddress(bot.traderAddress)
                              : "No trader assigned"}
                          </p>
                        </div>
                        {/* Status Badge */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-500/20 border border-slate-500/40 rounded-lg backdrop-blur-sm">
                          <XCircle size={12} className="text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            Stopped
                          </span>
                        </div>
                      </div>

                      {/* Stats Grid - Premium Style */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1.5">
                            Allocation
                          </span>
                          <span className="text-lg font-bold text-slate-200">
                            {formatCurrency(parseFloat(bot.allocatedAmount))}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1.5">
                            PNL
                          </span>
                          <span
                            className={`text-lg font-bold ${
                              bot.pnl && bot.pnl.startsWith("+")
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {bot.pnl || "$0.00"}
                          </span>
                        </div>
                      </div>

                      {/* Number of Trades */}
                      <div className="mb-4 p-3 bg-slate-900/30 rounded-lg border border-slate-800/50">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1.5">
                          Total Trades
                        </span>
                        <span className="text-xl font-bold text-slate-200">
                          {bot.trades || 0}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            router.push(`/copytrade/details/${bot.id}`)
                          }
                          className="flex-1 px-3 py-2.5 bg-transparent hover:bg-slate-500/10 border border-slate-500/30 hover:border-slate-500/50 text-slate-300 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 hover:shadow-lg"
                        >
                          <Info size={14} />
                          <span>Details</span>
                        </button>
                        <button
                          onClick={async () => {
                            // Refresh bots list to get latest running bots count
                            await fetchBots();
                            // Pre-fill form with bot data
                            setBotToRestart(bot);
                            setTraderAddress(bot.traderAddress || "");
                            setAllocation(bot.allocation);
                            setTradingMode(bot.mode);
                            setShowForm(true);
                          }}
                          className="flex-1 px-3 py-2.5 bg-transparent hover:bg-blue-500/10 border border-blue-500/30 hover:border-blue-500/50 text-blue-400 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/20"
                          style={{
                            boxShadow: "0 0 15px rgba(59, 130, 246, 0.1)",
                          }}
                        >
                          <Play size={14} />
                          <span>Restart</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {runningBots.length === 0 && stoppedBots.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800/50 border border-slate-700/50 mb-4">
              <Copy size={24} className="text-slate-500" />
            </div>
            <p className="text-slate-400 text-sm">
              No active copy trades. Start your first one above!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
