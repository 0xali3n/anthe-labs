"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Palanquin_Dark, Outfit } from "next/font/google";
import { useAuth } from "@/lib/useAuth";
import { getUSDTBalance } from "@/lib/walletsApi";
import {
  createCopyTradeBot,
  getMyCopyTradeBots,
  updateCopyTradeBot,
  type CopyTradeBot as ApiCopyTradeBot,
} from "@/lib/copyTradeBotsApi";
import { getPositions, mapPositionToOpenPosition } from "@/lib/positionsApi";
import {
  getOrderHistory,
  mapOrderHistoryToTradeHistory,
} from "@/lib/orderHistoryApi";
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
  ArrowRight,
  Power,
  TrendingUp,
  Activity,
  AlertTriangle,
  X,
  RefreshCw,
  ChevronDown,
  Minus,
  Percent,
} from "lucide-react";
import Image from "next/image";

const palanquinDark = Palanquin_Dark({
  weight: ["400", "700"],
  subsets: ["latin"],
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

interface CopyTradeBot {
  id: string;
  userAddress: string;
  traderAddress: string | null;
  mode: string;
  allocation: number;
  allocatedAmount: string;
  status: "running" | "stopped";
  pnl: string;
  trades: number;
  startedAt: string;
}

interface OpenPosition {
  id: string;
  symbol: "BTC" | "ETH" | "APT" | "SOL";
  side: "LONG" | "SHORT";
  size: string;
  entryPrice: string;
  markPrice: string;
  value: string;
  liqPrice: string;
  margin: string;
  pnl: string;
  pnlPercent: string;
  leverage: string;
}

interface TradeHistory {
  id: string;
  timestamp: string;
  direction: "Long" | "Exit Long" | "Short" | "Exit Short";
  symbol: "BTC" | "ETH" | "APT" | "SOL";
  leverage: string;
  size: string;
  price: string;
  orderValue: string;
  fee: string;
  pnl: string;
}

function CopytradeContent() {
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
  const [botToStop, setBotToStop] = useState<CopyTradeBot | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const modeDropdownRef = useRef<HTMLDivElement>(null);
  const [botPositions, setBotPositions] = useState<
    Record<string, OpenPosition[]>
  >({});
  const [loadingPositions, setLoadingPositions] = useState<
    Record<string, boolean>
  >({});
  const [agreedToDisclaimer, setAgreedToDisclaimer] = useState(false);

  // Trade history data
  const [tradeHistory, setTradeHistory] = useState<TradeHistory[]>([]);
  const [loadingTradeHistory, setLoadingTradeHistory] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(tradeHistory.length / itemsPerPage);
  const currentTrades = tradeHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Fetch all data in parallel (positions and trade history)
  useEffect(() => {
    if (!isSignedIn) return;

    const fetchAllData = async () => {
      setLoadingTradeHistory(true);
      const runningBotIds = runningBots
        .filter((bot) => bot.status === "running")
        .map((bot) => bot.id);

      setLoadingPositions((prev) => {
        const newState = { ...prev };
        runningBotIds.forEach((botId) => {
          newState[botId] = true;
        });
        return newState;
      });

      try {
        const [positionsResult, tradeHistoryResult] = await Promise.all([
          getPositions(),
          getOrderHistory(),
        ]);

        if (positionsResult.success && positionsResult.data) {
          const mappedPositions = positionsResult.data.map(
            mapPositionToOpenPosition
          );
          setBotPositions((prev) => {
            const newState = { ...prev };
            runningBotIds.forEach((botId) => {
              newState[botId] = mappedPositions;
            });
            return newState;
          });
        } else {
          setBotPositions((prev) => {
            const newState = { ...prev };
            runningBotIds.forEach((botId) => {
              newState[botId] = [];
            });
            return newState;
          });
        }

        if (tradeHistoryResult.success && tradeHistoryResult.data) {
          setTradeHistory(
            tradeHistoryResult.data.map(mapOrderHistoryToTradeHistory)
          );
        } else {
          setTradeHistory([]);
        }
      } catch (error) {
        setTradeHistory([]);
        setBotPositions((prev) => {
          const newState = { ...prev };
          runningBotIds.forEach((botId) => {
            newState[botId] = [];
          });
          return newState;
        });
      } finally {
        setLoadingTradeHistory(false);
        setLoadingPositions((prev) => {
          const newState = { ...prev };
          runningBotIds.forEach((botId) => {
            newState[botId] = false;
          });
          return newState;
        });
      }
    };

    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, runningBots]);

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
            userAddress: bot.userAddress,
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
    // Bot ID is already 8-9 characters, just add # prefix
    return `#${id}`;
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

  const getSymbolLogo = (symbol: "BTC" | "ETH" | "APT" | "SOL") => {
    switch (symbol) {
      case "BTC":
        return "/btc.png";
      case "ETH":
        return "/eth.png";
      case "APT":
        return "/aptos.png";
      case "SOL":
        return "/sol.png";
      default:
        return "/aptos.png";
    }
  };

  // Fetch positions for a bot
  // Get open positions for a bot
  const getOpenPositions = (botId: string): OpenPosition[] => {
    return botPositions[botId] || [];
  };

  // Refresh positions for a specific bot
  const refreshBotPositions = async (botId: string) => {
    if (!isSignedIn) return;

    setLoadingPositions((prev) => ({
      ...prev,
      [botId]: true,
    }));

    try {
      const positionsResult = await getPositions();

      if (positionsResult.success && positionsResult.data) {
        const mappedPositions = positionsResult.data.map(
          mapPositionToOpenPosition
        );
        setBotPositions((prev) => ({
          ...prev,
          [botId]: mappedPositions,
        }));
      } else {
        setBotPositions((prev) => ({
          ...prev,
          [botId]: [],
        }));
      }
    } catch (error) {
      console.error("Error refreshing positions:", error);
      setBotPositions((prev) => ({
        ...prev,
        [botId]: [],
      }));
    } finally {
      setLoadingPositions((prev) => ({
        ...prev,
        [botId]: false,
      }));
    }
  };

  // Refresh trade history
  const refreshTradeHistory = async () => {
    if (!isSignedIn) return;

    setLoadingTradeHistory(true);

    try {
      const tradeHistoryResult = await getOrderHistory();

      if (tradeHistoryResult.success && tradeHistoryResult.data) {
        setTradeHistory(
          tradeHistoryResult.data.map(mapOrderHistoryToTradeHistory)
        );
      } else {
        setTradeHistory([]);
      }
    } catch (error) {
      console.error("Error refreshing trade history:", error);
      setTradeHistory([]);
    } finally {
      setLoadingTradeHistory(false);
    }
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

    // Validate Aptos address
    const trimmedAddress = traderAddress.trim();
    if (!trimmedAddress) {
      setAddressError("Trader address is required");
      return;
    }

    if (!isValidAptosAddress(trimmedAddress)) {
      setAddressError(
        "Invalid Aptos wallet address. Must be 66 characters starting with 0x followed by 64 hex characters."
      );
      return;
    }

    // Check minimum balance requirement (1 USDT) - only for new bots, not restarting
    if (!botToRestart) {
      const MIN_BALANCE = 1;
      if (balanceNum < MIN_BALANCE) {
        setError(
          `Minimum balance of ${MIN_BALANCE} USDT required to start a copy trade bot. Your current balance: ${formatCurrency(balanceNum)}`
        );
        return;
      }
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

    setSubmitting(true);

    try {
      // Use 100% of balance as default allocation for smart_ratio mode
      const defaultAllocation = 100;
      const defaultAllocatedAmount = balanceNum;

      if (botToRestart) {
        // Restart existing bot
        const result = await updateCopyTradeBot(botToRestart.id, {
          status: "running",
          traderAddress: trimmedAddress,
        });

        if (result.success && result.data) {
          setSuccess(true);
          setTraderAddress("");
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
        // Create new bot with default 100% allocation
        const result = await createCopyTradeBot({
          traderAddress: trimmedAddress,
          allocatedAmount: defaultAllocatedAmount,
          allocationPercent: defaultAllocation,
          mode: tradingMode,
        });

        if (result.success && result.data) {
          setSuccess(true);
          setTraderAddress("");
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
        // Close confirmation modal
        setBotToStop(null);
        // Refresh bots list
        await fetchBots();
      } else {
        setError(result.error || "Failed to stop bot");
        setBotToStop(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to stop bot");
      setBotToStop(null);
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
          <h2
            className={`${palanquinDark.className} text-xl font-semibold text-white mb-2 tracking-tight`}
          >
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
    <div className="min-h-screen relative">
      {/* Background is now handled globally in layout.tsx */}

      <div className="max-w-7xl mx-auto pt-24 pb-10 sm:pt-28 sm:pb-12 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header Section - Enhanced with reduced spacing */}
        <div className="text-center mb-4">
          <h1
            className={`${palanquinDark.className} text-2xl sm:text-4xl font-semibold text-white mb-1.5 tracking-tight`}
          >
            Start Copy Trading
          </h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto leading-relaxed mb-1.5">
            Automatically mirror top traders and their strategies in real-time
          </p>
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
        <div className="flex justify-center mb-6">
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
            className={`group flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-lg font-semibold transition-all duration-300 shadow-md ${outfit.className}`}
          >
            Start Copy Trade
            {/* <ArrowRight
              size={18}
              className="group-hover:translate-x-1 transition-transform"
            /> */}
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
                    <h2
                      className={`${palanquinDark.className} text-base font-bold text-white`}
                    >
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

                    {/* Trading Mode Info */}
                    <div className="bg-slate-950/50 border border-slate-700/50 rounded-lg p-3">
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
                        balance.
                      </p>
                    </div>

                    {/* Disclaimer Section */}
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center flex-shrink-0">
                          <AlertTriangle
                            size={10}
                            className="text-yellow-500"
                          />
                        </div>
                        <h3 className="text-xs font-semibold text-white">
                          Risk Disclaimer
                        </h3>
                        <div className="h-px bg-slate-800 flex-1 ml-2" />
                      </div>

                      <div className="space-y-3 text-[10px] text-slate-400 leading-relaxed p-2.5 bg-slate-950/30 rounded-lg border border-slate-800/50 h-28 overflow-y-auto custom-scrollbar">
                        <section>
                          <h4 className="text-slate-200 font-semibold mb-0.5">
                            Risk & Investment Disclaimer
                          </h4>
                          <p>
                            Copy trading involves significant financial risk and
                            may result in the loss of some or all of your
                            capital. Past performance of any trader or strategy
                            is not indicative of future results. The
                            information, strategies, and trades displayed on
                            this platform are provided for informational
                            purposes only and do not constitute financial,
                            investment, trading, or legal advice.
                          </p>
                        </section>

                        <section>
                          <h4 className="text-slate-200 font-semibold mb-0.5">
                            No Guarantee of Profits
                          </h4>
                          <p className="mb-0.5">
                            By using this platform, you acknowledge that:
                          </p>
                          <ul className="list-disc pl-3 space-y-0.5">
                            <li>Copying trades does not guarantee profits</li>
                            <li>Market conditions can change rapidly</li>
                            <li>
                              Trades executed by copied wallets may be delayed,
                              modified, or fail due to network congestion, smart
                              contract behaviour, or technical issues
                            </li>
                          </ul>
                        </section>

                        <section>
                          <h4 className="text-slate-200 font-semibold mb-0.5">
                            No Financial Advisory Relationship
                          </h4>
                          <p>
                            This platform does not act as a broker, financial
                            advisor, portfolio manager, or investment manager.
                            No fiduciary relationship is created between the
                            platform and its users.
                          </p>
                        </section>

                        <section>
                          <h4 className="text-slate-200 font-semibold mb-0.5">
                            Technology & Smart Contract Risks
                          </h4>
                          <p className="mb-0.5">
                            By using this application, you acknowledge and
                            accept risks including but not limited to:
                          </p>
                          <ul className="list-disc pl-3 space-y-0.5">
                            <li>Smart contract vulnerabilities</li>
                            <li>Blockchain network failures or congestion</li>
                            <li>Exploits, hacks, or protocol failures</li>
                            <li>Oracle, third-party, or dependency failures</li>
                          </ul>
                          <p className="mt-0.5">
                            The platform is provided &ldquo;as is&rdquo; and
                            &ldquo;as available&rdquo;, without warranties of
                            any kind.
                          </p>
                        </section>

                        <section>
                          <h4 className="text-slate-200 font-semibold mb-0.5">
                            Regulatory & Jurisdiction Notice
                          </h4>
                          <p>
                            Cryptocurrency and digital asset regulations vary by
                            jurisdiction and may change at any time. You are
                            responsible for ensuring that your use of this
                            platform complies with local laws and regulations,
                            including tax obligations. The platform shall not be
                            held liable for any regulatory action or legal
                            consequences arising from user activity.
                          </p>
                        </section>

                        <section>
                          <h4 className="text-slate-200 font-semibold mb-0.5">
                            Limitation of Liability
                          </h4>
                          <p>
                            To the maximum extent permitted by law, the platform
                            and its team shall not be liable for any direct,
                            indirect, incidental, or consequential losses,
                            including loss of profits, data, or assets.
                          </p>
                        </section>

                        <section>
                          <h4 className="text-slate-200 font-semibold mb-0.5">
                            Acceptance of Terms
                          </h4>
                          <p className="mb-0.5">
                            By accessing or using this platform, you confirm
                            that:
                          </p>
                          <ul className="list-disc pl-3 space-y-0.5">
                            <li>You understand the risks involved</li>
                            <li>You agree to this disclaimer</li>
                            <li>
                              You use the platform at your own discretion and
                              risk
                            </li>
                          </ul>
                        </section>
                      </div>

                      <label className="flex items-center gap-2 mt-3 cursor-pointer group">
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={agreedToDisclaimer}
                            onChange={(e) =>
                              setAgreedToDisclaimer(e.target.checked)
                            }
                            className="peer h-3.5 w-3.5 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500/20 focus:ring-offset-0 transition-all cursor-pointer appearance-none border checked:bg-blue-500 checked:border-blue-500"
                          />
                          <svg
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[45%] w-2 h-2 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-[10px] text-slate-400 group-hover:text-slate-300 transition-colors pt-0.5">
                          I agree to the Risk Disclaimer
                        </span>
                      </label>
                    </div>

                    {/* Start Button */}
                    <button
                      type="submit"
                      disabled={
                        !traderAddress.trim() ||
                        submitting ||
                        !agreedToDisclaimer
                      }
                      className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5"
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
          <div className="mb-6">
            {/* Section Heading with Toggle - Grouped */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2
                  className={`${palanquinDark.className} text-lg font-semibold text-white mb-1`}
                >
                  Your Active Copy Trades
                </h2>
                <p className="text-slate-400 text-sm">
                  Manage your active and stopped copy trading bots.
                </p>
              </div>

              {/* Premium Segmented Tabs - Binance Style */}
              <div className="flex justify-center sm:justify-end">
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
                        ? "left-1 right-1/2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/40"
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
                          ? "bg-green-400"
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
            </div>

            {/* Running Bots Grid - Responsive with consistent gaps */}
            {activeTab === "running" && runningBots.length > 0 && (
              <div className="flex justify-center">
                <div className="grid grid-cols-1 gap-6 sm:gap-8 max-w-7xl w-full">
                  {runningBots.map((bot, index) => (
                    <div
                      key={bot.id}
                      className="relative rounded-[18px] p-5 sm:p-6 transition-all duration-300 group flex flex-col animate-fadeIn"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(28, 31, 46, 0.8) 0%, rgba(22, 24, 33, 0.8) 100%)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                        boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.25)",
                        animationDelay: `${index * 0.1}s`,
                      }}
                    >
                      {/* Header Row with Bot ID and Status */}
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800/50">
                        <div className="flex-1 min-w-0">
                          <h3
                            className={`${palanquinDark.className} text-base font-semibold text-white mb-0.5`}
                          >
                            Bot ID : {formatBotId(bot.id)}
                          </h3>
                        </div>
                        {/* Status Badge */}
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/20 border border-green-500/30 rounded-full">
                          <Play
                            size={9}
                            className="text-green-400"
                            fill="currentColor"
                          />
                          <span className="text-[9px] font-semibold text-green-400 uppercase tracking-wide">
                            Running
                          </span>
                        </div>
                      </div>

                      {/* Bot Details - Grid Layout */}

                      <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5 justify-center">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
                            Address
                          </span>
                          <span
                            className="text-sm font-medium text-slate-200 font-mono truncate"
                            title={bot.traderAddress || ""}
                          >
                            {bot.traderAddress
                              ? formatAddress(bot.traderAddress)
                              : "No trader"}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
                            Status
                          </span>
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                            <span className="text-sm font-medium text-green-400">
                              Running
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
                            PNL
                          </span>
                          <span className="text-xs font-medium text-slate-500 italic">
                            Coming Soon
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
                            Allocation
                          </span>
                          <span className="text-sm font-medium text-slate-200">
                            {formatCurrency(parseFloat(bot.allocatedAmount))}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
                            Trades
                          </span>
                          <span className="text-xs font-medium text-slate-500 italic">
                            Coming Soon
                          </span>
                        </div>
                      </div>

                      {/* Open Positions - Matching Copy Trade History Table */}
                      {bot.status === "running" && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-4">
                            <h2
                              className={`${palanquinDark.className} text-lg font-semibold text-white`}
                            >
                              Open Positions
                            </h2>
                            <button
                              onClick={() => refreshBotPositions(bot.id)}
                              disabled={loadingPositions[bot.id]}
                              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-slate-600/50 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                              title="Refresh positions"
                            >
                              <RefreshCw
                                size={14}
                                className={`${
                                  loadingPositions[bot.id]
                                    ? "animate-spin"
                                    : "group-hover:rotate-180"
                                } transition-transform duration-300`}
                              />
                              <span className="hidden sm:inline">Refresh</span>
                            </button>
                          </div>
                          {loadingPositions[bot.id] ? (
                            <div
                              className="text-center py-12 rounded-[18px] overflow-hidden"
                              style={{
                                background:
                                  "linear-gradient(180deg, rgba(28, 31, 46, 0.8) 0%, rgba(22, 24, 33, 0.8) 100%)",
                                border: "1px solid rgba(255, 255, 255, 0.06)",
                                boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.25)",
                              }}
                            >
                              <Loader
                                size={32}
                                className="text-blue-400 mx-auto mb-3 animate-spin"
                              />
                              <p className="text-slate-400 text-sm">
                                Loading positions...
                              </p>
                            </div>
                          ) : getOpenPositions(bot.id).length > 0 ? (
                            <div
                              className="rounded-[18px] overflow-hidden"
                              style={{
                                background:
                                  "linear-gradient(180deg, rgba(28, 31, 46, 0.8) 0%, rgba(22, 24, 33, 0.8) 100%)",
                                border: "1px solid rgba(255, 255, 255, 0.06)",
                                boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.25)",
                              }}
                            >
                              <div className="">
                                <table className="w-full">
                                  <thead className="bg-slate-900/50 border-b border-slate-800">
                                    <tr>
                                      <th className="pl-6 pr-2 py-4 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                        Symbol
                                      </th>
                                      <th className="px-2 py-4 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                        Side
                                      </th>
                                      <th className="px-2 py-4 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                        Size
                                      </th>
                                      <th className="px-2 py-4 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                        Entry Price (USDT)
                                      </th>
                                      <th className="px-2 py-4 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                        Mark Price (USDT)
                                      </th>
                                      <th className="px-2 py-4 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                        Value (USDT)
                                      </th>
                                      <th className="px-2 py-4 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                        Liq Price (USDT)
                                      </th>
                                      <th className="px-2 py-4 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                        Margin (USDT)
                                      </th>
                                      <th className="px-2 py-4 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                        Leverage
                                      </th>
                                      <th className="pl-2 pr-6 py-4 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                        PnL (USDT)
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/50">
                                    {getOpenPositions(bot.id).map(
                                      (position) => (
                                        <tr
                                          key={position.id}
                                          className="hover:bg-slate-800/30 transition-colors group/row"
                                        >
                                          <td className="pl-6 pr-2 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                              <div className="relative">
                                                <Image
                                                  src={getSymbolLogo(
                                                    position.symbol
                                                  )}
                                                  alt={position.symbol}
                                                  width={24}
                                                  height={24}
                                                  className="rounded-full"
                                                />
                                                <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5">
                                                  {position.side === "LONG" ? (
                                                    <TrendingUp
                                                      size={14}
                                                      className="text-green-400"
                                                    />
                                                  ) : (
                                                    <TrendingUp
                                                      size={14}
                                                      className="text-red-400 transform rotate-180"
                                                    />
                                                  )}
                                                </div>
                                              </div>
                                              <div>
                                                <p className="text-sm font-bold text-white">
                                                  {position.symbol}
                                                </p>
                                                <p className="text-xs text-slate-500 font-medium">
                                                  Perpetual
                                                </p>
                                              </div>
                                            </div>
                                          </td>
                                          <td className="px-2 py-4 whitespace-nowrap">
                                            <span
                                              className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${
                                                position.side === "LONG"
                                                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                                                  : "bg-red-500/10 text-red-400 border-red-500/20"
                                              }`}
                                            >
                                              {position.side}
                                            </span>
                                          </td>
                                          <td className="px-2 py-4 whitespace-nowrap text-right">
                                            <div className="flex flex-col items-end">
                                              <p className="text-sm font-medium text-slate-200 font-mono">
                                                {position.size}
                                              </p>
                                              <p className="text-xs text-slate-500">
                                                {position.symbol}
                                              </p>
                                            </div>
                                          </td>
                                          <td className="px-2 py-4 whitespace-nowrap text-right text-sm text-slate-300 font-mono">
                                            {position.entryPrice}
                                          </td>
                                          <td className="px-2 py-4 whitespace-nowrap text-right text-sm text-slate-300 font-mono">
                                            {position.markPrice}
                                          </td>
                                          <td className="px-2 py-4 whitespace-nowrap text-right text-sm text-slate-300 font-mono">
                                            {position.value}
                                          </td>
                                          <td className="px-2 py-4 whitespace-nowrap text-right text-sm text-red-400 font-mono">
                                            {position.liqPrice}
                                          </td>
                                          <td className="px-2 py-4 whitespace-nowrap text-right text-sm text-slate-300 font-mono">
                                            {position.margin}
                                          </td>
                                          <td className="px-2 py-4 whitespace-nowrap text-right">
                                            <span className="text-sm font-medium text-slate-400 bg-slate-800/50 px-2 py-1 rounded">
                                              {position.leverage}
                                            </span>
                                          </td>
                                          <td className="pl-2 pr-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex flex-col items-end">
                                              <span
                                                className={`text-sm font-bold font-mono ${
                                                  position.pnl.startsWith("+")
                                                    ? "text-green-500/70"
                                                    : "text-red-500/70"
                                                }`}
                                              >
                                                {position.pnl}
                                              </span>
                                              <span
                                                className={`text-xs font-medium ${
                                                  position.pnlPercent.startsWith(
                                                    "+"
                                                  )
                                                    ? "text-green-500/70"
                                                    : "text-red-500/70"
                                                }`}
                                              >
                                                {position.pnlPercent}
                                              </span>
                                            </div>
                                          </td>
                                        </tr>
                                      )
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="text-center py-12 rounded-[18px] overflow-hidden"
                              style={{
                                background:
                                  "linear-gradient(180deg, rgba(28, 31, 46, 0.8) 0%, rgba(22, 24, 33, 0.8) 100%)",
                                border: "1px solid rgba(255, 255, 255, 0.06)",
                                boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.25)",
                              }}
                            >
                              <TrendingUp
                                size={32}
                                className="text-slate-500 mx-auto mb-3"
                              />
                              <p className="text-slate-400 text-sm">
                                No open positions
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action Buttons - Standardized */}
                      <div className="flex gap-2 mt-auto">
                        <button
                          onClick={() => setBotToStop(bot)}
                          className="w-full px-3 py-2.5 bg-transparent hover:bg-red-500/10 border border-red-500/40 hover:border-red-500/60 text-red-400 rounded-[15px] text-xs font-medium transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-md group/btn"
                        >
                          <Power
                            size={14}
                            className="group-hover/btn:scale-110 transition-transform"
                          />
                          <span>Stop</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stopped Bots Grid - Responsive with consistent gaps */}
            {activeTab === "stopped" && stoppedBots.length > 0 && (
              <div className="flex justify-center">
                <div className="flex overflow-x-auto pb-6 gap-6 max-w-7xl w-full snap-x scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900/50">
                  {stoppedBots.map((bot, index) => (
                    <div
                      key={bot.id}
                      className="relative rounded-[18px] p-5 transition-all duration-300 group opacity-80 hover:opacity-100 flex flex-col animate-fadeIn h-full min-w-[280px] sm:min-w-[320px] flex-shrink-0 snap-center"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(28, 31, 46, 0.8) 0%, rgba(22, 24, 33, 0.8) 100%)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                        boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.25)",
                        animationDelay: `${index * 0.1}s`,
                      }}
                    >
                      {/* Header Row with Bot ID and Status */}
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800/50">
                        <div className="flex-1 min-w-0">
                          <h3
                            className={`${palanquinDark.className} text-base font-semibold text-white mb-0.5`}
                          >
                            {formatBotId(bot.id)}
                          </h3>
                        </div>
                        {/* Status Badge */}
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-500/20 border border-slate-500/30 rounded-full">
                          <Square
                            size={9}
                            className="text-slate-400"
                            fill="currentColor"
                          />
                          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
                            Stopped
                          </span>
                        </div>
                      </div>

                      {/* Bot Details - 2 Column Grid for Cards */}
                      <div className="mb-4 grid grid-cols-2 gap-y-4 gap-x-2">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
                            Address
                          </span>
                          <span
                            className="text-xs font-medium text-slate-200 font-mono truncate"
                            title={bot.traderAddress || ""}
                          >
                            {bot.traderAddress
                              ? formatAddress(bot.traderAddress)
                              : "No trader"}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
                            Status
                          </span>
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            <span className="text-xs font-medium text-slate-400">
                              Stopped
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
                            PNL
                          </span>
                          <span className="text-xs font-medium text-slate-500 italic">
                            Coming Soon
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
                            Allocation
                          </span>
                          <span className="text-xs font-medium text-slate-200">
                            {formatCurrency(parseFloat(bot.allocatedAmount))}
                          </span>
                        </div>
                        <div className="flex flex-col col-span-2">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
                            Trades
                          </span>
                          <span className="text-xs font-medium text-slate-500 italic">
                            Coming Soon
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons - Standardized */}
                      <div className="flex gap-2 mt-auto pt-2">
                        <button
                          onClick={async () => {
                            // Refresh bots list to get latest running bots count
                            await fetchBots();
                            // Pre-fill form with bot data
                            setBotToRestart(bot);
                            setTraderAddress(bot.traderAddress || "");
                            setTradingMode(bot.mode);
                            setShowForm(true);
                          }}
                          className="w-full px-3 py-2.5 bg-transparent hover:bg-blue-500/10 border border-blue-500/40 hover:border-blue-500/60 text-blue-400 rounded-[15px] text-xs font-medium transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-md group/btn"
                        >
                          <RefreshCw
                            size={14}
                            className="group-hover/btn:rotate-180 transition-transform duration-300"
                          />
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

        {/* Stop Bot Confirmation Modal */}
        {botToStop && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setBotToStop(null);
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
                    <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                      <AlertTriangle size={16} className="text-red-400" />
                    </div>
                    <h2
                      className={`${palanquinDark.className} text-base font-bold text-white`}
                    >
                      Stop Copy Trading Bot
                    </h2>
                  </div>
                  <button
                    onClick={() => setBotToStop(null)}
                    className="p-1 hover:bg-slate-800/50 rounded transition-all duration-200 text-slate-400 hover:text-white"
                    aria-label="Close modal"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-4">
                <div className="space-y-4">
                  {/* Confirmation Message */}
                  <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-3">
                    <p className="text-sm text-slate-300 leading-relaxed">
                      Are you sure you want to stop bot{" "}
                      <span className="font-semibold text-white">
                        {formatBotId(botToStop.id)}
                      </span>
                      ? This action will stop the bot from copying new trades.
                    </p>
                  </div>

                  {/* Warning Note */}
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle
                        size={16}
                        className="text-yellow-400 flex-shrink-0 mt-0.5"
                      />
                      <div className="flex-1">
                        <h3 className="text-xs font-semibold text-yellow-400 mb-1">
                          Important Notice
                        </h3>
                        <p className="text-[11px] text-yellow-300/90 leading-relaxed">
                          <span className="font-semibold">Note:</span> If there
                          are any open positions associated with this bot, they
                          will be automatically closed using market orders when
                          you stop the bot.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bot Details */}
                  <div className="bg-slate-950/50 border border-slate-800/50 rounded-lg p-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                          Bot ID
                        </span>
                        <span className="text-xs font-medium text-slate-200">
                          {formatBotId(botToStop.id)}
                        </span>
                      </div>
                      {botToStop.traderAddress && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                            Trader Address
                          </span>
                          <span className="text-xs font-medium text-slate-200 font-mono">
                            {formatAddress(botToStop.traderAddress)}
                          </span>
                        </div>
                      )}
                      {getOpenPositions(botToStop.id).length > 0 && (
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                            Open Positions
                          </span>
                          <span className="text-xs font-medium text-red-400">
                            {getOpenPositions(botToStop.id).length} position
                            {getOpenPositions(botToStop.id).length !== 1
                              ? "s"
                              : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setBotToStop(null)}
                      className="flex-1 px-4 py-2.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-slate-600/50 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleStopBot(botToStop.id)}
                      className="flex-1 px-4 py-2.5 bg-transparent hover:bg-red-500/10 border border-red-500/40 hover:border-red-500/60 text-red-400 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <Power size={14} />
                      <span>Stop Bot</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Copy Trade History Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2
              className={`${palanquinDark.className} text-lg font-semibold text-white`}
            >
              Copy Trade History
            </h2>
            <button
              onClick={refreshTradeHistory}
              disabled={loadingTradeHistory}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-slate-600/50 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
              title="Refresh trade history"
            >
              <RefreshCw
                size={14}
                className={`${
                  loadingTradeHistory
                    ? "animate-spin"
                    : "group-hover:rotate-180"
                } transition-transform duration-300`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
          {loadingTradeHistory ? (
            <div
              className="text-center py-12 rounded-[18px] overflow-hidden"
              style={{
                background:
                  "linear-gradient(180deg, rgba(28, 31, 46, 0.8) 0%, rgba(22, 24, 33, 0.8) 100%)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.25)",
              }}
            >
              <Loader
                size={32}
                className="text-blue-400 mx-auto mb-3 animate-spin"
              />
              <p className="text-slate-400 text-sm">Loading trade history...</p>
            </div>
          ) : tradeHistory.length > 0 ? (
            <div
              className="rounded-[18px] overflow-hidden"
              style={{
                background:
                  "linear-gradient(180deg, rgba(28, 31, 46, 0.8) 0%, rgba(22, 24, 33, 0.8) 100%)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.25)",
              }}
            >
              <div className="">
                <table className="w-full">
                  <thead className="bg-slate-900/50 border-b border-slate-800">
                    <tr>
                      <th className="pl-6 pr-2 py-4 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                        Symbol
                      </th>
                      <th className="px-2 py-4 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                        Time
                      </th>
                      <th className="px-2 py-4 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                        Direction
                      </th>
                      <th className="px-2 py-4 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                        Size
                      </th>
                      <th className="px-2 py-4 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                        Price (USDT)
                      </th>
                      <th className="px-2 py-4 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                        Order Value (USDT)
                      </th>
                      <th className="px-2 py-4 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                        Fee (USDT)
                      </th>
                      <th className="pl-2 pr-6 py-4 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                        PnL (USDT)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {currentTrades.map((trade, index) => (
                      <tr
                        key={`${trade.id}-${index}`}
                        className="hover:bg-slate-800/30 transition-colors group/row"
                      >
                        <td className="pl-6 pr-2 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Image
                                src={getSymbolLogo(trade.symbol)}
                                alt={trade.symbol}
                                width={24}
                                height={24}
                                className="rounded-full"
                              />
                              <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5">
                                {trade.direction === "Long" ||
                                trade.direction === "Exit Short" ? (
                                  <TrendingUp
                                    size={14}
                                    className="text-green-400"
                                  />
                                ) : (
                                  <TrendingUp
                                    size={14}
                                    className="text-red-400 transform rotate-180"
                                  />
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">
                                {trade.symbol}
                              </p>
                              <p
                                className={`text-xs font-medium ${
                                  trade.direction === "Long" ||
                                  trade.direction === "Exit Short"
                                    ? "text-green-400"
                                    : "text-red-400"
                                }`}
                              >
                                {trade.leverage} •{" "}
                                {trade.direction.includes("Long")
                                  ? "Long"
                                  : "Short"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-slate-300 font-mono">
                          {trade.timestamp}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${
                              trade.direction === "Long" ||
                              trade.direction === "Exit Short"
                                ? "bg-green-500/10 text-green-400 border-green-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/20"
                            }`}
                          >
                            {trade.direction}
                          </span>
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-right">
                          <div className="flex flex-col items-end">
                            <p className="text-sm font-medium text-slate-200 font-mono">
                              {trade.size}
                            </p>
                            <p className="text-xs text-slate-500">
                              {trade.symbol}
                            </p>
                          </div>
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-right text-sm text-slate-300 font-mono">
                          {trade.price}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-right text-sm text-slate-300 font-mono">
                          {trade.orderValue}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-right text-sm text-slate-300 font-mono">
                          {trade.fee}
                        </td>
                        <td className="pl-2 pr-6 py-4 whitespace-nowrap text-right">
                          <span
                            className={`text-sm font-bold font-mono ${
                              trade.pnl.startsWith("+")
                                ? "text-green-500/70"
                                : "text-red-500/70"
                            }`}
                          >
                            {trade.pnl}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-900/30">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      className="relative ml-3 inline-flex items-center rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-slate-400">
                        Showing{" "}
                        <span className="font-medium">
                          {(currentPage - 1) * itemsPerPage + 1}
                        </span>{" "}
                        to{" "}
                        <span className="font-medium">
                          {Math.min(
                            currentPage * itemsPerPage,
                            tradeHistory.length
                          )}
                        </span>{" "}
                        of{" "}
                        <span className="font-medium">
                          {tradeHistory.length}
                        </span>{" "}
                        results
                      </p>
                    </div>
                    <div>
                      <nav
                        className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                        aria-label="Pagination"
                      >
                        <button
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(prev - 1, 1))
                          }
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-700 hover:bg-slate-800 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Previous</span>
                          <ChevronDown
                            className="h-5 w-5 rotate-90"
                            aria-hidden="true"
                          />
                        </button>
                        <button
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(prev + 1, totalPages)
                            )
                          }
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-700 hover:bg-slate-800 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Next</span>
                          <ChevronDown
                            className="h-5 w-5 -rotate-90"
                            aria-hidden="true"
                          />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className="text-center py-12 rounded-[18px] overflow-hidden"
              style={{
                background:
                  "linear-gradient(180deg, rgba(28, 31, 46, 0.8) 0%, rgba(22, 24, 33, 0.8) 100%)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.25)",
              }}
            >
              <Activity size={32} className="text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">
                No trade history available
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Suspense wrapper required for useSearchParams() in production builds
export default function Copytrade() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      }
    >
      <CopytradeContent />
    </Suspense>
  );
}
