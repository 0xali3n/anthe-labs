"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getTraders, type Trader } from "@/lib/tradersApi";
import { Palanquin_Dark, Outfit } from "next/font/google";
import {
  AlertCircle,
  RefreshCw,
  ChevronDown,
  Plus,
  TrendingUp,
  Info,
  UserPlus,
  Eye,
} from "lucide-react";
import TraderDetailsModal from "@/components/TraderDetailsModal";

const palanquinDark = Palanquin_Dark({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const outfit = Outfit({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

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
  const [selectedTrader, setSelectedTrader] = useState<Trader | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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


      <div className="max-w-7xl mx-auto pt-24 pb-10 sm:pt-28 sm:pb-12 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header Section - Premium Styling */}
        <div className="mb-6">
          <div className="mb-6">
            <h1 className={`${palanquinDark.className} text-3xl sm:text-4xl font-semibold text-white tracking-tight mb-3`}>
              Top Traders to Copy
            </h1>
            <p className="text-slate-300 text-base sm:text-lg max-w-2xl leading-relaxed font-medium">
              Discover Elite traders and mirror their strategies
            </p>
          </div>

          {/* Action and Filter Section - Split Alignment */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            {/* Become a Creator Button - Left Aligned */}
            <button
              onClick={() => router.push("/trader")}
              className={`group flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-base font-semibold transition-all duration-300 shadow-lg shadow-blue-500/20 ${outfit.className}`}
            >
              <UserPlus size={16} />
              <span>Become a Creator</span>
            </button>

            {/* Right Side Controls */}
            <div className="flex items-center gap-4">
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
        </div >

        {/* Traders Grid - Premium Styling */}
        < div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8" >
          {
            sortedTraders.map((trader, index) => {
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
                  className={`relative rounded-lg p-5 bg-slate-900/50 border transition-all duration-200 ${rank <= 3 ? rankStyle.border : "border-slate-800 hover:border-slate-700"
                    }`}
                >
                  {/* Header: Rank, Avatar, Name, Copy Button */}
                  <div className="flex items-center gap-3 mb-5">
                    {/* Rank Badge */}
                    <div
                      className={`w-8 h-8 rounded-md flex items-center justify-center font-bold text-sm flex-shrink-0 border ${rank <= 3
                        ? rankStyle.badge
                        : "bg-slate-800/50 border-slate-700 text-slate-400"
                        }`}
                    >
                      {rank <= 3 ? rankStyle.icon : `#${rank}`}
                    </div>

                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-lg border border-slate-700 flex-shrink-0 overflow-hidden">
                      {trader.avatarUrl ? (
                        <img
                          src={trader.avatarUrl}
                          alt={trader.botName || formatAddress(trader.address)}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-400 font-medium text-sm">
                          {(trader.botName || formatAddress(trader.address))
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Bot Name and Address */}
                    <div className="min-w-0 flex-1">
                      <p className="text-base text-slate-200 font-semibold mb-0.5 truncate">
                        {trader.botName || formatAddress(trader.address)}
                      </p>
                      <p className="text-xs text-slate-500 font-mono truncate">
                        {formatAddress(trader.address)}
                      </p>
                    </div>

                    {/* Copy Button */}
                    <button
                      onClick={() => handleCopyTrade(trader)}
                      className="flex-shrink-0 px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-sm font-semibold transition-all duration-200"
                    >
                      Copy
                    </button>
                  </div>

                  {/* Metrics Section */}
                  <div className="space-y-3">
                    {/* PNL */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
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
                          <Info size={11} className="text-slate-500" />
                        </div>
                      </div>
                      <p
                        className={`text-2xl font-semibold ${isPositive ? "text-green-400" : "text-red-400"
                          }`}
                      >
                        {isPositive ? "+" : ""}
                        {formatCurrency(displayPnl)}
                      </p>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-800/50">
                      {/* Volume */}
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
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
                        <p className="text-sm font-semibold text-slate-200">
                          {formatCurrency(trader.totalVolume)}
                        </p>
                      </div>

                      {/* ROI */}
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
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
                        <p className="text-sm font-semibold text-slate-200">
                          {formatNumber(trader.roi)}%
                        </p>
                      </div>

                      {/* Trades */}
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
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
                        <p className="text-sm font-semibold text-slate-200">
                          {trader.numberOfTxns}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Details Button - Below Metrics */}
                  <div className="mt-4 pt-4 border-t border-slate-800/50">
                    <button
                      onClick={() => {
                        setSelectedTrader(trader);
                        setIsModalOpen(true);
                      }}
                      className="w-full px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-slate-600/50 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
                      title="View details"
                    >
                      <Eye size={14} />
                      <span>Details</span>
                    </button>
                  </div>
                </div>
              );
            })
          }

          {/* Custom Bot CTA Card */}
          <div
            onClick={() => router.push("/copytrade?open=true")}
            className="relative rounded-lg p-5 bg-slate-900/50 border-2 border-dashed border-slate-800 hover:border-slate-700 transition-all duration-200 flex flex-col items-center justify-center cursor-pointer"
          >
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-800/50 border border-slate-700 flex items-center justify-center">
                <Plus
                  size={28}
                  className="text-slate-400"
                />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Create Your Own Bot
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Use known target wallet addresses to build custom trading bots.
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push("/copytrade?open=true");
                }}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2"
              >
                <span>Build Now</span>
                <TrendingUp size={16} />
              </button>
            </div>
          </div>
        </div >

        {/* Empty State */}
        {
          traders.length === 0 && !loading && (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800/50 border border-slate-700/50 mb-4">
                <AlertCircle size={24} className="text-slate-500" />
              </div>
              <p className="text-slate-400 text-sm">
                No traders available at the moment.
              </p>
            </div>
          )
        }
      </div>

      {/* Trader Details Modal */}
      {selectedTrader && (
        <TraderDetailsModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTrader(null);
          }}
          traderAddress={selectedTrader.address}
          traderName={selectedTrader.botName || formatAddress(selectedTrader.address)}
        />
      )}
    </div >
  );
}
