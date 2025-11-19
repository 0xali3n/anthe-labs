"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getTraders, type Trader } from "@/lib/tradersApi";
import {
  AlertCircle,
  RefreshCw,
  ChevronDown,
  Plus,
  TrendingUp,
  Info,
  UserPlus,
} from "lucide-react";

type SortOption = "pnl" | "roi" | "volume" | "trades";

export default function LeaderboardPage() {
  const router = useRouter();
  const [traders, setTraders] = useState<Trader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("pnl");
  const [pnlValues, setPnlValues] = useState<{ [key: string]: number }>({});
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    show: boolean;
    text: string;
    x: number;
    y: number;
  }>({ show: false, text: "", x: 0, y: 0 });

  const fetchTraders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getTraders();
      if (response.success) {
        setTraders(response.data);
        // Initialize PNL counters
        const initialPnl: { [key: string]: number } = {};
        response.data.forEach((trader) => {
          initialPnl[trader.id] = 0;
        });
        setPnlValues(initialPnl);
        // Animate PNL values
        setTimeout(() => {
          response.data.forEach((trader) => {
            animatePnl(trader.id, parseFloat(trader.pnl));
          });
        }, 300);
      } else {
        setError("Failed to fetch traders");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load traders");
    } finally {
      setLoading(false);
    }
  };

  const animatePnl = (id: string, targetValue: number) => {
    const duration = 1500;
    const steps = 60;
    const increment = targetValue / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (Math.abs(current) >= Math.abs(targetValue)) {
        setPnlValues((prev) => ({ ...prev, [id]: targetValue }));
        clearInterval(timer);
      } else {
        setPnlValues((prev) => ({ ...prev, [id]: current }));
      }
    }, duration / steps);
  };

  useEffect(() => {
    fetchTraders();
  }, []);

  const formatAddress = (address: string) => {
    // Show first 6-8 characters and last 6 characters
    const start = address.slice(0, 8);
    const end = address.slice(-6);
    return `${start}...${end}`;
  };

  const formatCurrency = (value: number | string) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(2)}K`;
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatNumber = (value: string) => {
    const num = parseFloat(value);
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const handleCopyTrade = (trader: Trader) => {
    // Redirect to copytrade page with trader address as query parameter
    router.push(`/copytrade?address=${encodeURIComponent(trader.address)}`);
  };

  const showTooltip = (e: React.MouseEvent, text: string) => {
    setTooltip({
      show: true,
      text,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const hideTooltip = () => {
    setTooltip({ show: false, text: "", x: 0, y: 0 });
  };

  // Sort traders based on selected option
  const sortedTraders = [...traders].sort((a, b) => {
    switch (sortBy) {
      case "pnl":
        return parseFloat(b.pnl) - parseFloat(a.pnl);
      case "roi":
        return parseFloat(b.roi) - parseFloat(a.roi);
      case "volume":
        return parseFloat(b.totalVolume) - parseFloat(a.totalVolume);
      case "trades":
        return b.numberOfTxns - a.numberOfTxns;
      default:
        return 0;
    }
  });

  const getRankStyle = (rank: number) => {
    if (rank === 1) {
      return {
        badge: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
        border: "border-yellow-500/20",
        icon: "🥇",
      };
    } else if (rank === 2) {
      return {
        badge: "bg-slate-400/10 border-slate-400/30 text-slate-300",
        border: "border-slate-400/20",
        icon: "🥈",
      };
    } else if (rank === 3) {
      return {
        badge: "bg-orange-600/10 border-orange-600/30 text-orange-400",
        border: "border-orange-600/20",
        icon: "🥉",
      };
    }
    return {
      badge: "bg-slate-800 border-slate-700 text-slate-400",
      border: "border-slate-800",
      icon: null,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center relative">
        {/* Background Pattern */}
        <div
          className="fixed inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
        <div className="text-center relative z-10">
          <RefreshCw className="animate-spin h-12 w-12 text-blue-400 mx-auto mb-4" />
          <p className="text-slate-400">Loading top traders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 relative">
        {/* Background Pattern */}
        <div
          className="fixed inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
        <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-6 flex items-center gap-3 max-w-md relative z-10">
          <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
          <div>
            <p className="text-red-400 font-medium">{error}</p>
            <button
              onClick={fetchTraders}
              className="mt-2 text-sm text-red-300 hover:text-red-200 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Background is now handled globally in layout.tsx */}

      {/* Tooltip */}
      {tooltip.show && (
        <div
          className="fixed z-50 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 shadow-xl pointer-events-none"
          style={{
            left: `${tooltip.x + 10}px`,
            top: `${tooltip.y - 10}px`,
          }}
        >
          {tooltip.text}
        </div>
      )}

      <div className="max-w-7xl mx-auto py-4 sm:py-5 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header Section - Premium Styling */}
        <div className="mb-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl sm:text-4xl font-semibold bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent tracking-tight mb-3">
              Top Traders to Copy
            </h1>
            <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-medium">
              Discover elite traders and mirror their strategies
            </p>
            {/* Animated underline */}
            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent mx-auto mt-4" />
          </div>

          {/* Action and Filter Section - Centered Alignment */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-4 mb-6">
            {/* Become a Creator Button */}
            <button
              onClick={() => router.push("/trader")}
              className="group relative inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white rounded-[15px] text-sm font-medium transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 hover:scale-105 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-white/0 to-purple-400/0 group-hover:from-blue-400/20 group-hover:via-white/10 group-hover:to-purple-400/20 transition-all duration-300" />
              <UserPlus size={16} className="relative z-10" />
              <span className="relative z-10">Become a Creator</span>
            </button>
            {/* Sort by */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Sort by:
              </span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="appearance-none bg-slate-900/50 border border-slate-700/50 rounded-[15px] px-4 py-2.5 pr-8 text-sm text-slate-200 font-medium cursor-pointer hover:border-slate-600/50 hover:bg-slate-900/70 transition-all focus:outline-none focus:border-blue-500/50"
                >
                  <option value="pnl">PNL</option>
                  <option value="roi">ROI</option>
                  <option value="volume">Volume</option>
                  <option value="trades">Trades</option>
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>
            {/* Refresh Button */}
            <button
              onClick={fetchTraders}
              disabled={loading}
              title="Refresh leaderboard"
              className="flex items-center gap-2 px-4 py-2.5 bg-transparent hover:bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 text-slate-300 rounded-[15px] text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Traders Grid - Premium Styling */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {sortedTraders.map((trader, index) => {
            const pnl = parseFloat(trader.pnl);
            const roi = parseFloat(trader.roi);
            const isPositive = pnl >= 0;
            const rank = index + 1;
            const rankStyle = getRankStyle(rank);
            const displayPnl =
              pnlValues[trader.id] !== undefined ? pnlValues[trader.id] : pnl;
            const isHovered = hoveredCard === trader.id;

            return (
              <div
                key={trader.id}
                onMouseEnter={() => setHoveredCard(trader.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className={`group relative rounded-[18px] p-5 sm:p-6 overflow-hidden transition-all duration-300 ${
                  rank <= 3 ? rankStyle.border : "border-slate-800/50"
                }`}
                style={{
                  background:
                    "linear-gradient(180deg, rgba(28, 31, 46, 0.8) 0%, rgba(22, 24, 33, 0.8) 100%)",
                  border:
                    rank <= 3
                      ? rankStyle.border
                      : "1px solid rgba(255, 255, 255, 0.06)",
                  boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.25)",
                  willChange: "transform",
                  transform: isHovered
                    ? "translateY(-4px) scale(1.01) translateZ(0)"
                    : "translateZ(0)",
                  transition:
                    "transform 0.3s cubic-bezier(0.2, 0.9, 0.2, 1), border-color 0.3s, box-shadow 0.3s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor =
                    "rgba(255, 255, 255, 0.15)";
                  e.currentTarget.style.boxShadow =
                    "0px 12px 28px rgba(0, 0, 0, 0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor =
                    rank <= 3 ? rankStyle.border : "rgba(255, 255, 255, 0.06)";
                  e.currentTarget.style.boxShadow =
                    "0px 8px 20px rgba(0, 0, 0, 0.25)";
                }}
              >
                {/* Base shadow layer - static, no animation */}
                <div
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  style={{
                    boxShadow: "0 6px 18px rgba(2, 8, 20, 0.45)",
                  }}
                />

                {/* Glow overlay - animate opacity only, synced timing */}
                <div
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.15), transparent 50%)",
                    opacity: isHovered ? 1 : 0,
                    transition: "opacity 0.2s cubic-bezier(0.2, 0.9, 0.2, 1)",
                    transform: "translateZ(0)",
                  }}
                />

                {/* Gradient border overlay - animate opacity only, synced timing */}
                <div
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(to right, rgba(59, 130, 246, 0.12), rgba(99, 102, 241, 0.1), rgba(103, 232, 249, 0.12))",
                    opacity: isHovered ? 0.6 : 0,
                    transition: "opacity 0.2s cubic-bezier(0.2, 0.9, 0.2, 1)",
                    transform: "translateZ(0)",
                  }}
                />
                {/* Rank Badge & Header */}
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
                  {/* Rank Badge */}
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0 border ${
                      rank <= 3
                        ? rankStyle.badge
                        : "bg-slate-800 border-slate-700 text-slate-400"
                    }`}
                  >
                    {rank <= 3 ? rankStyle.icon : `#${rank}`}
                  </div>

                  {/* Avatar with Border */}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 border-slate-700 p-0.5 flex-shrink-0">
                    {trader.avatarUrl ? (
                      <img
                        src={trader.avatarUrl}
                        alt={trader.botName || formatAddress(trader.address)}
                        className="w-full h-full rounded-lg object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 font-medium text-sm">
                        {(trader.botName || formatAddress(trader.address))
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Bot Name and Address */}
                  <div className="min-w-0 flex-1">
                    <p className="text-lg text-slate-200 font-semibold mb-1 break-words">
                      {trader.botName || formatAddress(trader.address)}
                    </p>
                    <p className="text-sm text-slate-500 font-mono break-all">
                      {formatAddress(trader.address)}
                    </p>
                  </div>

                  {/* Copy Button - Premium & Synced */}
                  <button
                    onClick={() => handleCopyTrade(trader)}
                    onMouseEnter={() => setHoveredCard(trader.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    className="flex-shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 text-white rounded-[15px] text-xs sm:text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 overflow-hidden ml-2 transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
                  >
                    <span className="relative z-10">Copy</span>
                  </button>
                </div>

                {/* Main Metrics - Vertical Split Layout */}
                <div className="flex flex-col gap-3 sm:gap-4 lg:gap-5">
                  {/* Upper Half - Large PNL with Animation */}
                  <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <p className="text-[13px] text-slate-500 uppercase tracking-wider font-medium">
                        PNL (USD)
                      </p>
                      <div
                        onMouseEnter={(e) =>
                          showTooltip(
                            e,
                            "Profit and Loss: Total profit or loss in USD"
                          )
                        }
                        onMouseLeave={hideTooltip}
                        className="cursor-help"
                      >
                        <Info size={12} className="text-slate-500" />
                      </div>
                    </div>
                    <p
                      className={`text-3xl sm:text-4xl lg:text-5xl font-semibold ${
                        isPositive ? "text-[#4ADE80]" : "text-[#F87171]"
                      }`}
                      style={
                        isPositive
                          ? {
                              textShadow: "0 0 15px rgba(74, 222, 128, 0.25)",
                              animation: "pnlGlow 3s ease-in-out infinite",
                            }
                          : {}
                      }
                    >
                      {isPositive ? "+" : ""}
                      {formatCurrency(displayPnl)}
                    </p>
                  </div>

                  {/* Separator Line */}
                  <div className="h-px bg-slate-800/50 opacity-40" />

                  {/* Lower Half - Volume, ROI, Trades Side by Side */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="bg-slate-900/30 rounded-lg p-3 sm:p-4 border border-slate-800/50">
                      <div className="flex items-center gap-1 mb-1.5">
                        <p className="text-[13px] text-slate-500 uppercase tracking-wider font-medium">
                          Volume
                        </p>
                        <div
                          onMouseEnter={(e) =>
                            showTooltip(e, "Total trading volume in USD")
                          }
                          onMouseLeave={hideTooltip}
                          className="cursor-help"
                        >
                          <Info size={10} className="text-slate-500" />
                        </div>
                      </div>
                      <p className="text-base font-medium text-slate-300">
                        {formatCurrency(trader.totalVolume)}
                      </p>
                    </div>
                    <div className="bg-slate-900/30 rounded-lg p-3 sm:p-4 border border-slate-800/50">
                      <div className="flex items-center gap-1 mb-1.5">
                        <p className="text-[13px] text-slate-500 uppercase tracking-wider font-medium">
                          ROI
                        </p>
                        <div
                          onMouseEnter={(e) =>
                            showTooltip(
                              e,
                              "Return on Investment: Percentage return on executed trades"
                            )
                          }
                          onMouseLeave={hideTooltip}
                          className="cursor-help"
                        >
                          <Info size={10} className="text-slate-500" />
                        </div>
                      </div>
                      <p className="text-base font-medium text-blue-400">
                        {formatNumber(trader.roi)}%
                      </p>
                    </div>
                    <div className="bg-slate-900/30 rounded-lg p-3 sm:p-4 border border-slate-800/50">
                      <div className="flex items-center gap-1 mb-1.5">
                        <p className="text-[13px] text-slate-500 uppercase tracking-wider font-medium">
                          Trades
                        </p>
                        <div
                          onMouseEnter={(e) =>
                            showTooltip(e, "Total number of executed trades")
                          }
                          onMouseLeave={hideTooltip}
                          className="cursor-help"
                        >
                          <Info size={10} className="text-slate-500" />
                        </div>
                      </div>
                      <p className="text-base font-medium text-slate-300">
                        {trader.numberOfTxns}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Custom Bot CTA Card */}
          <div
            onMouseEnter={() => setHoveredCard("custom")}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => router.push("/copytrade?open=true")}
            className="group relative rounded-[18px] p-6 sm:p-8 lg:p-10 border-2 border-dashed border-slate-800/50 hover:border-slate-700/50 transition-all duration-300 flex flex-col items-center justify-center min-h-[280px] sm:min-h-[300px] lg:min-h-[320px] cursor-pointer hover:scale-[1.01]"
            style={{
              background:
                "linear-gradient(180deg, rgba(28, 31, 46, 0.4) 0%, rgba(22, 24, 33, 0.4) 100%)",
              boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.25)",
            }}
          >
            <div className="flex flex-col items-center justify-center gap-5 text-center">
              <div className="w-20 h-20 rounded-full bg-slate-800/50 border-2 border-slate-700 flex items-center justify-center transition-colors group-hover:border-slate-600">
                <Plus
                  size={40}
                  className="text-slate-400 group-hover:text-slate-300 transition-colors"
                />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  Create Your Own Bot
                </h3>
                <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
                  Use known target wallet addresses to build custom trading
                  bots.
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push("/copytrade?open=true");
                }}
                className="group/btn mt-2 px-8 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white rounded-[15px] text-sm font-medium transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 hover:scale-105 flex items-center gap-2 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-white/0 to-purple-400/0 group-hover/btn:from-blue-400/20 group-hover/btn:via-white/10 group-hover/btn:to-purple-400/20 transition-all duration-300" />
                <span className="relative z-10">Build Now</span>
                <TrendingUp
                  size={18}
                  className="relative z-10 group-hover/btn:translate-x-1 transition-transform"
                />
              </button>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {traders.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800/50 border border-slate-700/50 mb-4">
              <AlertCircle size={24} className="text-slate-500" />
            </div>
            <p className="text-slate-400 text-sm">
              No traders available at the moment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
