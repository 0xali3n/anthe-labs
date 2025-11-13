"use client";

import { useState, useEffect } from "react";
import {
  fetchTopPnlUsers,
  fetchTopVolumeUsers,
  fetchTopRoiUsers,
  fetchUserStats,
  testEndpoint,
  type Period,
  type LeaderboardUser,
} from "@/lib/leaderboardApi";
import {
  Search,
  RefreshCw,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  AlertCircle,
  Trophy,
  BarChart3,
  Target,
} from "lucide-react";

type LeaderboardType = "pnl" | "volume" | "roi";

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("overall");
  const [searchAddress, setSearchAddress] = useState("");
  const [leaderboardType, setLeaderboardType] =
    useState<LeaderboardType>("pnl");
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [testingEndpoints, setTestingEndpoints] = useState(false);
  const [userStats, setUserStats] = useState<any>(null);
  const [userStatsLoading, setUserStatsLoading] = useState(false);
  const [topTraders, setTopTraders] = useState<LeaderboardUser[]>([]);
  const [topTradersLoading, setTopTradersLoading] = useState(false);

  // Specific wallet addresses to fetch
  const topTraderAddresses = [
    "0x7a0c9c8518b2d160f584807137d207fb1cfac3907b8a9ec92a5ceb37c82510af",
    "0x28c01f6d36b550aa3c1420f91e86c461c155e7fef309ecf453078550f9c19bde",
    "0x1067563fbe3d3c0b9afac1584f97860e1712aef1eb7a3e2a2a8659205f1edb89",
    "0x4c4eab8302fc99c1e36310599ac5fe693356723de33320e0bb92436a144b4d0e",
    "0xd04547df48f5930351871d9c4ee7dae46c820fa6516aaba16152370d8aeea2ed",
    "0x59af92b856148bcf4e83129554147ae598613bed55ed314ca1d6af3cd0cc968e",
    "0x903c9d0e519d4049ad2e36bfc6a7cc7511741b50fb2249d9c3cf9e2c24218444",
    "0xf8afbb9b6e8146b09e6e25301dc647c2e352c570406527bd5a3b6936c1d57ed9",
    "0x54855aae195eef97f8250ca50c43c47404ddb3b3c50d5b26696eaceb3ce8e03f",
    "0x43cd76f68916165e67ecc9df67b67721fe4e92e8aaa12a01ad895ad47187b7cc",
  ];

  // Comprehensive list of endpoints to test
  const testEndpoints = [
    // Main endpoints
    { path: "/fetchTopPnlUsers", params: { period: "overall" } },
    { path: "/fetchTopVolumeUsers", params: { period: "overall" } },
    { path: "/fetchTopRoiUsers", params: { period: "overall" } },
    {
      path: "/fetchUserStats",
      params: {
        address:
          "0x61733ede5ead283951befc49822d0505f0e0fb1b9127c244de010dd2926c5907",
        period: "overall",
      },
    },

    // Time-based variations
    { path: "/fetchTopPnlUsers", params: { period: "daily" } },
    { path: "/fetchTopPnlUsers", params: { period: "weekly" } },
    { path: "/fetchTopPnlUsers", params: { period: "monthly" } },
    { path: "/fetchTopPnlUsers", params: { period: "yearly" } },
    { path: "/fetchTopVolumeUsers", params: { period: "daily" } },
    { path: "/fetchTopVolumeUsers", params: { period: "weekly" } },
    { path: "/fetchTopRoiUsers", params: { period: "daily" } },

    // Other potential endpoints
    { path: "/fetchRecentUsers", params: {} },
    { path: "/fetchRecentTransactions", params: {} },
    { path: "/getLeaderboard", params: { period: "overall" } },
    { path: "/leaderboard", params: { period: "overall" } },
    { path: "/topUsers", params: {} },
    { path: "/stats", params: {} },
    { path: "/health", params: {} },
    { path: "/ping", params: {} },
    { path: "/", params: {} },
    { path: "/api", params: {} },
    { path: "/api/leaderboard", params: {} },
  ];

  const periods: Period[] = ["overall", "daily", "weekly", "monthly", "yearly"];

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      let result;
      switch (leaderboardType) {
        case "pnl":
          result = await fetchTopPnlUsers(period, searchAddress || undefined);
          break;
        case "volume":
          result = await fetchTopVolumeUsers(
            period,
            searchAddress || undefined
          );
          break;
        case "roi":
          result = await fetchTopRoiUsers(period, searchAddress || undefined);
          break;
        default:
          result = await fetchTopPnlUsers(period, searchAddress || undefined);
      }
      setData(result);
    } catch (err: any) {
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleFetchUserStats = async () => {
    if (!searchAddress) {
      setError("Please enter a wallet address to fetch user stats");
      return;
    }

    setUserStatsLoading(true);
    setUserStats(null);

    try {
      const result = await fetchUserStats(searchAddress, period);
      setUserStats(result);
    } catch (err: any) {
      setError(err.message || "Failed to fetch user stats");
    } finally {
      setUserStatsLoading(false);
    }
  };

  const testAllEndpoints = async () => {
    setTestingEndpoints(true);
    setTestResults({});
    const results: Record<string, any> = {};

    for (const endpoint of testEndpoints) {
      const endpointKey = `${endpoint.path}${Object.keys(endpoint.params).length > 0 ? `?${new URLSearchParams(endpoint.params as any).toString()}` : ""}`;
      // Filter out undefined values to fix TypeScript error
      const filteredParams = Object.fromEntries(
        Object.entries(endpoint.params).filter(([_, v]) => v !== undefined)
      ) as Record<string, string>;
      const result = await testEndpoint(
        endpoint.path,
        Object.keys(filteredParams).length > 0 ? filteredParams : undefined
      );
      results[endpointKey] = result;
      setTestResults({ ...results });
      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    setTestingEndpoints(false);
  };

  // Fetch top traders data
  const fetchTopTraders = async () => {
    setTopTradersLoading(true);
    const traders: LeaderboardUser[] = [];

    for (const address of topTraderAddresses) {
      try {
        const result = await fetchTopPnlUsers(period, address);
        if (result.success && result.data && result.data.length > 0) {
          traders.push(result.data[0]);
        }
      } catch (error) {
        console.error(`Failed to fetch data for ${address}:`, error);
      }
      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Sort by PNL descending
    traders.sort((a, b) => parseFloat(b.PNL) - parseFloat(a.PNL));
    setTopTraders(traders);
    setTopTradersLoading(false);
  };

  // Auto-fetch on mount
  useEffect(() => {
    handleFetch();
    fetchTopTraders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-indigo-400 mb-2">
          PNL Leaderboard
        </h1>
        <p className="text-zinc-400">
          Test and explore the perpetual leaderboard API endpoints
        </p>
      </div>

      {/* Controls */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 mb-6 backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Leaderboard Type */}
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-2">
              Leaderboard Type
            </label>
            <select
              value={leaderboardType}
              onChange={(e) =>
                setLeaderboardType(e.target.value as LeaderboardType)
              }
              className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="pnl">Top PNL</option>
              <option value="volume">Top Volume</option>
              <option value="roi">Top ROI</option>
            </select>
          </div>

          {/* Period Selector */}
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-2">
              Time Period
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {periods.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Search Address */}
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-2">
              Wallet Address (Optional)
            </label>
            <input
              type="text"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
            />
          </div>

          {/* Fetch Buttons */}
          <div className="flex items-end gap-2">
            <button
              onClick={handleFetch}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <Search size={16} />
                  <span>Fetch</span>
                </>
              )}
            </button>
            {searchAddress && (
              <button
                onClick={handleFetchUserStats}
                disabled={userStatsLoading}
                className="px-4 py-2.5 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Fetch user stats"
              >
                {userStatsLoading ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Target size={16} />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Test All Endpoints Button */}
        <div className="pt-4 border-t border-zinc-800">
          <button
            onClick={testAllEndpoints}
            disabled={testingEndpoints}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-xl transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testingEndpoints ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Testing Endpoints...</span>
              </>
            ) : (
              <>
                <Activity size={16} />
                <span>Test All Endpoints ({testEndpoints.length})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
          <p className="text-red-400 font-medium">{error}</p>
        </div>
      )}

      {/* User Stats Display */}
      {userStats && (
        <div className="mb-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <Target size={20} className="text-indigo-400" />
            <h2 className="text-xl font-semibold text-zinc-100">
              User Statistics
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {userStats.rank && (
              <div className="p-4 bg-zinc-800/50 rounded-xl">
                <p className="text-xs text-zinc-500 mb-1">Overall Rank</p>
                <p className="text-2xl font-bold text-indigo-400">
                  #{userStats.rank}
                </p>
              </div>
            )}
            {userStats.totalVolume && (
              <div className="p-4 bg-zinc-800/50 rounded-xl">
                <p className="text-xs text-zinc-500 mb-1">Trading Volume</p>
                <p className="text-2xl font-bold text-zinc-100">
                  $
                  {parseFloat(userStats.totalVolume).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            )}
            {userStats.roi !== undefined && (
              <div className="p-4 bg-zinc-800/50 rounded-xl">
                <p className="text-xs text-zinc-500 mb-1">ROI</p>
                <p
                  className={`text-2xl font-bold ${
                    parseFloat(userStats.roi) >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {parseFloat(userStats.roi).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  %
                </p>
              </div>
            )}
          </div>
          <pre className="mt-4 text-xs text-zinc-400 overflow-x-auto bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
            {JSON.stringify(userStats, null, 2)}
          </pre>
        </div>
      )}

      {/* Main Data Display */}
      {data && (
        <div className="space-y-6">
          {/* Response Info */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp size={20} className="text-indigo-400" />
              <h2 className="text-xl font-semibold text-zinc-100">
                Response Information
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-zinc-800/50 rounded-xl">
                <p className="text-xs text-zinc-500 mb-1">Status</p>
                <p
                  className={`text-lg font-bold ${data.success ? "text-green-400" : "text-red-400"}`}
                >
                  {data.success ? "Success" : "Failed"}
                </p>
              </div>
              <div className="p-4 bg-zinc-800/50 rounded-xl">
                <p className="text-xs text-zinc-500 mb-1">Message</p>
                <p className="text-zinc-100 font-medium">
                  {data.message || "N/A"}
                </p>
              </div>
              {data.pagination && (
                <div className="p-4 bg-zinc-800/50 rounded-xl">
                  <p className="text-xs text-zinc-500 mb-1">Total Results</p>
                  <p className="text-zinc-100 font-bold text-lg">
                    {data.pagination.total}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Leaderboard Table */}
          {data.data && data.data.length > 0 && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-sm">
              <div className="p-6 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  {leaderboardType === "pnl" && (
                    <Trophy size={20} className="text-indigo-400" />
                  )}
                  {leaderboardType === "volume" && (
                    <DollarSign size={20} className="text-indigo-400" />
                  )}
                  {leaderboardType === "roi" && (
                    <BarChart3 size={20} className="text-indigo-400" />
                  )}
                  <h2 className="text-xl font-semibold text-zinc-100">
                    Top Traders ({data.data.length} users)
                  </h2>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-zinc-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Address
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Transactions
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Total Volume
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        PNL
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        ROI
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {data.data.map((user: LeaderboardUser, index: number) => (
                      <tr
                        key={user.Address}
                        className="hover:bg-zinc-800/30 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {user.Rank <= 3 && (
                              <span className="text-indigo-400 font-bold">
                                #{user.Rank}
                              </span>
                            )}
                            {user.Rank > 3 && (
                              <span className="text-zinc-400">{user.Rank}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-sm text-zinc-300 font-mono">
                            {user.Address.slice(0, 10)}...
                            {user.Address.slice(-8)}
                          </code>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-zinc-300">
                          {user.NumberOfTxns.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-zinc-300 font-medium">
                            $
                            {parseFloat(user.TotalVolume).toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span
                            className={`font-bold ${
                              parseFloat(user.PNL) >= 0
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {parseFloat(user.PNL) >= 0 ? "+" : ""}$
                            {parseFloat(user.PNL).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-indigo-400 font-bold">
                            {parseFloat(user.ROI).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                            %
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination Info */}
          {data.pagination && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between text-sm text-zinc-400">
                <span>
                  Page {data.pagination.currentPage} of{" "}
                  {data.pagination.totalPages}
                </span>
                <span>{data.pagination.perPage} per page</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Test Results */}
      {Object.keys(testResults).length > 0 && (
        <div className="mt-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Activity size={20} className="text-indigo-400" />
              <h2 className="text-xl font-semibold text-zinc-100">
                Endpoint Test Results
              </h2>
            </div>
            <div className="text-sm text-zinc-400">
              {Object.values(testResults).filter((r: any) => r.success).length}{" "}
              / {Object.keys(testResults).length} successful
            </div>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
            {Object.entries(testResults)
              .sort(
                ([, a]: any, [, b]: any) =>
                  (b.success ? 1 : 0) - (a.success ? 1 : 0)
              )
              .map(([endpoint, result]: [string, any]) => (
                <div
                  key={endpoint}
                  className={`p-4 rounded-xl border ${
                    result.success
                      ? "bg-green-900/10 border-green-500/30"
                      : "bg-red-900/10 border-red-500/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-sm font-mono text-zinc-300 break-all">
                      {endpoint}
                    </code>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ml-2 flex-shrink-0 ${
                        result.success
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {result.success
                        ? `✓ ${result.status || 200}`
                        : `✗ ${result.status || "Error"}`}
                    </span>
                  </div>
                  {result.success && (
                    <div className="mt-2">
                      <p className="text-xs text-green-400 mb-1">
                        Response Preview:
                      </p>
                      <pre className="text-xs text-zinc-400 overflow-x-auto bg-zinc-950/50 p-2 rounded border border-zinc-800 max-h-32 overflow-y-auto">
                        {JSON.stringify(result.data, null, 2).slice(0, 500)}
                        {JSON.stringify(result.data, null, 2).length > 500 &&
                          "..."}
                      </pre>
                    </div>
                  )}
                  {result.error && (
                    <p className="text-xs text-red-400 mt-2">{result.error}</p>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Top Traders Section */}
      <div className="mt-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy size={20} className="text-indigo-400" />
              <h2 className="text-xl font-semibold text-zinc-100">
                Top Traders
              </h2>
            </div>
            <button
              onClick={fetchTopTraders}
              disabled={topTradersLoading}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-xl transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {topTradersLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  <span>Refresh</span>
                </>
              )}
            </button>
          </div>
        </div>
        {topTradersLoading && topTraders.length === 0 ? (
          <div className="p-8 text-center">
            <RefreshCw
              size={32}
              className="animate-spin text-indigo-400 mx-auto mb-4"
            />
            <p className="text-zinc-400">Loading top traders...</p>
          </div>
        ) : topTraders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Transactions
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Total Volume
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    PNL
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    ROI
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {topTraders.map((user, index) => (
                  <tr
                    key={user.Address}
                    className="hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-indigo-400 font-bold">
                        #{index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm text-zinc-300 font-mono">
                        {user.Address.slice(0, 10)}...
                        {user.Address.slice(-8)}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-zinc-300">
                      {user.NumberOfTxns.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-zinc-300 font-medium">
                        $
                        {parseFloat(user.TotalVolume).toLocaleString(
                          undefined,
                          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span
                        className={`font-bold ${
                          parseFloat(user.PNL) >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {parseFloat(user.PNL) >= 0 ? "+" : ""}$
                        {parseFloat(user.PNL).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-indigo-400 font-bold">
                        {parseFloat(user.ROI).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        %
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-zinc-400">
            No trader data available. Click refresh to fetch.
          </div>
        )}
      </div>

      {/* Raw JSON Display */}
      {data && (
        <div className="mt-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-zinc-100 mb-4">
            Raw Response JSON
          </h2>
          <pre className="text-xs text-zinc-400 overflow-x-auto bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
