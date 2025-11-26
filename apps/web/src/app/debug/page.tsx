"use client";

import { useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { getPositions } from "@/lib/positionsApi";
import { getOrderHistory } from "@/lib/orderHistoryApi";
import { getUSDTBalance } from "@/lib/walletsApi";
import { supabase } from "@/lib/supabaseClient";

interface ApiTestResult {
  name: string;
  status: "pending" | "success" | "error";
  duration?: number;
  data?: any;
  error?: string;
  details?: string;
}

export default function DebugPage() {
  const { isSignedIn } = useAuth();
  const [walletAddress, setWalletAddress] = useState("");
  const [results, setResults] = useState<ApiTestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  const checkSession = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSessionInfo({
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
        tokenLength: session?.access_token?.length,
        tokenPreview: session?.access_token
          ? `${session.access_token.substring(0, 20)}...`
          : "No token",
      });
      return session;
    } catch (error: any) {
      setSessionInfo({ error: error.message });
      return null;
    }
  };

  const testApi = async (
    name: string,
    testFn: () => Promise<any>
  ): Promise<ApiTestResult> => {
    const startTime = Date.now();
    console.log(`[DEBUG] Starting test: ${name}`);

    try {
      const data = await testFn();
      const duration = Date.now() - startTime;
      console.log(`[DEBUG] ✅ ${name} succeeded in ${duration}ms`, data);

      return {
        name,
        status: "success",
        duration,
        data: typeof data === "object" ? JSON.stringify(data, null, 2) : data,
        details: `Success in ${duration}ms`,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[DEBUG] ❌ ${name} failed after ${duration}ms:`, error);

      return {
        name,
        status: "error",
        duration,
        error: error.message || "Unknown error",
        details: `Failed after ${duration}ms: ${error.message}`,
      };
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    setResults([]);

    console.log("=== DEBUG: Starting API Tests ===");

    // Check session first
    const session = await checkSession();
    if (!session) {
      setResults([
        {
          name: "Session Check",
          status: "error",
          error: "No active session found",
        },
      ]);
      setTesting(false);
      return;
    }

    const testResults: ApiTestResult[] = [];

    // Test 1: Session Check
    testResults.push({
      name: "Session Check",
      status: "success",
      data: JSON.stringify(sessionInfo, null, 2),
      details: "Session verified",
    });

    // Test 2: Get Balance
    const balanceResult = await testApi("Get Balance", async () => {
      return await getUSDTBalance();
    });
    testResults.push(balanceResult);
    setResults([...testResults]);

    // Test 3: Get Positions
    const positionsResult = await testApi("Get Positions", async () => {
      return await getPositions();
    });
    testResults.push(positionsResult);
    setResults([...testResults]);

    // Test 4: Get Order History (Trade History)
    const orderHistoryResult = await testApi(
      "Get Order History (Trade History)",
      async () => {
        return await getOrderHistory();
      }
    );
    testResults.push(orderHistoryResult);
    setResults([...testResults]);

    // Test 5: Test Backend Endpoints Directly
    const backendTests = [
      {
        name: "Backend: /wallets/positions",
        url: "/wallets/positions",
      },
      {
        name: "Backend: /wallets/getTradeHistory",
        url: "/wallets/getTradeHistory",
      },
    ];

    for (const test of backendTests) {
      const result = await testApi(test.name, async () => {
        const API_URL =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001/api";
        const response = await fetch(`${API_URL}${test.url}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        return await response.json();
      });
      testResults.push(result);
      setResults([...testResults]);
    }

    setResults(testResults);
    setTesting(false);
    console.log("=== DEBUG: All Tests Complete ===");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">API Debug Page</h1>

        <div className="mb-6 p-4 bg-[#1a1a1a] rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Session Info</h2>
          <button
            onClick={checkSession}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 mb-4"
          >
            Check Session
          </button>
          {sessionInfo && (
            <pre className="bg-[#0a0a0a] p-4 rounded text-sm overflow-auto">
              {JSON.stringify(sessionInfo, null, 2)}
            </pre>
          )}
        </div>

        <div className="mb-6 p-4 bg-[#1a1a1a] rounded-lg">
          <h2 className="text-xl font-semibold mb-4">
            Wallet Address (Optional)
          </h2>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-700 rounded mb-4"
          />
        </div>

        <div className="mb-6">
          <button
            onClick={runAllTests}
            disabled={testing || !isSignedIn}
            className="px-6 py-3 bg-green-600 rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {testing ? "Testing..." : "Run All API Tests"}
          </button>
          {!isSignedIn && (
            <p className="mt-2 text-yellow-500">Please sign in to test APIs</p>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Test Results</h2>
          {results.length === 0 && !testing && (
            <p className="text-gray-400">
              No tests run yet. Click "Run All API Tests" to start.
            </p>
          )}
          {results.map((result, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                result.status === "success"
                  ? "bg-green-900/20 border-green-700"
                  : result.status === "error"
                    ? "bg-red-900/20 border-red-700"
                    : "bg-gray-900/20 border-gray-700"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg">{result.name}</h3>
                <div className="flex items-center gap-4">
                  {result.duration && (
                    <span className="text-sm text-gray-400">
                      {result.duration}ms
                    </span>
                  )}
                  <span
                    className={`px-3 py-1 rounded text-sm ${
                      result.status === "success"
                        ? "bg-green-700"
                        : result.status === "error"
                          ? "bg-red-700"
                          : "bg-gray-700"
                    }`}
                  >
                    {result.status.toUpperCase()}
                  </span>
                </div>
              </div>
              {result.details && (
                <p className="text-sm text-gray-300 mb-2">{result.details}</p>
              )}
              {result.error && (
                <div className="mt-2 p-3 bg-red-900/30 rounded">
                  <p className="text-red-300 font-mono text-sm">
                    {result.error}
                  </p>
                </div>
              )}
              {result.data && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-blue-400 hover:text-blue-300">
                    View Response Data
                  </summary>
                  <pre className="mt-2 p-3 bg-[#0a0a0a] rounded text-xs overflow-auto max-h-96">
                    {typeof result.data === "string"
                      ? result.data
                      : JSON.stringify(result.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>

        {testing && (
          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700 rounded">
            <p className="text-blue-300">Running tests... Please wait.</p>
          </div>
        )}
      </div>
    </div>
  );
}
