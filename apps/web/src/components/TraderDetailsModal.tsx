"use client";

import { useEffect, useState } from "react";
import { X, RefreshCw, TrendingUp, Loader } from "lucide-react";
import Image from "next/image";
import { Palanquin_Dark } from "next/font/google";
import {
  getPositionsByAddress,
  getTradeHistoryByAddress,
} from "@/lib/traderDetailsApi";
import { mapPositionToOpenPosition } from "@/lib/positionsApi";
import { mapOrderHistoryToTradeHistory } from "@/lib/orderHistoryApi";

const palanquinDark = Palanquin_Dark({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

interface TraderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  traderAddress: string;
  traderName: string;
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
  direction: "Long" | "Short" | "Exit Long" | "Exit Short";
  symbol: "BTC" | "ETH" | "APT" | "SOL";
  leverage: string;
  size: string;
  price: string;
  orderValue: string;
  fee: string;
  pnl: string;
}

const getSymbolLogo = (symbol: string) => {
  const logos: { [key: string]: string } = {
    BTC: "/btc.png",
    ETH: "/eth.png",
    APT: "/aptos.png",
    SOL: "/sol.png",
  };
  return logos[symbol] || "/btc.png";
};

const formatAddress = (address: string) => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default function TraderDetailsModal({
  isOpen,
  onClose,
  traderAddress,
  traderName,
}: TraderDetailsModalProps) {
  const [positions, setPositions] = useState<OpenPosition[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeHistory[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<"positions" | "history">("positions");
  const maxTradesToShow = 9;

  useEffect(() => {
    if (isOpen) {
      fetchData();
    } else {
      // Reset state when modal closes
      setPositions([]);
      setTradeHistory([]);
      setActiveTab("positions");
    }
  }, [isOpen, traderAddress]);


  const fetchData = async () => {
    setLoadingPositions(true);
    setLoadingHistory(true);

    try {
      const [positionsResult, historyResult] = await Promise.all([
        getPositionsByAddress(traderAddress),
        getTradeHistoryByAddress(traderAddress),
      ]);

      if (positionsResult.success && positionsResult.data) {
        setPositions(
          positionsResult.data.map(mapPositionToOpenPosition)
        );
      } else {
        setPositions([]);
      }

      if (historyResult.success && historyResult.data) {
        setTradeHistory(
          historyResult.data.map(mapOrderHistoryToTradeHistory)
        );
      } else {
        setTradeHistory([]);
      }
    } catch (error) {
      console.error("Error fetching trader details:", error);
      setPositions([]);
      setTradeHistory([]);
    } finally {
      setLoadingPositions(false);
      setLoadingHistory(false);
    }
  };

  const refreshData = async () => {
    if (activeTab === "positions") {
      setLoadingPositions(true);
      try {
        const result = await getPositionsByAddress(traderAddress);
        if (result.success && result.data) {
          setPositions(result.data.map(mapPositionToOpenPosition));
        } else {
          setPositions([]);
        }
      } catch (error) {
        console.error("Error refreshing positions:", error);
      } finally {
        setLoadingPositions(false);
      }
    } else {
      setLoadingHistory(true);
      try {
        const result = await getTradeHistoryByAddress(traderAddress);
        if (result.success && result.data) {
          setTradeHistory(result.data.map(mapOrderHistoryToTradeHistory));
        } else {
          setTradeHistory([]);
        }
      } catch (error) {
        console.error("Error refreshing history:", error);
      } finally {
        setLoadingHistory(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pt-24 sm:pt-28">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-6xl max-h-[85vh] bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex-1">
            <h2 className={`${palanquinDark.className} text-2xl font-semibold text-white mb-1`}>
              {traderName}
            </h2>
            <p className="text-sm text-slate-400 font-mono">{formatAddress(traderAddress)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-800">
          <button
            onClick={() => setActiveTab("positions")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "positions"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            Open Positions ({positions.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "history"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            Trade History ({tradeHistory.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "positions" ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`${palanquinDark.className} text-lg font-semibold text-white`}>
                  Open Positions
                </h3>
                <button
                  onClick={refreshData}
                  disabled={loadingPositions}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-all disabled:opacity-50"
                >
                  <RefreshCw
                    size={14}
                    className={loadingPositions ? "animate-spin" : ""}
                  />
                  Refresh
                </button>
              </div>

              {loadingPositions ? (
                <div className="text-center py-12">
                  <Loader size={32} className="text-blue-400 mx-auto mb-3 animate-spin" />
                  <p className="text-slate-400 text-sm">Loading positions...</p>
                </div>
              ) : positions.length > 0 ? (
                <div className="rounded-lg overflow-hidden border border-slate-800">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-900/50 border-b border-slate-800">
                        <tr>
                          <th className="pl-6 pr-2 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            Symbol
                          </th>
                          <th className="px-2 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            Side
                          </th>
                          <th className="px-2 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            Size
                          </th>
                          <th className="px-2 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            Entry Price
                          </th>
                          <th className="px-2 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            Mark Price
                          </th>
                          <th className="px-2 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            Value
                          </th>
                          <th className="px-2 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            Leverage
                          </th>
                          <th className="pl-2 pr-6 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            PnL
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {positions.map((position) => (
                          <tr
                            key={position.id}
                            className="hover:bg-slate-800/30 transition-colors"
                          >
                            <td className="pl-6 pr-2 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <Image
                                    src={getSymbolLogo(position.symbol)}
                                    alt={position.symbol}
                                    width={24}
                                    height={24}
                                    className="rounded-full"
                                  />
                                  <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5">
                                    {position.side === "LONG" ? (
                                      <TrendingUp size={14} className="text-green-400" />
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
                            <td className="px-2 py-4 whitespace-nowrap text-right text-sm text-slate-200 font-mono">
                              {position.size}
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
                                    position.pnlPercent.startsWith("+")
                                      ? "text-green-500/70"
                                      : "text-red-500/70"
                                  }`}
                                >
                                  {position.pnlPercent}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 rounded-lg border border-slate-800">
                  <TrendingUp size={32} className="text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No open positions</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`${palanquinDark.className} text-lg font-semibold text-white`}>
                  Trade History
                  {tradeHistory.length > maxTradesToShow && (
                    <span className="text-sm text-slate-400 font-normal ml-2">
                      (Showing {maxTradesToShow} of {tradeHistory.length} recent trades)
                    </span>
                  )}
                </h3>
                <button
                  onClick={refreshData}
                  disabled={loadingHistory}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-all disabled:opacity-50"
                >
                  <RefreshCw
                    size={14}
                    className={loadingHistory ? "animate-spin" : ""}
                  />
                  Refresh
                </button>
              </div>

              {loadingHistory ? (
                <div className="text-center py-12">
                  <Loader size={32} className="text-blue-400 mx-auto mb-3 animate-spin" />
                  <p className="text-slate-400 text-sm">Loading trade history...</p>
                </div>
              ) : tradeHistory.length > 0 ? (
                <>
                  <div className="rounded-lg overflow-hidden border border-slate-800">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-900/50 border-b border-slate-800">
                          <tr>
                            <th className="pl-6 pr-2 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                              Symbol
                            </th>
                            <th className="px-2 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                              Time
                            </th>
                            <th className="px-2 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                              Direction
                            </th>
                            <th className="px-2 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                              Size
                            </th>
                            <th className="px-2 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                              Price
                            </th>
                            <th className="px-2 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                              Order Value
                            </th>
                            <th className="px-2 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                              Fee
                            </th>
                            <th className="pl-2 pr-6 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                              PnL
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {tradeHistory.slice(0, maxTradesToShow).map((trade) => (
                          <tr
                            key={trade.id}
                            className="hover:bg-slate-800/30 transition-colors"
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
                                    {trade.direction.includes("Exit") ? (
                                      <TrendingUp
                                        size={14}
                                        className="text-red-400 transform rotate-180"
                                      />
                                    ) : (
                                      <TrendingUp size={14} className="text-green-400" />
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-white">
                                    {trade.symbol}
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
                                  trade.direction.includes("Exit")
                                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                                    : "bg-green-500/10 text-green-400 border-green-500/20"
                                }`}
                              >
                                {trade.direction}
                              </span>
                            </td>
                            <td className="px-2 py-4 whitespace-nowrap text-right text-sm text-slate-200 font-mono">
                              {trade.size}
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
                  </div>

                </>
              ) : (
                <div className="text-center py-12 rounded-lg border border-slate-800">
                  <TrendingUp size={32} className="text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No trade history</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

