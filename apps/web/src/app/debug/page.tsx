"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Palanquin_Dark } from "next/font/google";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabaseClient";
import {
  collapsePosition,
  getCollapsePositionPayload,
  getPositionsPayload,
} from "@/lib/walletsApi";
import {
  getPositions,
  mapPositionToOpenPosition,
  type PositionResponse,
} from "@/lib/positionsApi";
import { getCurrentUser } from "@/lib/usersApi";
import {
  Loader,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Activity,
  Wallet,
  Copy,
  ExternalLink,
} from "lucide-react";

const palanquinDark = Palanquin_Dark({
  weight: ["400", "700"],
  subsets: ["latin"],
});

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
  marketId?: string;
}

export default function DebugPage() {
  const router = useRouter();
  const { isSignedIn, loading: authLoading } = useAuth();
  const [marketId, setMarketId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingPayload, setLoadingPayload] = useState(false);
  const [loadingPositionsPayload, setLoadingPositionsPayload] = useState(false);
  const [payloadResult, setPayloadResult] = useState<{
    success: boolean;
    payload?: any;
    rawResponse?: any;
    error?: string;
  } | null>(null);
  const [positionsPayloadResult, setPositionsPayloadResult] = useState<{
    success: boolean;
    data?: any;
    rawResponse?: any;
    error?: string;
  } | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    txHash?: string;
    version?: string;
    error?: string;
  } | null>(null);
  const [positions, setPositions] = useState<OpenPosition[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(null);

  // Get API base URL
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001/api";
  const kanaApiUrl = "https://perps-tradeapi.kana.trade";

  // Copy to clipboard function
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Fetch positions
  const fetchPositions = async () => {
    if (!isSignedIn) return;

    setLoadingPositions(true);
    try {
      const positionsResult = await getPositions();
      if (positionsResult.success && positionsResult.data) {
        const mappedPositions = positionsResult.data.map(
          (pos: PositionResponse) => ({
            ...mapPositionToOpenPosition(pos),
            marketId: pos.market_id,
          })
        );
        setPositions(mappedPositions);
      } else {
        setPositions([]);
      }
    } catch (error) {
      console.error("Error fetching positions:", error);
      setPositions([]);
    } finally {
      setLoadingPositions(false);
    }
  };

  // Load positions and user data on mount
  useEffect(() => {
    if (isSignedIn) {
      fetchPositions();
      // Get user wallet address and JWT token
      const loadUserData = async () => {
        try {
          const user = await getCurrentUser();
          if (user?.wallet_address) {
            setWalletAddress(user.wallet_address);
          }
          // Get JWT token from session
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.access_token) {
            setJwtToken(session.access_token);
          }
        } catch (error) {
          console.error("Error loading user data:", error);
        }
      };
      loadUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  const handleGetPayload = async () => {
    if (!marketId) {
      setPayloadResult({
        success: false,
        error: "Market ID is required",
      });
      return;
    }
    setPayloadResult(null);
    setLoadingPayload(true);

    try {
      const result = await getCollapsePositionPayload(marketId);
      setPayloadResult(result);
    } catch (error: any) {
      setPayloadResult({
        success: false,
        error: error.message || "Failed to get payload",
      });
    } finally {
      setLoadingPayload(false);
    }
  };

  const handleGetPositionsPayload = async () => {
    setPositionsPayloadResult(null);
    setLoadingPositionsPayload(true);

    try {
      const result = await getPositionsPayload(marketId || undefined);
      setPositionsPayloadResult(result);
    } catch (error: any) {
      setPositionsPayloadResult({
        success: false,
        error: error.message || "Failed to get positions payload",
      });
    } finally {
      setLoadingPositionsPayload(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center relative">
        <div
          className="fixed inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
        <div className="text-center relative z-10">
          <Loader className="animate-spin h-12 w-12 text-blue-400 mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 relative">
        <div
          className="fixed inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 max-w-md text-center relative z-10">
          <h2
            className={`${palanquinDark.className} text-xl font-semibold text-white mb-2 tracking-tight`}
          >
            Sign In Required
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            Please sign in to access the debug page
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <div className="max-w-4xl mx-auto pt-24 pb-10 sm:pt-28 sm:pb-12 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className={`${palanquinDark.className} text-2xl sm:text-4xl font-semibold text-white mb-2 tracking-tight`}
          >
            Debug: Collapse Position
          </h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Close your open positions using market orders (100% close).
          </p>
        </div>

        {/* Old form removed - keeping for reference */}
        <div className="hidden">
          <form className="space-y-4">
            <div>
              <label
                htmlFor="marketId"
                className="block text-sm font-semibold text-slate-300 mb-2"
              >
                Market ID <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                  <Activity size={16} className="text-slate-500" />
                </div>
                <input
                  id="marketId"
                  type="text"
                  value={marketId}
                  onChange={(e) => setMarketId(e.target.value)}
                  placeholder="e.g., 16"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-mono"
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                Market ID is required for collapse position
              </p>
            </div>

            {/* Show Open Positions Info */}
            {positions.length > 0 && (
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                <p className="text-xs text-blue-400 font-semibold mb-2">
                  Your Open Positions:
                </p>
                <div className="space-y-1">
                  {positions.map((pos) => (
                    <div
                      key={pos.id}
                      className="text-xs text-slate-300 flex items-center justify-between"
                    >
                      <span>
                        {pos.symbol} {pos.side} - Market ID:{" "}
                        <span className="font-mono font-bold text-blue-400">
                          {pos.marketId || "N/A"}
                        </span>
                      </span>
                      <button
                        onClick={() => {
                          if (pos.marketId) {
                            setMarketId(pos.marketId);
                          }
                        }}
                        className="px-2 py-0.5 bg-blue-600/50 hover:bg-blue-600/70 rounded text-[10px] text-blue-200 hover:text-white transition-colors"
                      >
                        Use This
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-yellow-400 mt-2">
                  ⚠️ Make sure you're using the correct Market ID from your open
                  positions above!
                </p>
              </div>
            )}

            {/* Get Payload Button */}
            <button
              type="button"
              onClick={handleGetPayload}
              disabled={loadingPayload || !marketId}
              className="w-full px-4 py-2.5 bg-blue-600/80 hover:bg-blue-600 border border-blue-500/50 hover:border-blue-400/50 text-white rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loadingPayload ? (
                <>
                  <Loader className="animate-spin" size={16} />
                  <span>Getting Payload...</span>
                </>
              ) : (
                <>
                  <Activity size={16} />
                  <span>1. Get Payload from Kana API</span>
                </>
              )}
            </button>

            {/* Payload Result */}
            {payloadResult && (
              <div
                className={`p-4 rounded-lg border ${
                  payloadResult.success
                    ? "bg-blue-900/20 border-blue-500/50"
                    : "bg-red-900/20 border-red-500/50"
                }`}
              >
                <div className="flex items-start gap-2">
                  {payloadResult.success ? (
                    <CheckCircle2
                      size={20}
                      className="text-blue-400 flex-shrink-0 mt-0.5"
                    />
                  ) : (
                    <XCircle
                      size={20}
                      className="text-red-400 flex-shrink-0 mt-0.5"
                    />
                  )}
                  <div className="flex-1">
                    <p
                      className={`text-sm font-semibold mb-2 ${
                        payloadResult.success ? "text-blue-400" : "text-red-400"
                      }`}
                    >
                      {payloadResult.success ? "Payload Received" : "Error"}
                    </p>
                    {payloadResult.success && payloadResult.payload && (
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-slate-400 mb-1">
                            Payload Data:
                          </p>
                          <pre className="text-xs text-slate-300 bg-slate-900/50 p-2 rounded overflow-x-auto font-mono max-h-60 overflow-y-auto">
                            {JSON.stringify(payloadResult.payload, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                    {payloadResult.error && (
                      <p className="text-xs text-red-400">
                        {payloadResult.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Submit to Aptos Button */}
            <button
              type="submit"
              disabled={submitting || !payloadResult?.success || !marketId}
              className="w-full px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              {submitting ? (
                <>
                  <Loader className="animate-spin" size={16} />
                  <span>Submitting to Aptos...</span>
                </>
              ) : (
                <>
                  <Activity size={16} />
                  <span>2. Submit to Aptos Blockchain</span>
                </>
              )}
            </button>

            {/* Result */}
            {result && (
              <div
                className={`p-4 rounded-lg border ${
                  result.success
                    ? "bg-green-900/20 border-green-500/50"
                    : "bg-red-900/20 border-red-500/50"
                }`}
              >
                <div className="flex items-start gap-2">
                  {result.success ? (
                    <CheckCircle2
                      size={20}
                      className="text-green-400 flex-shrink-0 mt-0.5"
                    />
                  ) : (
                    <XCircle
                      size={20}
                      className="text-red-400 flex-shrink-0 mt-0.5"
                    />
                  )}
                  <div className="flex-1">
                    <p
                      className={`text-sm font-semibold mb-1 ${
                        result.success ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {result.success ? "Success!" : "Error"}
                    </p>
                    {result.success && result.txHash && (
                      <div className="space-y-1 text-xs text-slate-300">
                        <p>
                          <span className="text-slate-500">
                            Transaction Hash:
                          </span>{" "}
                          <span className="font-mono">{result.txHash}</span>
                        </p>
                        {result.version && (
                          <p>
                            <span className="text-slate-500">Version:</span>{" "}
                            <span className="font-mono">{result.version}</span>
                          </p>
                        )}
                      </div>
                    )}
                    {result.error && (
                      <div className="space-y-2">
                        <p className="text-xs text-red-400 font-semibold">
                          Error:
                        </p>
                        <p className="text-xs text-red-300 break-words">
                          {result.error}
                        </p>
                        {result.error.includes(
                          "E_NO_FILLED_OPEN_POSITION_ON_ONE_SIDE"
                        ) && (
                          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2 mt-2">
                            <p className="text-xs text-yellow-400 font-semibold mb-1">
                              Possible Issues:
                            </p>
                            <ul className="text-xs text-yellow-300/90 space-y-1 list-disc pl-4">
                              <li>
                                Wrong Market ID - Make sure you're using the
                                Market ID from your open positions
                              </li>
                              <li>
                                The collapse function may require positions on
                                BOTH sides (LONG and SHORT) - you currently only
                                have a{" "}
                                {positions.find((p) => p.marketId === marketId)
                                  ?.side || "position"}{" "}
                                position
                              </li>
                              <li>
                                The position might not be in the correct state
                                for collapsing
                              </li>
                            </ul>
                            {positions.length > 0 && (
                              <p className="text-xs text-yellow-400 mt-2">
                                Your open positions Market IDs:{" "}
                                {positions
                                  .map((p) => p.marketId)
                                  .filter(Boolean)
                                  .join(", ")}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Remove old duplicate form section */}
        <div
          className="rounded-[18px] p-6 mb-6 transition-all duration-300 hidden"
          style={{
            background:
              "linear-gradient(180deg, rgba(28, 31, 46, 0.8) 0%, rgba(22, 24, 33, 0.8) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.25)",
          }}
        >
          <div className="space-y-6 hidden">
            {/* Old content removed */}
            <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-4 hidden">
              <h3 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">
                <Activity size={16} />
                1. Get Positions API
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-slate-400">
                      Backend Endpoint (Our API):
                    </p>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `${apiBaseUrl}/wallets/positions`,
                          "backend-positions-url"
                        )
                      }
                      className="p-1 hover:bg-slate-800/50 rounded transition-all text-slate-400 hover:text-white"
                      title="Copy URL"
                    >
                      {copiedText === "backend-positions-url" ? (
                        <CheckCircle2 size={14} className="text-green-400" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                  <div className="bg-slate-950/50 p-2 rounded font-mono text-slate-200 relative group">
                    <div className="mb-1">
                      <span className="text-green-400">GET</span>{" "}
                      <span className="text-blue-400">
                        {apiBaseUrl}/wallets/positions
                      </span>
                    </div>
                    <div className="text-slate-500 text-[10px] mt-1">
                      Query Params (Optional): marketId (string)
                    </div>
                    <div className="text-slate-500 text-[10px] mt-1">
                      Example: {apiBaseUrl}/wallets/positions?marketId=15
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-slate-400 mb-1">Headers:</p>
                  <div className="bg-slate-950/50 p-2 rounded font-mono text-slate-200 space-y-1">
                    <div>
                      <span className="text-slate-500">Authorization:</span>{" "}
                      <span className="text-yellow-400">
                        Bearer {"<JWT_TOKEN>"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Content-Type:</span>{" "}
                      <span className="text-yellow-400">application/json</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-slate-400">
                      Kana Labs API (Direct Call):
                    </p>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `${kanaApiUrl}/getPositions`,
                          "kana-positions-url"
                        )
                      }
                      className="p-1 hover:bg-slate-800/50 rounded transition-all text-slate-400 hover:text-white"
                      title="Copy URL"
                    >
                      {copiedText === "kana-positions-url" ? (
                        <CheckCircle2 size={14} className="text-green-400" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                  <div className="bg-slate-950/50 p-2 rounded font-mono text-slate-200">
                    <div className="mb-1">
                      <span className="text-green-400">GET</span>{" "}
                      <span className="text-blue-400">
                        {kanaApiUrl}/getPositions
                      </span>
                    </div>
                    <div className="text-slate-500 text-[10px] mt-1">
                      Query Params: userAddress (required), marketId (optional)
                    </div>
                    <div className="text-slate-500 text-[10px] mt-1">
                      Example: {kanaApiUrl}
                      /getPositions?userAddress=0x1234...&marketId=15
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-slate-400 mb-1">
                    ⚠️ Kana Labs Headers (IMPORTANT - Use Headers, NOT Query
                    Params):
                  </p>
                  <div className="bg-red-900/20 border border-red-500/30 p-2 rounded font-mono text-slate-200 space-y-1">
                    <div className="text-red-400 text-[10px] mb-1 font-semibold">
                      ❌ DO NOT put x-api-key in query params!
                    </div>
                    <div>
                      <span className="text-slate-500">Header Name:</span>{" "}
                      <span className="text-yellow-400">x-api-key</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Header Value:</span>{" "}
                      <span className="text-yellow-400">
                        {"<KANA_API_KEY>"}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[10px] mt-1">
                      In Postman: Go to "Headers" tab, add x-api-key as header
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-slate-400 mb-1">Postman Setup:</p>
                  <div className="bg-slate-950/50 p-2 rounded font-mono text-slate-200 text-[10px] space-y-2">
                    <div>
                      <div className="text-slate-500 mb-1">Method & URL:</div>
                      <div className="text-slate-300">
                        GET {apiBaseUrl}/wallets/positions
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-1">Headers:</div>
                      <div className="text-slate-300 space-y-0.5">
                        <div>Authorization: Bearer {"<YOUR_JWT_TOKEN>"}</div>
                        <div>Content-Type: application/json</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-1">
                        Query Params (Optional):
                      </div>
                      <div className="text-slate-300">
                        marketId = 15 (or leave empty for all)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Collapse Position API */}
            <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-4">
              <h3 className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2">
                <Activity size={16} />
                2. Collapse Position API
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-slate-400">
                      Backend Endpoint (Our API):
                    </p>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `${apiBaseUrl}/wallets/collapse-position`,
                          "backend-collapse-url"
                        )
                      }
                      className="p-1 hover:bg-slate-800/50 rounded transition-all text-slate-400 hover:text-white"
                      title="Copy URL"
                    >
                      {copiedText === "backend-collapse-url" ? (
                        <CheckCircle2 size={14} className="text-green-400" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                  <div className="bg-slate-950/50 p-2 rounded font-mono text-slate-200">
                    <div className="mb-1">
                      <span className="text-orange-400">POST</span>{" "}
                      <span className="text-blue-400">
                        {apiBaseUrl}/wallets/collapse-position
                      </span>
                    </div>
                    <div className="text-slate-500 text-[10px] mt-1">
                      Body: {"{"} marketId?: string {"}"} (optional)
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-slate-400 mb-1">Headers:</p>
                  <div className="bg-slate-950/50 p-2 rounded font-mono text-slate-200 space-y-1">
                    <div>
                      <span className="text-slate-500">Authorization:</span>{" "}
                      <span className="text-yellow-400">
                        Bearer {"<JWT_TOKEN>"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Content-Type:</span>{" "}
                      <span className="text-yellow-400">application/json</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-slate-400 mb-1">Request Body:</p>
                  <div className="bg-slate-950/50 p-2 rounded font-mono text-slate-200">
                    <pre className="text-[10px] text-slate-300">
                      {`{
  "marketId": "15"  // Optional: omit to collapse ALL positions
}`}
                    </pre>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-slate-400">
                      Kana Labs API (Direct Call):
                    </p>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `${kanaApiUrl}/collapsePosition`,
                          "kana-collapse-url"
                        )
                      }
                      className="p-1 hover:bg-slate-800/50 rounded transition-all text-slate-400 hover:text-white"
                      title="Copy URL"
                    >
                      {copiedText === "kana-collapse-url" ? (
                        <CheckCircle2 size={14} className="text-green-400" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                  <div className="bg-slate-950/50 p-2 rounded font-mono text-slate-200">
                    <div className="mb-1">
                      <span className="text-green-400">GET</span>{" "}
                      <span className="text-blue-400">
                        {kanaApiUrl}/collapsePosition
                      </span>
                    </div>
                    <div className="text-slate-500 text-[10px] mt-1">
                      Query Params: userAddress (required), marketId (optional)
                    </div>
                    <div className="text-slate-500 text-[10px] mt-1">
                      Example: {kanaApiUrl}
                      /collapsePosition?userAddress=0x1234...&marketId=15
                    </div>
                    <div className="text-slate-500 text-[10px] mt-1">
                      Or (all positions): {kanaApiUrl}
                      /collapsePosition?userAddress=0x1234...
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-slate-400 mb-1">
                    ⚠️ Kana Labs Headers (IMPORTANT - Use Headers, NOT Query
                    Params):
                  </p>
                  <div className="bg-red-900/20 border border-red-500/30 p-2 rounded font-mono text-slate-200 space-y-1">
                    <div className="text-red-400 text-[10px] mb-1 font-semibold">
                      ❌ DO NOT put x-api-key in query params!
                    </div>
                    <div>
                      <span className="text-slate-500">Header Name:</span>{" "}
                      <span className="text-yellow-400">x-api-key</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Header Value:</span>{" "}
                      <span className="text-yellow-400">
                        {"<KANA_API_KEY>"}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[10px] mt-1">
                      In Postman: Go to "Headers" tab, add x-api-key as header
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-slate-400 mb-1">
                    Postman Setup (Backend API):
                  </p>
                  <div className="bg-slate-950/50 p-2 rounded font-mono text-slate-200 text-[10px] space-y-2">
                    <div>
                      <div className="text-slate-500 mb-1">Method & URL:</div>
                      <div className="text-slate-300">
                        POST {apiBaseUrl}/wallets/collapse-position
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-1">Headers:</div>
                      <div className="text-slate-300 space-y-0.5">
                        <div>Authorization: Bearer {"<YOUR_JWT_TOKEN>"}</div>
                        <div>Content-Type: application/json</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-1">
                        Body (raw JSON):
                      </div>
                      <div className="text-slate-300">
                        {"{"} "marketId": "15" {"}"}
                      </div>
                      <div className="text-slate-500 text-[9px] mt-0.5">
                        Or {"{"} {"}"} for all positions
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800/50">
                  <p className="text-slate-400 mb-1 font-semibold text-red-400">
                    Postman Setup (Direct Kana Labs API):
                  </p>
                  <div className="bg-red-900/20 border border-red-500/30 p-2 rounded font-mono text-slate-200 text-[10px] space-y-2">
                    <div>
                      <div className="text-red-400 mb-1 font-semibold">
                        Method & URL:
                      </div>
                      <div className="text-slate-300">
                        GET {kanaApiUrl}/collapsePosition
                      </div>
                    </div>
                    <div>
                      <div className="text-red-400 mb-1 font-semibold">
                        Headers Tab (IMPORTANT!):
                      </div>
                      <div className="text-slate-300 space-y-0.5">
                        <div>
                          <span className="text-slate-500">Key:</span> x-api-key
                        </div>
                        <div>
                          <span className="text-slate-500">Value:</span>{" "}
                          {"<KANA_API_KEY>"}
                        </div>
                        <div className="text-red-400 text-[9px] mt-1">
                          ⚠️ Add this in Headers tab, NOT in Params tab!
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-red-400 mb-1 font-semibold">
                        Params Tab (Query Parameters):
                      </div>
                      <div className="text-slate-300 space-y-0.5">
                        <div>
                          <span className="text-slate-500">Key:</span>{" "}
                          userAddress
                        </div>
                        <div>
                          <span className="text-slate-500">Value:</span>{" "}
                          {"<WALLET_ADDRESS>"}
                        </div>
                        <div className="text-slate-500 text-[9px] mt-1">
                          Optional: marketId = 15 (or omit for all positions)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Debug Endpoints */}
            <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-4">
              <h3 className="text-sm font-bold text-purple-400 mb-3 flex items-center gap-2">
                <Activity size={16} />
                3. Debug Endpoints (Get Payload Only)
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-slate-400 mb-1">Get Positions Payload:</p>
                  <div className="bg-slate-950/50 p-2 rounded font-mono text-slate-200">
                    <div className="mb-1">
                      <span className="text-green-400">GET</span>{" "}
                      <span className="text-blue-400">
                        {process.env.NEXT_PUBLIC_API_URL ||
                          "http://localhost:4001/api"}
                        /wallets/positions-payload
                      </span>
                    </div>
                    <div className="text-slate-500 text-[10px] mt-1">
                      Query Params (Optional): marketId (string)
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-slate-400 mb-1">
                    Get Collapse Position Payload:
                  </p>
                  <div className="bg-slate-950/50 p-2 rounded font-mono text-slate-200">
                    <div className="mb-1">
                      <span className="text-green-400">GET</span>{" "}
                      <span className="text-blue-400">
                        {process.env.NEXT_PUBLIC_API_URL ||
                          "http://localhost:4001/api"}
                        /wallets/collapse-position-payload
                      </span>
                    </div>
                    <div className="text-slate-500 text-[10px] mt-1">
                      Query Params (Optional): marketId (string)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle
                  size={16}
                  className="text-yellow-400 flex-shrink-0 mt-0.5"
                />
                <div className="flex-1 text-xs text-yellow-300/90">
                  <p className="font-semibold text-yellow-400 mb-1">
                    Postman Testing Notes:
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>
                      Get JWT token from browser DevTools → Application → Local
                      Storage → supabase.auth.token
                    </li>
                    <li>
                      Kana API Key is stored in backend environment variable
                      KANA_API_KEY
                    </li>
                    <li>
                      For backend endpoints, use your JWT token in Authorization
                      header
                    </li>
                    <li>
                      For direct Kana Labs API calls, use KANA_API_KEY in
                      x-api-key{" "}
                      <span className="font-bold text-yellow-400">HEADER</span>{" "}
                      (NOT query param!)
                    </li>
                    <li>
                      <span className="font-bold text-red-400">CRITICAL:</span>{" "}
                      In Postman, add x-api-key in the "Headers" tab, NOT in the
                      "Params" tab!
                    </li>
                    <li>
                      userAddress is automatically retrieved from authenticated
                      user in backend endpoints
                    </li>
                    <li>
                      marketId is optional - omit to get/collapse ALL positions
                    </li>
                    <li>
                      Kana Labs API Base URL:{" "}
                      <span className="font-mono text-blue-400">
                        {kanaApiUrl}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Current Positions */}
        <div
          className="rounded-[18px] p-6 transition-all duration-300"
          style={{
            background:
              "linear-gradient(180deg, rgba(28, 31, 46, 0.8) 0%, rgba(22, 24, 33, 0.8) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.25)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2
              className={`${palanquinDark.className} text-lg font-semibold text-white`}
            >
              Current Open Positions
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleGetPositionsPayload}
                disabled={loadingPositionsPayload}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-800/50 hover:bg-blue-700/50 border border-blue-700/50 hover:border-blue-600/50 rounded-lg text-xs font-medium text-blue-300 hover:text-blue-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {loadingPositionsPayload ? (
                  <Loader className="animate-spin" size={14} />
                ) : (
                  <Activity size={14} />
                )}
                <span>Get API Payload</span>
              </button>
              <button
                onClick={fetchPositions}
                disabled={loadingPositions}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-slate-600/50 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <RefreshCw
                  size={14}
                  className={`${
                    loadingPositions ? "animate-spin" : "group-hover:rotate-180"
                  } transition-transform duration-300`}
                />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Positions Payload Result */}
          {positionsPayloadResult && (
            <div
              className={`mb-4 p-4 rounded-lg border ${
                positionsPayloadResult.success
                  ? "bg-blue-900/20 border-blue-500/50"
                  : "bg-red-900/20 border-red-500/50"
              }`}
            >
              <div className="flex items-start gap-2">
                {positionsPayloadResult.success ? (
                  <CheckCircle2
                    size={20}
                    className="text-blue-400 flex-shrink-0 mt-0.5"
                  />
                ) : (
                  <XCircle
                    size={20}
                    className="text-red-400 flex-shrink-0 mt-0.5"
                  />
                )}
                <div className="flex-1">
                  <p
                    className={`text-sm font-semibold mb-2 ${
                      positionsPayloadResult.success
                        ? "text-blue-400"
                        : "text-red-400"
                    }`}
                  >
                    {positionsPayloadResult.success
                      ? "Positions API Response"
                      : "Error"}
                  </p>
                  {positionsPayloadResult.success &&
                    positionsPayloadResult.data && (
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-slate-400 mb-1">
                            Positions Data (
                            {Array.isArray(positionsPayloadResult.data)
                              ? positionsPayloadResult.data.length
                              : "N/A"}{" "}
                            positions):
                          </p>
                          <pre className="text-xs text-slate-300 bg-slate-900/50 p-2 rounded overflow-x-auto font-mono max-h-60 overflow-y-auto">
                            {JSON.stringify(
                              positionsPayloadResult.data,
                              null,
                              2
                            )}
                          </pre>
                        </div>
                        {positionsPayloadResult.rawResponse && (
                          <div>
                            <p className="text-xs text-slate-400 mb-1">
                              Full API Response:
                            </p>
                            <pre className="text-xs text-slate-300 bg-slate-900/50 p-2 rounded overflow-x-auto font-mono max-h-40 overflow-y-auto">
                              {JSON.stringify(
                                positionsPayloadResult.rawResponse,
                                null,
                                2
                              )}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  {positionsPayloadResult.error && (
                    <p className="text-xs text-red-400">
                      {positionsPayloadResult.error}
                    </p>
                  )}
                  {positionsPayloadResult.rawResponse &&
                    !positionsPayloadResult.success && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">
                          Raw Response:
                        </p>
                        <pre className="text-xs text-slate-300 bg-slate-900/50 p-2 rounded overflow-x-auto font-mono max-h-40 overflow-y-auto">
                          {JSON.stringify(
                            positionsPayloadResult.rawResponse,
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}

          {loadingPositions ? (
            <div className="text-center py-12">
              <Loader
                size={32}
                className="text-blue-400 mx-auto mb-3 animate-spin"
              />
              <p className="text-slate-400 text-sm">Loading positions...</p>
            </div>
          ) : positions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50 border-b border-slate-800">
                  <tr>
                    <th className="pl-4 pr-2 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      Symbol
                    </th>
                    <th className="px-2 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      Side
                    </th>
                    <th className="px-2 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      Size
                    </th>
                    <th className="px-2 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      Entry Price
                    </th>
                    <th className="px-2 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      PnL
                    </th>
                    <th className="pl-2 pr-4 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      Market ID
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {positions.map((position) => (
                    <tr
                      key={position.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="pl-4 pr-2 py-3 whitespace-nowrap">
                        <span className="text-sm font-bold text-white">
                          {position.symbol}
                        </span>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold border ${
                            position.side === "LONG"
                              ? "bg-green-500/10 text-green-400 border-green-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          }`}
                        >
                          {position.side}
                        </span>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-right text-sm text-slate-200 font-mono">
                        {position.size}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-right text-sm text-slate-300 font-mono">
                        {position.entryPrice}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-right">
                        <span
                          className={`text-sm font-bold font-mono ${
                            position.pnl.startsWith("+")
                              ? "text-green-500/70"
                              : "text-red-500/70"
                          }`}
                        >
                          {position.pnl}
                        </span>
                      </td>
                      <td className="pl-2 pr-4 py-3 whitespace-nowrap text-right">
                        <span className="text-xs font-medium text-slate-400 font-mono">
                          {position.marketId || "N/A"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Wallet size={32} className="text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No open positions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
