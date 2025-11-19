"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCopyTradeBot, type CopyTradeBot } from "@/lib/copyTradeBotsApi";
import {
  ArrowLeft,
  Copy,
  Check,
  Wallet,
  Settings,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  DollarSign,
  BarChart3,
  AlertCircle,
  Loader,
  ExternalLink,
} from "lucide-react";

interface TradeHistory {
  id: string;
  timestamp: string;
  type: "BUY" | "SELL";
  pair: string;
  price: string;
  usdtValue: string;
  pnl: string;
  status: "FILLED" | "PARTIAL" | "CANCELLED";
}

interface OpenPosition {
  id: string;
  pair: string;
  side: "LONG" | "SHORT";
  size: string;
  entryPrice: string;
  markPrice: string;
  pnl: string;
  pnlPercent: string;
  leverage: string;
}

export default function BotDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const botId = params?.botid as string;
  const [bot, setBot] = useState<CopyTradeBot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Dummy data for now
  const [tradeHistory] = useState<TradeHistory[]>([
    {
      id: "1",
      timestamp: "2024-01-15 10:30:25",
      type: "BUY",
      pair: "APT/USDT",
      price: "12.45",
      usdtValue: "1250.50",
      pnl: "+45.20",
      status: "FILLED",
    },
    {
      id: "2",
      timestamp: "2024-01-15 09:15:10",
      type: "SELL",
      pair: "APT/USDT",
      price: "12.80",
      usdtValue: "1280.00",
      pnl: "+125.50",
      status: "FILLED",
    },
    {
      id: "3",
      timestamp: "2024-01-14 16:45:30",
      type: "BUY",
      pair: "APT/USDT",
      price: "11.90",
      usdtValue: "1190.00",
      pnl: "-15.30",
      status: "FILLED",
    },
  ]);

  const [openPositions] = useState<OpenPosition[]>([
    {
      id: "1",
      pair: "APT/USDT",
      side: "LONG",
      size: "100.50",
      entryPrice: "12.45",
      markPrice: "12.78",
      pnl: "+33.15",
      pnlPercent: "+2.65%",
      leverage: "10x",
    },
  ]);

  // Performance metrics (calculated from bot data and dummy data)
  const totalPnl = bot ? parseFloat(bot.pnl) : 0;
  const realizedPnl = 155.40; // Dummy
  const unrealizedPnl = totalPnl - realizedPnl;
  const totalVolume = 3720.50; // Dummy
  const activationTime = bot?.startedAt || bot?.createdAt || "";

  useEffect(() => {
    let mounted = true;
    
    async function fetchBotDetails() {
      if (!botId) {
        setError("Bot ID is required");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await getCopyTradeBot(botId);
        if (!mounted) return;
        
        if (result.success && result.data) {
          setBot(result.data);
        } else {
          setError(result.error || "Failed to fetch bot details");
        }
      } catch (err: any) {
        if (!mounted) return;
        setError(err.message || "Failed to load bot details");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    // Set a timeout to ensure loading is always set to false
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn("[BotDetails] Load timeout, setting loading to false");
        setLoading(false);
      }
    }, 10000); // 10 second timeout

    fetchBotDetails();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [botId]);

  const formatBotId = (id: string) => {
    if (!id) return "";
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      const char = id.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    const code = Math.abs(hash).toString().slice(0, 8);
    const finalCode = code.length < 5 ? code.padStart(5, "0") : code.slice(0, 8);
    return `#${finalCode}`;
  };

  const formatAddress = (address: string | null) => {
    if (!address) return "Not assigned";
    if (address.length <= 12) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading bot details...</p>
        </div>
      </div>
    );
  }

  if (error || !bot) {
    return (
      <div className="min-h-screen bg-[#060913] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Bot Not Found</h1>
          <p className="text-slate-400 mb-6">{error || "The bot you're looking for doesn't exist."}</p>
          <button
            onClick={() => router.push("/copytrade")}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Back to Copy Trading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back</span>
        </button>

        {/* Bot Details ID Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Bot Details
            </h1>
            <div className="px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-lg">
              <span className="text-blue-400 font-mono font-semibold text-sm">
                {formatBotId(bot.id)}
              </span>
            </div>
          </div>
          <p className="text-slate-400 text-sm">
            Comprehensive overview of your copy trading bot performance
          </p>
        </div>

        {/* Parameters Section */}
        <div className="mb-6 bg-gradient-to-br from-[#1a1d2e] via-[#151824] to-[#0f1117] border border-slate-700/50 rounded-xl p-5 sm:p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Settings size={18} className="text-blue-400" />
            <h2 className="text-lg font-bold text-white">Parameters</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Target Address */}
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Wallet size={14} className="text-slate-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">
                  Target Address
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-slate-200 break-all">
                  {formatAddress(bot.traderAddress)}
                </span>
                {bot.traderAddress && (
                  <button
                    onClick={() => copyToClipboard(bot.traderAddress!)}
                    className="p-1 hover:bg-slate-800 rounded transition-colors"
                  >
                    {copied ? (
                      <Check size={14} className="text-green-400" />
                    ) : (
                      <Copy size={14} className="text-slate-400" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Activity size={14} className="text-slate-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">
                  Status
                </span>
              </div>
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold ${
                  bot.status === "running"
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    bot.status === "running" ? "bg-green-400" : "bg-red-400"
                  }`}
                />
                {bot.status === "running" ? "Running" : "Stopped"}
              </div>
            </div>

            {/* Mode */}
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Settings size={14} className="text-slate-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">
                  Trading Mode
                </span>
              </div>
              <span className="text-sm font-semibold text-slate-200 capitalize">
                {bot.mode.replace("_", " ")}
              </span>
            </div>

            {/* Allocation */}
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800/50">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={14} className="text-slate-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">
                  Allocation
                </span>
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-200">
                  ${parseFloat(bot.allocatedAmount).toFixed(2)}
                </span>
                <span className="text-xs text-slate-400 ml-2">
                  ({parseFloat(bot.allocationPercent).toFixed(1)}%)
                </span>
              </div>
            </div>

            {/* Created At */}
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-slate-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">
                  Created
                </span>
              </div>
              <span className="text-sm text-slate-200">
                {formatDate(bot.createdAt)}
              </span>
            </div>

            {/* Started At */}
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-slate-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">
                  Started
                </span>
              </div>
              <span className="text-sm text-slate-200">
                {formatDate(bot.startedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Performance Metrics Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-blue-400" />
            <h2 className="text-lg font-bold text-white">Performance Metrics</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Total PNL */}
            <div className="bg-gradient-to-br from-[#1a1d2e] via-[#151824] to-[#0f1117] border border-slate-700/50 rounded-xl p-5 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-slate-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">
                  Total PNL
                </span>
              </div>
              <p
                className={`text-2xl font-bold ${
                  totalPnl >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {totalPnl >= 0 ? "+" : ""}
                {totalPnl.toFixed(2)} USDT
              </p>
            </div>

            {/* Realized PNL */}
            <div className="bg-gradient-to-br from-[#1a1d2e] via-[#151824] to-[#0f1117] border border-slate-700/50 rounded-xl p-5 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-slate-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">
                  Realized PNL
                </span>
              </div>
              <p
                className={`text-2xl font-bold ${
                  realizedPnl >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {realizedPnl >= 0 ? "+" : ""}
                {realizedPnl.toFixed(2)} USDT
              </p>
            </div>

            {/* Unrealized PNL */}
            <div className="bg-gradient-to-br from-[#1a1d2e] via-[#151824] to-[#0f1117] border border-slate-700/50 rounded-xl p-5 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown size={16} className="text-slate-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">
                  Unrealized PNL
                </span>
              </div>
              <p
                className={`text-2xl font-bold ${
                  unrealizedPnl >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {unrealizedPnl >= 0 ? "+" : ""}
                {unrealizedPnl.toFixed(2)} USDT
              </p>
            </div>

            {/* Number of Trades */}
            <div className="bg-gradient-to-br from-[#1a1d2e] via-[#151824] to-[#0f1117] border border-slate-700/50 rounded-xl p-5 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <Activity size={16} className="text-slate-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">
                  Number of Trades
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-200">
                {bot.totalTrades || 0}
              </p>
            </div>

            {/* Activation Time */}
            <div className="bg-gradient-to-br from-[#1a1d2e] via-[#151824] to-[#0f1117] border border-slate-700/50 rounded-xl p-5 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} className="text-slate-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">
                  Activation Time
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-200">
                {formatDate(activationTime)}
              </p>
            </div>

            {/* Total Volume */}
            <div className="bg-gradient-to-br from-[#1a1d2e] via-[#151824] to-[#0f1117] border border-slate-700/50 rounded-xl p-5 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={16} className="text-slate-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">
                  Total Volume
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-200">
                ${totalVolume.toLocaleString()} USDT
              </p>
            </div>
          </div>
        </div>

        {/* Open Positions Section */}
        {openPositions.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-blue-400" />
              <h2 className="text-lg font-bold text-white">Open Positions</h2>
            </div>
            <div className="bg-gradient-to-br from-[#1a1d2e] via-[#151824] to-[#0f1117] border border-slate-700/50 rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900/50 border-b border-slate-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Pair
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Side
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Size (USDT)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Entry Price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Mark Price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        PNL
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Leverage
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {openPositions.map((position) => (
                      <tr
                        key={position.id}
                        className="hover:bg-slate-900/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-semibold text-slate-200">
                          {position.pair}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              position.side === "LONG"
                                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                : "bg-red-500/20 text-red-400 border border-red-500/30"
                            }`}
                          >
                            {position.side}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-200">
                          {position.size}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-200">
                          ${position.entryPrice}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-200">
                          ${position.markPrice}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span
                              className={`text-sm font-semibold ${
                                position.pnl.startsWith("+")
                                  ? "text-green-400"
                                  : "text-red-400"
                              }`}
                            >
                              {position.pnl} USDT
                            </span>
                            <span
                              className={`text-xs ${
                                position.pnlPercent.startsWith("+")
                                  ? "text-green-400"
                                  : "text-red-400"
                              }`}
                            >
                              {position.pnlPercent}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-200">
                          {position.leverage}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Copy Trade History Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-blue-400" />
            <h2 className="text-lg font-bold text-white">Copy Trade History</h2>
          </div>
          <div className="bg-gradient-to-br from-[#1a1d2e] via-[#151824] to-[#0f1117] border border-slate-700/50 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50 border-b border-slate-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Pair
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Value (USDT)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      PNL
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {tradeHistory.map((trade) => (
                    <tr
                      key={trade.id}
                      className="hover:bg-slate-900/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {trade.timestamp}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            trade.type === "BUY"
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : "bg-red-500/20 text-red-400 border border-red-500/30"
                          }`}
                        >
                          {trade.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-200">
                        {trade.pair}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-200">
                        ${trade.price}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-200">
                        {trade.usdtValue} USDT
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-sm font-semibold ${
                            trade.pnl.startsWith("+")
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {trade.pnl} USDT
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            trade.status === "FILLED"
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : trade.status === "PARTIAL"
                              ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                              : "bg-red-500/20 text-red-400 border border-red-500/30"
                          }`}
                        >
                          {trade.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {tradeHistory.length === 0 && (
              <div className="text-center py-12">
                <Activity size={32} className="text-slate-500 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No trade history available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

