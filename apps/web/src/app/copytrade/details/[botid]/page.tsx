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
  Sparkles,
} from "lucide-react";
import Image from "next/image";

interface TradeHistory {
  id: string;
  timestamp: string;
  direction: "Long" | "Exit Long" | "Short" | "Exit Short";
  symbol: "BTC" | "ETH" | "APT";
  leverage: string;
  size: string;
  price: string;
  orderValue: string;
  pnl: string;
}

interface OpenPosition {
  id: string;
  symbol: "BTC" | "ETH" | "APT";
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

  // Dummy data for now - matching the image structure
  const [tradeHistory] = useState<TradeHistory[]>([
    {
      id: "1",
      timestamp: "12:35:40 PM • 10/3/2025",
      direction: "Exit Long",
      symbol: "BTC",
      leverage: "5x",
      size: "0.00011",
      price: "119,917",
      orderValue: "13.19",
      pnl: "+1.14",
    },
    {
      id: "2",
      timestamp: "12:01:30 AM • 9/26/2025",
      direction: "Long",
      symbol: "BTC",
      leverage: "5x",
      size: "0.00011",
      price: "109,481",
      orderValue: "12.04",
      pnl: "-0.01",
    },
    {
      id: "3",
      timestamp: "9:13:23 PM • 9/24/2025",
      direction: "Exit Long",
      symbol: "BTC",
      leverage: "5x",
      size: "0.00010",
      price: "113,653",
      orderValue: "11.37",
      pnl: "-0.01",
    },
    {
      id: "4",
      timestamp: "2:15:10 PM • 9/20/2025",
      direction: "Long",
      symbol: "ETH",
      leverage: "3x",
      size: "0.0047",
      price: "3,245.50",
      orderValue: "15.25",
      pnl: "+2.45",
    },
    {
      id: "5",
      timestamp: "11:30:45 AM • 9/18/2025",
      direction: "Long",
      symbol: "APT",
      leverage: "10x",
      size: "2.23",
      price: "8.95",
      orderValue: "20.00",
      pnl: "+5.20",
    },
  ]);

  const [openPositions] = useState<OpenPosition[]>([
    {
      id: "1",
      symbol: "APT",
      side: "LONG",
      size: "2.23",
      entryPrice: "12.45",
      markPrice: "12.78",
      pnl: "+33.15",
      pnlPercent: "+2.65%",
      leverage: "10x",
    },
    {
      id: "2",
      symbol: "BTC",
      side: "LONG",
      size: "0.00011",
      entryPrice: "109,481",
      markPrice: "110,200",
      pnl: "+0.08",
      pnlPercent: "+0.66%",
      leverage: "5x",
    },
  ]);

  // Performance metrics (calculated from bot data and dummy data)
  const totalPnl = bot ? parseFloat(bot.pnl) : 0;
  const realizedPnl = 155.4; // Dummy
  const unrealizedPnl = totalPnl - realizedPnl;
  const totalVolume = 3720.5; // Dummy
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
    // Bot ID is already 8-9 characters, just add # prefix
    return `#${id}`;
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

  const getSymbolLogo = (symbol: "BTC" | "ETH" | "APT") => {
    switch (symbol) {
      case "BTC":
        return "/btc.png";
      case "ETH":
        return "/eth.png";
      case "APT":
        return "/aptos.png";
      default:
        return "/aptos.png";
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
          <p className="text-slate-400 mb-6">
            {error || "The bot you're looking for doesn't exist."}
          </p>
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
    <div className="min-h-screen relative">
      <div className="max-w-7xl mx-auto py-4 sm:py-5 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back</span>
        </button>

        {/* Bot Details ID Header - Premium Styling */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-3">
            <Sparkles size={14} className="text-blue-400 animate-pulse" />
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
              Bot Details
            </span>
          </div>
          <div className="flex items-center justify-center gap-3 mb-1.5">
            <h1 className="text-2xl sm:text-3xl font-semibold bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">
              Bot Details
            </h1>
            <div className="px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-lg">
              <span className="text-blue-400 font-mono font-semibold text-sm">
                {formatBotId(bot.id)}
              </span>
            </div>
          </div>
          <p className="text-slate-400 text-sm max-w-xl mx-auto leading-relaxed mb-1.5">
            Comprehensive overview of your copy trading bot performance
          </p>
          {/* Animated underline */}
          <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent mx-auto mt-1.5" />
        </div>

        {/* Parameters Section - Premium Styling */}
        <div
          className="mb-6 rounded-[18px] p-5 sm:p-6"
          style={{
            background:
              "linear-gradient(180deg, rgba(28, 31, 46, 0.8) 0%, rgba(22, 24, 33, 0.8) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.25)",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Settings size={18} className="text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Parameters</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Target Address */}
            <div className="bg-slate-900/30 rounded-lg p-4 border border-slate-800/50">
              <div className="flex items-center gap-2 mb-1.5">
                <Wallet size={14} className="text-slate-400" />
                <span className="text-[13px] text-slate-500 uppercase tracking-wider font-medium">
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
            <div className="bg-slate-900/30 rounded-lg p-4 border border-slate-800/50">
              <div className="flex items-center gap-2 mb-1.5">
                <Activity size={14} className="text-slate-400" />
                <span className="text-[13px] text-slate-500 uppercase tracking-wider font-medium">
                  Status
                </span>
              </div>
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
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
            <div className="bg-slate-900/30 rounded-lg p-4 border border-slate-800/50">
              <div className="flex items-center gap-2 mb-1.5">
                <Settings size={14} className="text-slate-400" />
                <span className="text-[13px] text-slate-500 uppercase tracking-wider font-medium">
                  Trading Mode
                </span>
              </div>
              <span className="text-sm font-medium text-slate-200 capitalize">
                {bot.mode.replace("_", " ")}
              </span>
            </div>

            {/* Allocation */}
            <div className="bg-slate-900/30 rounded-lg p-4 border border-slate-800/50">
              <div className="flex items-center gap-2 mb-1.5">
                <DollarSign size={14} className="text-slate-400" />
                <span className="text-[13px] text-slate-500 uppercase tracking-wider font-medium">
                  Allocation
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-slate-200">
                  ${parseFloat(bot.allocatedAmount).toFixed(2)}
                </span>
                <span className="text-xs text-slate-400 ml-2">
                  ({parseFloat(bot.allocationPercent).toFixed(1)}%)
                </span>
              </div>
            </div>

            {/* Created At */}
            <div className="bg-slate-900/30 rounded-lg p-4 border border-slate-800/50">
              <div className="flex items-center gap-2 mb-1.5">
                <Clock size={14} className="text-slate-400" />
                <span className="text-[13px] text-slate-500 uppercase tracking-wider font-medium">
                  Created
                </span>
              </div>
              <span className="text-sm text-slate-200">
                {formatDate(bot.createdAt)}
              </span>
            </div>

            {/* Started At */}
            <div className="bg-slate-900/30 rounded-lg p-4 border border-slate-800/50">
              <div className="flex items-center gap-2 mb-1.5">
                <Clock size={14} className="text-slate-400" />
                <span className="text-[13px] text-slate-500 uppercase tracking-wider font-medium">
                  Started
                </span>
              </div>
              <span className="text-sm text-slate-200">
                {formatDate(bot.startedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Performance Metrics Section - Premium Styling */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-blue-400" />
            <h2 className="text-lg font-semibold text-white">
              Performance Metrics
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Total PNL */}
            <div
              className="rounded-[18px] p-5"
              style={{
                background:
                  "linear-gradient(180deg, rgba(28, 31, 46, 0.8) 0%, rgba(22, 24, 33, 0.8) 100%)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.25)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-slate-400" />
                <span className="text-[13px] text-slate-500 uppercase tracking-wider font-medium">
                  Total PNL
                </span>
              </div>
              <p
                className={`text-2xl font-semibold ${
                  totalPnl >= 0 ? "text-[#4ADE80]" : "text-[#F87171]"
                }`}
              >
                {totalPnl >= 0 ? "+" : ""}
                {totalPnl.toFixed(2)} USDT
              </p>
            </div>

            {/* Realized PNL */}
            <div
              className="rounded-[18px] p-5"
              style={{
                background:
                  "linear-gradient(180deg, rgba(28, 31, 46, 0.8) 0%, rgba(22, 24, 33, 0.8) 100%)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.25)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-slate-400" />
                <span className="text-[13px] text-slate-500 uppercase tracking-wider font-medium">
                  Realized PNL
                </span>
              </div>
              <p
                className={`text-2xl font-semibold ${
                  realizedPnl >= 0 ? "text-[#4ADE80]" : "text-[#F87171]"
                }`}
              >
                {realizedPnl >= 0 ? "+" : ""}
                {realizedPnl.toFixed(2)} USDT
              </p>
            </div>

            {/* Unrealized PNL */}
            <div
              className="rounded-[18px] p-5"
              style={{
                background:
                  "linear-gradient(180deg, rgba(28, 31, 46, 0.8) 0%, rgba(22, 24, 33, 0.8) 100%)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.25)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown size={16} className="text-slate-400" />
                <span className="text-[13px] text-slate-500 uppercase tracking-wider font-medium">
                  Unrealized PNL
                </span>
              </div>
              <p
                className={`text-2xl font-semibold ${
                  unrealizedPnl >= 0 ? "text-[#4ADE80]" : "text-[#F87171]"
                }`}
              >
                {unrealizedPnl >= 0 ? "+" : ""}
                {unrealizedPnl.toFixed(2)} USDT
              </p>
            </div>

            {/* Number of Trades */}
            <div
              className="rounded-[18px] p-5"
              style={{
                background:
                  "linear-gradient(180deg, rgba(28, 31, 46, 0.8) 0%, rgba(22, 24, 33, 0.8) 100%)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.25)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Activity size={16} className="text-slate-400" />
                <span className="text-[13px] text-slate-500 uppercase tracking-wider font-medium">
                  Number of Trades
                </span>
              </div>
              <p className="text-2xl font-semibold text-slate-200">
                {bot.totalTrades || 0}
              </p>
            </div>

            {/* Activation Time */}
            <div
              className="rounded-[18px] p-5"
              style={{
                background:
                  "linear-gradient(180deg, rgba(28, 31, 46, 0.8) 0%, rgba(22, 24, 33, 0.8) 100%)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.25)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} className="text-slate-400" />
                <span className="text-[13px] text-slate-500 uppercase tracking-wider font-medium">
                  Activation Time
                </span>
              </div>
              <p className="text-sm font-medium text-slate-200">
                {formatDate(activationTime)}
              </p>
            </div>

            {/* Total Volume */}
            <div
              className="rounded-[18px] p-5"
              style={{
                background:
                  "linear-gradient(180deg, rgba(28, 31, 46, 0.8) 0%, rgba(22, 24, 33, 0.8) 100%)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.25)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={16} className="text-slate-400" />
                <span className="text-[13px] text-slate-500 uppercase tracking-wider font-medium">
                  Total Volume
                </span>
              </div>
              <p className="text-2xl font-semibold text-slate-200">
                ${totalVolume.toLocaleString()} USDT
              </p>
            </div>
          </div>
        </div>

        {/* Open Positions & Bot Details - Compact Horizontal View */}
        <div className="mb-6">
          <div
            className="rounded-[18px] p-5 sm:p-6"
            style={{
              background:
                "linear-gradient(180deg, rgba(28, 31, 46, 0.8) 0%, rgba(22, 24, 33, 0.8) 100%)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.25)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-blue-400" />
                <h2 className="text-lg font-semibold text-white">
                  Open Positions
                </h2>
              </div>
              {/* Compact Bot Details */}
              <div className="flex items-center gap-4 flex-wrap">
                {/* Status */}
                <div className="flex items-center gap-2">
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
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
                {/* Total PNL */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 uppercase tracking-wider">
                    Total PNL:
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      totalPnl >= 0 ? "text-[#4ADE80]" : "text-[#F87171]"
                    }`}
                  >
                    {totalPnl >= 0 ? "+" : ""}
                    {totalPnl.toFixed(2)} USDT
                  </span>
                </div>
                {/* Allocation */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 uppercase tracking-wider">
                    Allocation:
                  </span>
                  <span className="text-sm font-semibold text-slate-200">
                    ${parseFloat(bot.allocatedAmount).toFixed(2)}
                  </span>
                </div>
                {/* Total Trades */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 uppercase tracking-wider">
                    Trades:
                  </span>
                  <span className="text-sm font-semibold text-slate-200">
                    {bot.totalTrades || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Horizontal Open Positions Cards */}
            {openPositions.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {openPositions.map((position) => (
                  <div
                    key={position.id}
                    className="flex-shrink-0 w-[280px] bg-slate-900/40 rounded-xl p-4 border border-slate-800/50 hover:border-slate-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Image
                          src={getSymbolLogo(position.symbol)}
                          alt={position.symbol}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-200">
                            {position.symbol}
                          </p>
                          <p
                            className={`text-xs font-medium ${position.side === "LONG" ? "text-green-400" : "text-red-400"}`}
                          >
                            {position.leverage} • {position.side}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-[10px] font-medium ${
                          position.side === "LONG"
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {position.side}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {/* Size */}
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Size</span>
                        <span className="text-sm font-semibold text-slate-200">
                          {position.size} {position.symbol}
                        </span>
                      </div>

                      {/* Entry Price */}
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Entry</span>
                        <span className="text-sm font-medium text-slate-300">
                          {position.entryPrice}
                        </span>
                      </div>

                      {/* Mark Price */}
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Mark</span>
                        <span className="text-sm font-medium text-slate-300">
                          {position.markPrice}
                        </span>
                      </div>

                      {/* PNL */}
                      <div className="flex justify-between items-center pt-2 border-t border-slate-800/50">
                        <span className="text-xs text-slate-500">PnL</span>
                        <div className="text-right">
                          <span
                            className={`text-sm font-semibold ${
                              position.pnl.startsWith("+")
                                ? "text-[#4ADE80]"
                                : "text-[#F87171]"
                            }`}
                          >
                            {position.pnl} USDT
                          </span>
                          <span
                            className={`text-xs ml-2 ${
                              position.pnlPercent.startsWith("+")
                                ? "text-[#4ADE80]"
                                : "text-[#F87171]"
                            }`}
                          >
                            {position.pnlPercent}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp size={32} className="text-slate-500 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No open positions</p>
              </div>
            )}
          </div>
        </div>

        {/* Copy Trade History Section - Premium Styling */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-blue-400" />
            <h2 className="text-lg font-semibold text-white">
              Copy Trade History
            </h2>
          </div>
          <div
            className="rounded-[18px] overflow-hidden"
            style={{
              background:
                "linear-gradient(180deg, rgba(28, 31, 46, 0.8) 0%, rgba(22, 24, 33, 0.8) 100%)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.25)",
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/30 border-b border-slate-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-[13px] font-medium text-slate-500 uppercase tracking-wider">
                      Symbol
                    </th>
                    <th className="px-4 py-3 text-left text-[13px] font-medium text-slate-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-[13px] font-medium text-slate-500 uppercase tracking-wider">
                      Direction
                    </th>
                    <th className="px-4 py-3 text-left text-[13px] font-medium text-slate-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-4 py-3 text-left text-[13px] font-medium text-slate-500 uppercase tracking-wider">
                      Price (USDT)
                    </th>
                    <th className="px-4 py-3 text-left text-[13px] font-medium text-slate-500 uppercase tracking-wider">
                      Order Value (USDT)
                    </th>
                    <th className="px-4 py-3 text-left text-[13px] font-medium text-slate-500 uppercase tracking-wider">
                      PnL (USDT)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {tradeHistory.map((trade) => (
                    <tr
                      key={trade.id}
                      className="hover:bg-slate-900/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Image
                            src={getSymbolLogo(trade.symbol)}
                            alt={trade.symbol}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                          <div>
                            <p className="text-sm font-semibold text-slate-200">
                              {trade.symbol}
                            </p>
                            <p
                              className={`text-xs ${trade.direction.includes("Long") ? "text-green-400" : "text-red-400"}`}
                            >
                              {trade.leverage} •{" "}
                              {trade.direction.includes("Long")
                                ? "Long"
                                : "Short"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {trade.timestamp}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            trade.direction.includes("Long")
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : "bg-red-500/20 text-red-400 border border-red-500/30"
                          }`}
                        >
                          {trade.direction}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-200">
                            {trade.size}
                          </p>
                          <p className="text-xs text-slate-500">
                            {trade.symbol}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-200">
                        {trade.price}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-200">
                        {trade.orderValue}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-sm font-semibold ${
                            trade.pnl.startsWith("+")
                              ? "text-[#4ADE80]"
                              : "text-[#F87171]"
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
            {tradeHistory.length === 0 && (
              <div className="text-center py-12">
                <Activity size={32} className="text-slate-500 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">
                  No trade history available
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
