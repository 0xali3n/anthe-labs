"use client";

import { useState, useCallback } from "react";
import {
  getWalletAccountBalance,
  getTradingBalance,
  withdrawFromKana,
  transferUSDTToAddress,
} from "@/lib/walletsApi";
import { supabase } from "@/lib/supabaseClient";
import {
  Loader,
  Copy,
  Check,
  XCircle,
  RefreshCw,
  ArrowDown,
} from "lucide-react";

interface LogEntry {
  id: number;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

export default function WithdrawDebugPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<string>("0.00");
  const [tradingBalance, setTradingBalance] = useState<string>("0.00");
  const [twoWayAmount, setTwoWayAmount] = useState<string>("1.0");
  const [twoWayRecipient, setTwoWayRecipient] = useState<string>("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const addLog = useCallback(
    (message: string, type: LogEntry["type"] = "info") => {
      setLogs((prevLogs) => [
        ...prevLogs,
        { id: prevLogs.length + 1, message, type },
      ]);
      console.log(`[${type.toUpperCase()}] ${message}`);
    },
    []
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
    console.clear();
  }, []);

  // Fetch wallet address
  const fetchWalletAddress = useCallback(async () => {
    setLoading(true);
    addLog("🔍 Fetching wallet address...", "info");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        addLog("❌ No session found. Please sign in.", "error");
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001"}/api/wallets/me`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success && data.address) {
        setWalletAddress(data.address);
        addLog(`✅ Wallet Address: ${data.address}`, "success");
      } else {
        addLog(
          `❌ Failed to get wallet address: ${data.error || "Unknown error"}`,
          "error"
        );
        setWalletAddress(null);
      }
    } catch (error: any) {
      addLog(`❌ Error fetching wallet address: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  // Fetch all balances
  const fetchAllBalances = useCallback(async () => {
    if (!walletAddress) {
      addLog(
        "❌ Wallet address not available. Fetch wallet address first.",
        "warning"
      );
      return;
    }
    setLoading(true);

    addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "info");
    addLog("📊 FETCHING ALL BALANCES", "info");
    addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "info");

    // Fetch wallet account balance
    addLog("📥 Step 1: Fetching Wallet Account Balance (Kana API)...", "info");
    try {
      const walletResult = await getWalletAccountBalance();
      if (walletResult.success && walletResult.balance !== undefined) {
        const balance = parseFloat(walletResult.balance).toFixed(2);
        setWalletBalance(balance);
        addLog(`✅ Wallet Account Balance: ${balance} USDT`, "success");
      } else {
        addLog(
          `❌ Failed to fetch wallet account balance: ${walletResult.error}`,
          "error"
        );
        setWalletBalance("0.00");
      }
    } catch (error: any) {
      addLog(
        `❌ Error fetching wallet account balance: ${error.message}`,
        "error"
      );
      setWalletBalance("0.00");
    }

    // Fetch trading account balance
    addLog("📥 Step 2: Fetching Trading Account Balance (Kana API)...", "info");
    try {
      const tradingResult = await getTradingBalance();
      if (tradingResult.success && tradingResult.balance !== undefined) {
        const balance = parseFloat(tradingResult.balance).toFixed(2);
        setTradingBalance(balance);
        addLog(`✅ Trading Account Balance: ${balance} USDT`, "success");
      } else {
        addLog(
          `❌ Failed to fetch trading account balance: ${tradingResult.error}`,
          "error"
        );
        setTradingBalance("0.00");
      }
    } catch (error: any) {
      addLog(
        `❌ Error fetching trading account balance: ${error.message}`,
        "error"
      );
      setTradingBalance("0.00");
    }

    addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "info");
    addLog("✅ Balance Fetch Complete", "success");
    addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "info");
    setLoading(false);
  }, [walletAddress, addLog]);

  // 2-Way Transfer: First withdraw from trading account, then transfer to destination
  const testTwoWayTransfer = useCallback(async () => {
    if (!walletAddress) {
      addLog(
        "❌ Wallet address not available. Fetch wallet address first.",
        "warning"
      );
      return;
    }

    if (!twoWayRecipient || !twoWayRecipient.startsWith("0x")) {
      addLog(
        "❌ Please enter a valid recipient address (must start with 0x)",
        "error"
      );
      return;
    }

    const amount = parseFloat(twoWayAmount);
    if (isNaN(amount) || amount <= 0) {
      addLog("❌ Please enter a valid transfer amount greater than 0", "error");
      return;
    }

    // Market ID is always 14 (APT-USD)
    const marketIdNum = 14;

    setLoading(true);
    addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "info");
    addLog("💰 2-WAY TRANSFER PROCESS STARTING", "info");
    addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "info");
    addLog(`📍 Initialization`, "info");
    addLog(`   Wallet Address: ${walletAddress}`, "info");
    addLog(`   Final Destination: ${twoWayRecipient}`, "info");
    addLog(`   Transfer Amount: ${amount} USDT`, "info");
    addLog(`   Market ID: ${marketIdNum}`, "info");
    addLog("", "info");

    // Step 1: Check trading balance
    addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "info");
    addLog("📥 STEP 1: WITHDRAW FROM TRADING ACCOUNT", "info");
    addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "info");
    addLog(`📊 Balance Check`, "info");
    addLog(`   Current Trading Balance: ${tradingBalance} USDT`, "info");
    addLog(`   Requested Amount: ${amount} USDT`, "info");

    const tradingBalanceNum = parseFloat(tradingBalance);
    if (amount > tradingBalanceNum) {
      addLog(`   ❌ ERROR: Insufficient trading balance!`, "error");
      addLog(
        `   Trying to withdraw ${amount} USDT but only ${tradingBalanceNum} USDT available`,
        "error"
      );
      setLoading(false);
      return;
    }
    addLog(`   ✅ Balance verification passed`, "success");
    addLog("", "info");

    // Step 1: Withdraw from trading account
    addLog(`🔗 Withdrawing ${amount} USDT from trading account...`, "info");
    try {
      const withdrawResult = await withdrawFromKana(
        amount,
        marketIdNum.toString()
      );

      if (!withdrawResult.success) {
        addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "error");
        addLog("❌ STEP 1 FAILED: WITHDRAWAL FROM TRADING ACCOUNT", "error");
        addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "error");
        addLog(`   Error: ${withdrawResult.error || "Unknown error"}`, "error");
        setLoading(false);
        return;
      }

      if (withdrawResult.txHash) {
        addLog(
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
          "success"
        );
        addLog("✅ STEP 1 SUCCESS: WITHDRAWAL COMPLETED", "success");
        addLog(
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
          "success"
        );
        addLog(`   Amount Withdrawn: ${amount} USDT`, "info");
        addLog(`   Transaction Hash: ${withdrawResult.txHash}`, "success");
        addLog(
          `   View on Aptoscan: https://aptoscan.com/txn/${withdrawResult.txHash}`,
          "info"
        );
        addLog("", "info");
        addLog(`⏳ Waiting 3 seconds for blockchain confirmation...`, "info");
        addLog("", "info");

        // Wait for blockchain confirmation
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Refresh balances
        await fetchAllBalances();
      } else {
        addLog(
          `⚠️ Withdrawal initiated but no transaction hash received`,
          "warning"
        );
        setLoading(false);
        return;
      }
    } catch (error: any) {
      addLog(`❌ Error during withdrawal: ${error.message}`, "error");
      setLoading(false);
      return;
    }

    // Step 2: Transfer to destination address
    addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "info");
    addLog("📤 STEP 2: TRANSFER TO DESTINATION ADDRESS", "info");
    addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "info");
    addLog(`📊 Balance Check`, "info");
    addLog(`   Current Wallet Account Balance: ${walletBalance} USDT`, "info");
    addLog(`   Requested Transfer: ${amount} USDT`, "info");

    // Refresh wallet balance before transfer
    try {
      const walletResult = await getWalletAccountBalance();
      if (walletResult.success && walletResult.balance !== undefined) {
        const updatedBalance = parseFloat(walletResult.balance);
        setWalletBalance(updatedBalance.toFixed(2));
        addLog(
          `   Updated Wallet Balance: ${updatedBalance.toFixed(2)} USDT`,
          "info"
        );

        if (amount > updatedBalance) {
          addLog(
            `   ⚠️ WARNING: Wallet balance (${updatedBalance.toFixed(2)} USDT) is less than requested amount (${amount} USDT)`,
            "warning"
          );
          addLog(`   Attempting transfer with available balance...`, "info");
        }
      }
    } catch (error: any) {
      addLog(
        `⚠️ Could not refresh wallet balance: ${error.message}`,
        "warning"
      );
    }

    addLog("", "info");
    addLog(`🔗 Transferring ${amount} USDT to destination address...`, "info");
    addLog(`   From: ${walletAddress}`, "info");
    addLog(`   To: ${twoWayRecipient}`, "info");
    addLog("", "info");

    try {
      const transferResult = await transferUSDTToAddress(
        twoWayRecipient,
        amount
      );

      addLog("", "info");
      if (transferResult.success) {
        if (transferResult.txHash) {
          addLog(
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
            "success"
          );
          addLog("✅ STEP 2 SUCCESS: TRANSFER COMPLETED", "success");
          addLog(
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
            "success"
          );
          addLog(`   Amount Transferred: ${amount} USDT`, "info");
          addLog(`   Transaction Hash: ${transferResult.txHash}`, "success");
          addLog(
            `   View on Aptoscan: https://aptoscan.com/txn/${transferResult.txHash}`,
            "info"
          );
          addLog("", "info");
          addLog(
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
            "success"
          );
          addLog("✅ 2-WAY TRANSFER COMPLETED SUCCESSFULLY", "success");
          addLog(
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
            "success"
          );
          addLog(
            `   From: Trading Account → Wallet → ${twoWayRecipient}`,
            "info"
          );
          addLog(`   Total Amount: ${amount} USDT`, "info");
          addLog(
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
            "success"
          );

          // Refresh balances after successful transfer
          setTimeout(() => {
            fetchAllBalances();
          }, 2000);
        } else {
          addLog(
            `⚠️ Transfer initiated but no transaction hash received`,
            "warning"
          );
        }
      } else {
        addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "error");
        addLog("❌ STEP 2 FAILED: TRANSFER TO DESTINATION", "error");
        addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "error");
        addLog(`   Error: ${transferResult.error || "Unknown error"}`, "error");
        addLog(
          `   Note: Funds were successfully withdrawn to wallet in Step 1`,
          "info"
        );
        addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "error");
      }
    } catch (error: any) {
      addLog(`❌ Error during transfer: ${error.message}`, "error");
      addLog(
        `   Note: Funds were successfully withdrawn to wallet in Step 1`,
        "info"
      );
    } finally {
      setLoading(false);
    }
  }, [
    walletAddress,
    twoWayRecipient,
    twoWayAmount,
    tradingBalance,
    walletBalance,
    addLog,
    fetchAllBalances,
  ]);

  const copyToClipboard = useCallback((text: string | null | undefined) => {
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-blue-400">
          Withdrawal Debug Panel
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Controls */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">
              Controls
            </h2>

            <div className="space-y-4 mb-6">
              <button
                onClick={fetchWalletAddress}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? (
                  <Loader className="animate-spin mr-2" size={20} />
                ) : (
                  "Fetch Wallet Address"
                )}
              </button>

              <button
                onClick={fetchAllBalances}
                disabled={loading || !walletAddress}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? (
                  <Loader className="animate-spin mr-2" size={20} />
                ) : (
                  <RefreshCw className="mr-2" size={20} />
                )}
                Fetch All Balances
              </button>
            </div>

            {/* 2-Way Transfer Form */}
            <div className="bg-gray-700 p-4 rounded-lg mb-4 border-2 border-indigo-500">
              <h3 className="text-lg font-semibold mb-4 text-indigo-400">
                ⚡ 2-Way Transfer (Auto)
              </h3>
              <p className="text-xs text-gray-400 mb-4">
                Step 1: Withdraw from Trading Account → Step 2: Transfer to
                Destination
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Destination Address
                  </label>
                  <input
                    type="text"
                    value={twoWayRecipient}
                    onChange={(e) => setTwoWayRecipient(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Final destination Aptos wallet address
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Amount (USDT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={twoWayAmount}
                    onChange={(e) => setTwoWayAmount(e.target.value)}
                    placeholder="Enter amount in USDT"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Trading Balance: {tradingBalance} USDT (Market ID: 14 -
                    APT-USD)
                  </p>
                </div>

                <button
                  onClick={testTwoWayTransfer}
                  disabled={
                    loading ||
                    !walletAddress ||
                    !twoWayRecipient ||
                    parseFloat(twoWayAmount) <= 0
                  }
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded disabled:opacity-50 flex items-center justify-center"
                >
                  {loading ? (
                    <Loader className="animate-spin mr-2" size={20} />
                  ) : (
                    <ArrowDown className="mr-2" size={20} />
                  )}
                  Execute 2-Way Transfer ({twoWayAmount} USDT)
                </button>
              </div>
            </div>

            {/* Balance Display */}
            <div className="bg-gray-700 p-4 rounded-lg mb-4">
              <h3 className="text-lg font-semibold mb-3 text-green-400">
                Current Balances
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">Wallet Account:</span>
                  <span className="font-mono text-green-300">
                    {walletBalance} USDT
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Trading Account:</span>
                  <span className="font-mono text-green-300">
                    {tradingBalance} USDT
                  </span>
                </div>
              </div>
            </div>

            {/* Wallet Address Display */}
            {walletAddress && (
              <div className="bg-gray-700 p-4 rounded-lg mb-4">
                <h3 className="text-lg font-semibold mb-2">Wallet Address</h3>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-blue-300 break-all text-sm flex-1">
                    {walletAddress}
                  </p>
                  <button
                    onClick={() => copyToClipboard(walletAddress)}
                    className="p-2 rounded hover:bg-gray-600"
                    title="Copy address"
                  >
                    {copied ? (
                      <Check size={16} className="text-green-400" />
                    ) : (
                      <Copy size={16} className="text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={clearLogs}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center"
            >
              <RefreshCw className="mr-2" size={20} /> Clear Logs
            </button>
          </div>

          {/* Right Panel - Logs */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">Logs</h2>
            <div className="font-mono text-sm bg-gray-900 p-4 rounded-md max-h-[calc(100vh-200px)] overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500">
                  No logs yet. Perform an action to see output.
                </p>
              ) : (
                logs.map((log) => (
                  <p
                    key={log.id}
                    className={`${
                      log.type === "error"
                        ? "text-red-400"
                        : log.type === "success"
                          ? "text-green-400"
                          : log.type === "warning"
                            ? "text-yellow-400"
                            : "text-gray-300"
                    } mb-1`}
                  >
                    {log.message}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
