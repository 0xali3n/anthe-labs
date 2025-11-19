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

      <div className="max-w-7xl mx-auto py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8 xl:px-12 relative z-10">
        {/* Header Section */}
        <div className="mb-6 sm:mb-8 lg:mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-6 sm:mb-8 lg:mb-10">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent mb-2 sm:mb-3 lg:mb-4">
                Top Traders to Copy
              </h1>
              <p className="text-slate-300 text-sm sm:text-base font-semibold">
                Discover elite traders and mirror their strategies
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Register as Trader Button */}
              <button
                onClick={() => router.push("/trader")}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
              >
                <UserPlus size={16} />
                <span>Register as Trader</span>
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
                    className="appearance-none bg-slate-900/80 border border-slate-700 rounded-2xl px-4 py-2.5 pr-8 text-sm text-slate-200 font-medium cursor-pointer hover:border-slate-600 hover:bg-slate-900 transition-all focus:outline-none focus:border-slate-600"
                    style={{ borderRadius: "0.75rem" }}
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
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw
                  size={16}
                  className={loading ? "animate-spin" : ""}
                />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Traders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                className={`group relative bg-slate-900/80 border rounded-xl p-4 sm:p-5 lg:p-6 overflow-hidden ${
                  rank <= 3 ? rankStyle.border : "border-slate-800"
                }`}
                style={{
                  willChange: "transform",
                  transform: isHovered
                    ? "translateY(-8px) scale(1.02) translateZ(0)"
                    : "translateZ(0)",
                  transition: "transform 0.2s cubic-bezier(0.2, 0.9, 0.2, 1)",
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
                    <p className="text-base sm:text-lg text-slate-200 font-bold mb-0.5 break-words">
                      {trader.botName || formatAddress(trader.address)}
                    </p>
                    <p className="text-xs text-slate-500 font-mono break-all">
                      {formatAddress(trader.address)}
                    </p>
                  </div>

                  {/* Copy Button - Premium & Synced */}
                  <button
                    onClick={() => handleCopyTrade(trader)}
                    onMouseEnter={() => setHoveredCard(trader.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    className="flex-shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 text-white rounded-lg text-xs sm:text-sm font-semibold bg-blue-600 overflow-hidden ml-2"
                    style={{
                      willChange: "transform",
                      transform: isHovered
                        ? "translateY(-3px) scale(1.08) translateZ(0)"
                        : "translateZ(0)",
                      transition:
                        "transform 0.2s cubic-bezier(0.2, 0.9, 0.2, 1), background-color 0.2s ease",
                      backgroundColor: isHovered
                        ? "rgb(29, 78, 216)"
                        : "rgb(37, 99, 235)",
                    }}
                  >
                    {/* Button glow overlay - synced with card */}
                    <div
                      className="absolute inset-0 rounded-lg pointer-events-none"
                      style={{
                        background:
                          "radial-gradient(circle, rgba(255, 255, 255, 0.15), transparent 70%)",
                        opacity: isHovered ? 1 : 0,
                        transition:
                          "opacity 0.2s cubic-bezier(0.2, 0.9, 0.2, 1)",
                        transform: "translateZ(0)",
                      }}
                    />
                    <span className="relative z-10">Copy</span>
                  </button>
                </div>

                {/* Main Metrics - Vertical Split Layout */}
                <div className="flex flex-col gap-3 sm:gap-4 lg:gap-5">
                  {/* Upper Half - Large PNL with Animation */}
                  <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 mb-1 sm:mb-2">
                      <p className="text-xs text-slate-500">PNL (USD)</p>
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
                      className={`text-3xl sm:text-4xl lg:text-5xl font-bold ${
                        isPositive ? "text-green-400" : "text-red-400"
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
                    <div className="bg-slate-950/50 rounded-lg p-2 sm:p-2.5 border border-slate-800/30">
                      <div className="flex items-center gap-1 mb-1">
                        <p className="text-xs text-slate-500">Volume</p>
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
                      <p className="text-sm sm:text-base font-semibold text-slate-300">
                        {formatCurrency(trader.totalVolume)}
                      </p>
                    </div>
                    <div className="bg-slate-950/50 rounded-lg p-2 sm:p-2.5 border border-slate-800/30">
                      <div className="flex items-center gap-1 mb-1">
                        <p className="text-xs text-slate-500">ROI</p>
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
                      <p className="text-sm sm:text-base font-semibold text-blue-400">
                        {formatNumber(trader.roi)}%
                      </p>
                    </div>
                    <div className="bg-slate-950/50 rounded-lg p-2 sm:p-2.5 border border-slate-800/30">
                      <div className="flex items-center gap-1 mb-1">
                        <p className="text-xs text-slate-500">Trades</p>
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
                      <p className="text-sm sm:text-base font-semibold text-slate-300">
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
            className="group relative bg-slate-900/80 border-2 border-dashed border-slate-800 rounded-xl p-6 sm:p-8 lg:p-10 hover:border-slate-700 transition-all duration-200 flex flex-col items-center justify-center min-h-[280px] sm:min-h-[300px] lg:min-h-[320px] cursor-pointer"
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
                className="mt-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors duration-200 flex items-center gap-2"
              >
                Build Now
                <TrendingUp size={18} />
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
