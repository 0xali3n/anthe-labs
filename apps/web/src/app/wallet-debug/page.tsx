"use client";

import { useState } from "react";
import { getWalletAccountBalance, getTradingBalance, checkWalletAndDeposit, getDebugInfo, testDeposit } from "@/lib/walletsApi";
import { supabase } from "@/lib/supabaseClient";

export default function WalletDebugPage() {
  const [walletAddress, setWalletAddress] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customAmount, setCustomAmount] = useState("1.0");

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setLogs((prev) => [...prev, logMessage]);
  };

  const clearLogs = () => {
    setLogs([]);
    console.clear();
  };

  // Get current user's wallet address
  const fetchWalletAddress = async () => {
    try {
      setIsLoading(true);
      addLog("🔍 Fetching wallet address...");
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        addLog("❌ No session found. Please sign in.");
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/api/wallets/me`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();
      if (data.success && data.address) {
        setWalletAddress(data.address);
        addLog(`✅ Wallet Address: ${data.address}`);
      } else {
        addLog(`❌ Failed to get wallet address: ${data.error || "Unknown error"}`);
      }
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Get wallet account balance (from Kana API)
  const testGetWalletBalance = async () => {
    if (!walletAddress) {
      addLog("❌ Please fetch wallet address first");
      return;
    }

    try {
      setIsLoading(true);
      addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      addLog("📊 Testing: Get Wallet Account Balance (Kana API)");
      addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      addLog(`Wallet Address: ${walletAddress}`);
      
      const result = await getWalletAccountBalance();
      
      if (result.success && result.balance !== undefined) {
        const balance = parseFloat(result.balance);
        const balanceInSmallestUnit = Math.floor(balance * 1000000);
        addLog(`✅ Success!`);
        addLog(`   Balance: ${result.balance} USDT`);
        addLog(`   Balance (number): ${balance}`);
        addLog(`   Balance in smallest units: ${balanceInSmallestUnit}`);
        addLog(`   USDT Decimals: 6`);
        addLog(`   Calculation: ${balance} * 1,000,000 = ${balanceInSmallestUnit}`);
      } else {
        addLog(`❌ Failed: ${result.error || "Unknown error"}`);
      }
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Get trading balance
  const testGetTradingBalance = async () => {
    if (!walletAddress) {
      addLog("❌ Please fetch wallet address first");
      return;
    }

    try {
      setIsLoading(true);
      addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      addLog("📊 Testing: Get Trading Balance (Kana API)");
      addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      addLog(`Wallet Address: ${walletAddress}`);
      
      const result = await getTradingBalance();
      
      if (result.success && result.balance !== undefined) {
        addLog(`✅ Success!`);
        addLog(`   Trading Balance: ${result.balance} USDT`);
      } else {
        addLog(`❌ Failed: ${result.error || "Unknown error"}`);
      }
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test deposit with custom amount (direct deposit test)
  const testDepositAmount = async (amount: number) => {
    if (!walletAddress) {
      addLog("❌ Please fetch wallet address first");
      return;
    }

    try {
      setIsLoading(true);
      addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      addLog(`💰 Testing: Direct Deposit ${amount} USDT to Trading Account`);
      addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      addLog(`Wallet Address: ${walletAddress}`);
      addLog(`Amount: ${amount} USDT`);
      addLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      addLog(`📋 CONVERSION DETAILS:`);
      addLog(`   Amount to deposit: ${amount} USDT`);
      addLog(`   Kana API expects: Amount in USDT (not smallest units)`);
      addLog(`   Sending to API: ${amount} USDT (directly, no conversion)`);
      addLog(`   Note: Kana API handles conversion to smallest units internally`);
      addLog(`   For reference: ${amount} USDT = ${Math.round(amount * 1e6)} smallest units`);
      addLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      
      const result = await testDeposit(amount);
      
      if (result.success && result.txHash) {
        addLog(`✅ Deposit Successful!`);
        addLog(`   Transaction Hash: ${result.txHash}`);
        addLog(`   Amount Deposited: ${amount} USDT`);
        addLog(`   View on Aptoscan: https://aptoscan.com/txn/${result.txHash}`);
      } else {
        addLog(`❌ Deposit Failed: ${result.error || "Unknown error"}`);
      }
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test auto-deposit (check balance and deposit)
  const testAutoDeposit = async () => {
    if (!walletAddress) {
      addLog("❌ Please fetch wallet address first");
      return;
    }

    try {
      setIsLoading(true);
      addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      addLog(`💰 Testing: Auto-Deposit (Check Balance & Deposit)`);
      addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      addLog(`Wallet Address: ${walletAddress}`);
      
      const result = await checkWalletAndDeposit();
      
      if (result.success) {
        if (result.deposited && result.txHash) {
          addLog(`✅ Auto-Deposit Successful!`);
          addLog(`   Transaction Hash: ${result.txHash}`);
          addLog(`   Amount Deposited: ${result.walletBalance} USDT`);
          addLog(`   Updated Trading Balance: ${result.tradingBalance} USDT`);
          addLog(`   View on Aptoscan: https://aptoscan.com/txn/${result.txHash}`);
        } else {
          addLog(`ℹ️ Auto-deposit not completed: ${result.error || "Unknown reason"}`);
          addLog(`   Wallet Balance: ${result.walletBalance} USDT`);
          addLog(`   Trading Balance: ${result.tradingBalance} USDT`);
        }
      } else {
        addLog(`❌ Auto-Deposit Failed: ${result.error || "Unknown error"}`);
      }
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Export private key (for debugging - shows encrypted key from database)
  const exportPrivateKey = async () => {
    try {
      setIsLoading(true);
      addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      addLog("🔐 Testing: Export Private Key (Encrypted)");
      addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      addLog("⚠️ WARNING: This will show the encrypted private key from database");
      addLog("⚠️ The key is encrypted and cannot be used directly");
      
      const result = await getDebugInfo();
      
      if (result.success) {
        addLog(`✅ Debug Info Retrieved`);
        addLog(`   Wallet Address: ${result.walletAddress}`);
        addLog(`   Encrypted Private Key: ${result.encryptedPrivateKey?.substring(0, 50)}...`);
        addLog(`   Note: ${result.note}`);
        if (result.encryptedPrivateKey) {
          setPrivateKey(result.encryptedPrivateKey);
        }
      } else {
        addLog(`❌ Failed: ${result.error || "Unknown error"}`);
      }
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test all operations in sequence
  const testAll = async () => {
    clearLogs();
    addLog("🚀 Starting comprehensive wallet test...");
    addLog("");
    
    await fetchWalletAddress();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testGetWalletBalance();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testGetTradingBalance();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    addLog("");
    addLog("✅ All tests completed!");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🔧 Wallet Debug Page</h1>
        
        {/* Controls */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Controls</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <button
              onClick={fetchWalletAddress}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
            >
              Get Wallet Address
            </button>
            
            <button
              onClick={testGetWalletBalance}
              disabled={isLoading || !walletAddress}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
            >
              Get Wallet Balance
            </button>
            
            <button
              onClick={testGetTradingBalance}
              disabled={isLoading || !walletAddress}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50"
            >
              Get Trading Balance
            </button>
            
            <button
              onClick={testAll}
              disabled={isLoading}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg disabled:opacity-50"
            >
              Test All
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <button
              onClick={() => testDepositAmount(0.1)}
              disabled={isLoading || !walletAddress}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg disabled:opacity-50"
            >
              Test Deposit 0.1 USDT
            </button>
            
            <button
              onClick={() => testDepositAmount(1.0)}
              disabled={isLoading || !walletAddress}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
            >
              Test Deposit 1.0 USDT
            </button>
            
            <button
              onClick={testAutoDeposit}
              disabled={isLoading || !walletAddress}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
            >
              Test Auto-Deposit
            </button>
            
            <button
              onClick={exportPrivateKey}
              disabled={isLoading}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded-lg disabled:opacity-50"
            >
              Export Private Key
            </button>
          </div>

          {/* Custom Amount Input */}
          <div className="mb-4 p-4 bg-slate-700 rounded-lg">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Custom Deposit Amount (USDT)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Enter amount in USDT"
                className="flex-1 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => {
                  const amount = parseFloat(customAmount);
                  if (isNaN(amount) || amount <= 0) {
                    addLog("❌ Please enter a valid amount greater than 0");
                    return;
                  }
                  testDepositAmount(amount);
                }}
                disabled={isLoading || !walletAddress}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 font-medium"
              >
                Deposit Custom Amount
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Enter amount in USDT (e.g., 0.5, 1.25, 10.0)
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <button
              onClick={clearLogs}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg"
            >
              Clear Logs
            </button>
          </div>

          {/* Wallet Address Display */}
          {walletAddress && (
            <div className="mt-4 p-4 bg-slate-700 rounded-lg">
              <p className="text-sm text-slate-300 mb-2">Wallet Address:</p>
              <p className="font-mono text-sm break-all">{walletAddress}</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(walletAddress);
                  addLog("✅ Wallet address copied to clipboard");
                }}
                className="mt-2 px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-sm"
              >
                Copy Address
              </button>
            </div>
          )}

          {/* Encrypted Private Key Display */}
          {privateKey && (
            <div className="mt-4 p-4 bg-slate-700 rounded-lg">
              <p className="text-sm text-slate-300 mb-2">Encrypted Private Key (for debugging):</p>
              <p className="font-mono text-xs break-all text-yellow-400">{privateKey}</p>
              <p className="text-xs text-red-400 mt-2">⚠️ This is encrypted and cannot be used directly</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(privateKey);
                  addLog("✅ Encrypted private key copied to clipboard");
                }}
                className="mt-2 px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-sm"
              >
                Copy Encrypted Key
              </button>
            </div>
          )}
        </div>

        {/* Logs */}
        <div className="bg-slate-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Logs</h2>
            <span className="text-sm text-slate-400">{logs.length} entries</span>
          </div>
          
          <div className="bg-black rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-slate-500">No logs yet. Click a button to start testing.</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1 text-green-400">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-6 bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">ℹ️ Information</h2>
          <div className="space-y-2 text-sm">
            <p><strong>USDT Decimals:</strong> 6</p>
            <p><strong>Conversion:</strong> 1 USDT = 1,000,000 smallest units</p>
            <p><strong>Example:</strong> 1.5 USDT = 1,500,000 smallest units</p>
            <p><strong>Kana API Endpoint:</strong> https://perps-tradeapi.kana.trade</p>
            <p><strong>Mainnet:</strong> Yes</p>
          </div>
        </div>
      </div>
    </div>
  );
}

