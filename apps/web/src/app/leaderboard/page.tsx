"use client";

import { useState, useEffect } from "react";
import { getTraders, type Trader } from "@/lib/tradersApi";
import { AlertCircle, RefreshCw, ChevronDown, Plus } from "lucide-react";

type SortOption = "pnl" | "roi" | "volume" | "trades";

export default function LeaderboardPage() {
  const [traders, setTraders] = useState<Trader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("pnl");

  const fetchTraders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getTraders();
      if (response.success) {
        setTraders(response.data);
      } else {
        setError("Failed to fetch traders");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load traders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTraders();
  }, []);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
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
    // TODO: Implement copy trade functionality
    console.log("Starting copy trade for:", trader.address);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin h-12 w-12 text-blue-400 mx-auto mb-4" />
          <p className="text-slate-400">Loading top traders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-6 flex items-center gap-3 max-w-md">
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
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto py-8 px-6 sm:px-8 lg:px-12 xl:px-16">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                Top Traders to Copy
              </h1>
              <p className="text-slate-300 text-base font-semibold">
                Discover elite traders and mirror their strategies
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Sort by */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  Sort by:
                </span>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="appearance-none bg-slate-900/80 border border-slate-700 rounded-2xl px-4 py-2.5 pr-8 text-sm text-slate-200 font-medium cursor-pointer hover:border-blue-500/50 hover:bg-slate-900 transition-all focus:outline-none focus:border-blue-500/70 focus:ring-2 focus:ring-blue-500/20 shadow-sm"
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
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedTraders.map((trader, index) => {
            const pnl = parseFloat(trader.pnl);
            const roi = parseFloat(trader.roi);
            const isPositive = pnl >= 0;
            const rank = index + 1;

            return (
              <div
                key={trader.id}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors relative"
              >
                {/* Rank Badge & Header */}
                <div className="flex items-center gap-3 mb-4 relative">
                  {/* Rank Badge */}
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-sm flex-shrink-0">
                    #{rank}
                  </div>

                  {/* Avatar with Border */}
                  <div className="w-12 h-12 rounded-lg border-2 border-slate-700 p-0.5 flex-shrink-0">
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
                  <div className="min-w-0 flex-1 pr-20">
                    <p className="text-lg text-slate-200 font-bold mb-0.5 truncate">
                      {trader.botName || formatAddress(trader.address)}
                    </p>
                    <p className="text-xs text-slate-500 font-mono">
                      {formatAddress(trader.address)}
                    </p>
                  </div>

                  {/* Copy Button - Top Right */}
                  <button
                    onClick={() => handleCopyTrade(trader)}
                    className="absolute top-2 right-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all"
                  >
                    Copy
                  </button>
                </div>

                {/* Main Metrics - Vertical Split Layout */}
                <div className="flex flex-col gap-4">
                  {/* Upper Half - Large PNL */}
                  <div className="flex flex-col justify-center">
                    <p className="text-xs text-slate-500 mb-1">PNL</p>
                    <p
                      className={`text-4xl font-bold ${
                        isPositive ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {formatCurrency(trader.pnl)}
                    </p>
                  </div>

                  {/* Lower Half - Volume, ROI, Trades Side by Side */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Volume</p>
                      <p className="text-base font-semibold text-slate-300">
                        {formatCurrency(trader.totalVolume)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">ROI</p>
                      <p className="text-base font-semibold text-slate-300">
                        {formatNumber(trader.roi)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Trades</p>
                      <p className="text-base font-semibold text-slate-300">
                        {trader.numberOfTxns}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Custom Bot Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors flex flex-col items-center justify-center min-h-[280px] cursor-pointer group">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-slate-800/60 group-hover:bg-blue-600/20 border-2 border-dashed border-slate-700 group-hover:border-blue-500/50 flex items-center justify-center transition-all">
                <Plus
                  size={32}
                  className="text-slate-400 group-hover:text-blue-400 transition-colors"
                />
              </div>
              <p className="text-lg text-slate-300 font-bold">Custom Bot</p>
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
