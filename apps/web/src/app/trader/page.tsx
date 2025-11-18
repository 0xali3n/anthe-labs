"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentUser } from "@/lib/usersApi";
import { registerTrader, getMyTraderRegistration } from "@/lib/tradersApi";
import { AbortError } from "@/lib/apiClient";
import {
  Loader,
  Wallet,
  User,
  CheckCircle2,
  FileText,
  Award,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import WalletConnectModal from "@/components/WalletConnectModal";

export default function TraderPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [connectedWalletName, setConnectedWalletName] = useState<string | null>(
    null
  );
  const [botName, setBotName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [existingRegistration, setExistingRegistration] = useState<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load user data when navigating to /trader
  useEffect(() => {
    // Only run if we're on the trader page
    if (pathname !== "/trader") {
      // Reset state when not on trader page
      setIsSignedIn(false);
      setWalletAddress(null);
      setBotName("");
      setExistingRegistration(null);
      setError(null);
      setSuccess(false);
      setLoading(false);
      // Abort any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      return;
    }

    // Abort any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this load
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let mounted = true;

    // Reset state when starting a new load
    setLoading(true);
    setError(null);
    setIsSignedIn(false);
    setWalletAddress(null);
    setBotName("");
    setExistingRegistration(null);

    async function loadUser() {
      console.log("[Trader] Starting to load user data...");

      try {
        // Wait for Supabase session to be ready
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!mounted || abortController.signal.aborted) {
          console.log("[Trader] Load aborted (unmounted or cancelled)");
          return;
        }

        if (sessionError) {
          console.error("[Trader] Session error:", sessionError);
          if (mounted) {
            setError("Failed to get session. Please try again.");
            setLoading(false);
          }
          return;
        }

        if (!session?.access_token) {
          console.log("[Trader] No session, user not signed in");
          if (mounted) {
            setIsSignedIn(false);
            setWalletAddress(null);
            setLoading(false);
          }
          return;
        }

        console.log("[Trader] Session found, fetching user data...");
        if (mounted) {
          setIsSignedIn(true);
        }

        try {
          const userData = await getCurrentUser(abortController.signal);

          if (!mounted || abortController.signal.aborted) {
            console.log("[Trader] Load aborted after fetch");
            return;
          }

          console.log("[Trader] User data loaded successfully");

          // Check if user has existing trader registration
          try {
            const registrationResult = await getMyTraderRegistration();

            if (!mounted || abortController.signal.aborted) {
              return;
            }

            if (registrationResult.success && registrationResult.data) {
              console.log(
                "[Trader] Existing registration found:",
                registrationResult.data
              );
              setExistingRegistration(registrationResult.data);
              // Pre-fill form with existing registration data
              setWalletAddress(registrationResult.data.address);
              setBotName(registrationResult.data.botName || "");
            }
          } catch (regError) {
            // No existing registration - that's fine
            if (!mounted || abortController.signal.aborted) {
              return;
            }
            console.log("[Trader] No existing registration found");
          }

          // Always clear loading state after all operations complete
          if (mounted && !abortController.signal.aborted) {
            setLoading(false);
          }
        } catch (error: any) {
          // Silently handle abort errors (intentional cancellation)
          if (
            error instanceof AbortError ||
            error.message === "Request aborted" ||
            error.name === "AbortError" ||
            abortController.signal.aborted
          ) {
            console.log("[Trader] Request aborted (intentional)");
            return;
          }

          if (!mounted) return;

          console.error("[Trader] Failed to load user data:", error);
          setError(error.message || "Failed to load user data");
          setLoading(false);
        }
      } catch (error: any) {
        if (!mounted || abortController.signal.aborted) return;
        console.error("[Trader] Error in loadUser:", error);
        setError(error.message || "Failed to load data");
        setLoading(false);
      } finally {
        // Ensure loading state is always cleared if component is still mounted
        if (mounted && !abortController.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      setIsSignedIn(!!session);
      // Don't pre-fill wallet address - trader must connect their own trading wallet
      if (!session) {
        setWalletAddress(null);
        setExistingRegistration(null);
      }
    });

    return () => {
      mounted = false;
      abortController.abort();
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      subscription.unsubscribe();
    };
  }, [pathname]);

  const handleConnectWallet = () => {
    setIsWalletModalOpen(true);
  };

  const handleWalletConnected = (address: string, walletName: string) => {
    setWalletAddress(address);
    setConnectedWalletName(walletName);
    setSuccess(true);
    setError(null);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Don't allow resubmission if already registered
    if (existingRegistration) {
      setError("You have already registered. Please wait for approval.");
      return;
    }

    if (!walletAddress) {
      setError("Please connect your wallet first");
      return;
    }

    if (!botName.trim()) {
      setError("Please enter a bot name");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Register trader with wallet address and bot name
      const result = await registerTrader(walletAddress, botName.trim());

      if (!result.success) {
        throw new Error(result.error || "Failed to register as trader");
      }

      // Update existing registration state
      setExistingRegistration(result.data);
      setSuccess(true);

      // Don't redirect - show step 4 instead
      // setTimeout(() => {
      //   router.push("/leaderboard");
      // }, 2000);
    } catch (error: any) {
      console.error("Registration error:", error);
      setError(error.message || "Failed to register as trader");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
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
          <h2 className="text-xl font-semibold text-white mb-2 tracking-tight">
            Sign In Required
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            Please sign in to register as a trader
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
    <div className="min-h-screen bg-slate-950 relative">
      {/* Background Pattern */}
      <div
        className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />
      {/* Subtle gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-b from-blue-950/5 via-transparent to-slate-950/5 pointer-events-none" />

      <div className="max-w-5xl mx-auto py-8 sm:py-10 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full mb-4">
            <Sparkles size={14} className="text-blue-400" />
            <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">
              Trader Registration
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent mb-4 tracking-tight">
            Register as Trader
          </h1>
          <p className="text-slate-400 text-base max-w-2xl mx-auto leading-relaxed">
            Join our elite community of traders and start earning from your
            strategies
          </p>
        </div>

        {/* Success/Error Messages */}
        {existingRegistration && (
          <div
            className={`mb-6 border rounded-lg p-4 ${
              existingRegistration.status === "approved"
                ? "bg-green-900/20 border-green-500/50"
                : existingRegistration.status === "rejected"
                  ? "bg-red-900/20 border-red-500/50"
                  : "bg-blue-900/20 border-blue-500/50"
            }`}
          >
            <p
              className={`text-sm ${
                existingRegistration.status === "approved"
                  ? "text-green-400"
                  : existingRegistration.status === "rejected"
                    ? "text-red-400"
                    : "text-blue-400"
              }`}
            >
              {existingRegistration.status === "approved"
                ? "✅ Your trader registration has been approved!"
                : existingRegistration.status === "rejected"
                  ? "❌ Your trader registration was rejected. Please contact support."
                  : "⏳ Your registration is pending approval. Please wait while we review your application."}
            </p>
          </div>
        )}

        {success && !existingRegistration && (
          <div className="mb-6 bg-green-900/20 border border-green-500/50 rounded-lg p-4">
            <p className="text-green-400 text-sm">
              {walletAddress
                ? `Wallet connected successfully! ${connectedWalletName ? `(${connectedWalletName})` : ""}`
                : "Registration successful! Your application is pending approval."}
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Steps Section */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
            {/* Step 1: Connect Wallet - Current when wallet is NOT connected */}
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                  !walletAddress
                    ? "bg-blue-600 text-white"
                    : "bg-green-600 text-white"
                }`}
              >
                1
              </div>
              <span className="text-sm text-slate-400 hidden sm:inline whitespace-nowrap">
                Connect Wallet
              </span>
            </div>
            <div className="w-8 h-px bg-slate-700 shrink-0"></div>
            {/* Step 2: Bot Name - Current when wallet IS connected but bot name is NOT filled */}
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                  walletAddress && !botName.trim()
                    ? "bg-blue-600 text-white"
                    : walletAddress && botName.trim()
                      ? "bg-green-600 text-white"
                      : "bg-slate-800 text-slate-500 border border-slate-700"
                }`}
              >
                2
              </div>
              <span className="text-sm text-slate-400 hidden sm:inline whitespace-nowrap">
                Bot Name
              </span>
            </div>
            <div className="w-8 h-px bg-slate-700 shrink-0"></div>
            {/* Step 3: Submit - Current when both wallet and bot name are filled but not submitted */}
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                  walletAddress && botName.trim() && !success
                    ? "bg-blue-600 text-white"
                    : success
                      ? "bg-green-600 text-white"
                      : "bg-slate-800 text-slate-500 border border-slate-700"
                }`}
              >
                3
              </div>
              <span className="text-sm text-slate-400 hidden sm:inline whitespace-nowrap">
                Submit
              </span>
            </div>
            <div className="w-8 h-px bg-slate-700 shrink-0"></div>
            {/* Step 4: Approval - Current after successful submission or if existing registration */}
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                  existingRegistration || success
                    ? existingRegistration?.status === "approved"
                      ? "bg-green-600 text-white"
                      : "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-500 border border-slate-700"
                }`}
              >
                4
              </div>
              <span className="text-sm text-slate-400 hidden sm:inline whitespace-nowrap">
                Approval
              </span>
            </div>
          </div>
        </div>

        {/* Registration Form Section */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 sm:p-10 mb-8 relative overflow-hidden">
          {/* Subtle gradient border effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-cyan-500/5 pointer-events-none" />
          <div className="relative">
            {/* Card Header */}
            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-800">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <FileText size={20} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white tracking-tight">
                  Registration Details
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete the form below to register as a trader
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                {/* Connect Wallet Button */}
                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
                    Wallet Connection
                  </label>
                  <button
                    type="button"
                    onClick={handleConnectWallet}
                    disabled={!!walletAddress || !!existingRegistration}
                    className={`w-full px-4 py-3.5 border rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 h-[52px] ${
                      walletAddress || existingRegistration
                        ? "bg-green-500/10 border-green-500/50 text-green-400 cursor-not-allowed"
                        : "bg-slate-800/50 hover:bg-slate-800 border-slate-700 text-slate-200"
                    }`}
                  >
                    {walletAddress ? (
                      <>
                        <CheckCircle2 size={16} className="text-green-400" />
                        <span className="truncate">
                          {walletAddress.slice(0, 6)}...
                          {walletAddress.slice(-4)}
                        </span>
                      </>
                    ) : (
                      <>
                        <Wallet size={16} />
                        <span>Connect</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Bot Name Input */}
                <div className="md:col-span-5">
                  <label
                    htmlFor="bot-name"
                    className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider"
                  >
                    Bot Name
                  </label>
                  <div className="relative">
                    <User
                      size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                    />
                    <input
                      id="bot-name"
                      type="text"
                      value={botName}
                      onChange={(e) => setBotName(e.target.value)}
                      placeholder="Enter your bot name"
                      disabled={!!existingRegistration}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all h-[52px] disabled:opacity-50 disabled:cursor-not-allowed"
                      maxLength={50}
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="md:col-span-3">
                  <button
                    type="submit"
                    disabled={
                      !walletAddress ||
                      !botName.trim() ||
                      submitting ||
                      !!existingRegistration
                    }
                    className="relative w-full px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group h-[52px]"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {submitting ? (
                        <>
                          <Loader className="animate-spin" size={16} />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <TrendingUp size={16} />
                          <span>Submit</span>
                        </>
                      )}
                    </span>
                    {/* Glow effect on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Creator Description Section */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 sm:p-10 relative overflow-hidden">
          {/* Subtle gradient border effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none" />
          <div className="relative">
            {/* Section Header */}
            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-800">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Award size={20} className="text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white tracking-tight">
                  Creator Benefits
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Exclusive rewards and recognition for top traders
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {/* Qualification */}
              <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-800/50 hover:border-slate-700 transition-all">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                  <CheckCircle2 size={20} className="text-blue-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-200 mb-3 tracking-tight">
                  Qualification Process
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  We evaluate your trading volume and activity. Upon passing all
                  checks, you'll be approved as a creator with exclusive
                  benefits.
                </p>
              </div>

              {/* Rewards */}
              <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-800/50 hover:border-slate-700 transition-all">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4">
                  <TrendingUp size={20} className="text-green-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-200 mb-3 tracking-tight">
                  Rewards for Creators
                </h3>
                <ul className="space-y-2.5 text-slate-400 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500 mt-0.5">•</span>
                    <span>
                      <span className="text-slate-300 font-medium">
                        Fees Sharing:
                      </span>{" "}
                      Earn from trading fees
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500 mt-0.5">•</span>
                    <span>
                      <span className="text-slate-300 font-medium">
                        Profit Sharing:
                      </span>{" "}
                      Earn from traders profit
                    </span>
                  </li>
                </ul>
              </div>

              {/* Ranking System */}
              <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-800/50 hover:border-slate-700 transition-all">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-4">
                  <Award size={20} className="text-yellow-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-200 mb-3 tracking-tight">
                  Ranking System & Tiers
                </h3>
                <ul className="space-y-2.5 text-slate-400 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500 mt-0.5">•</span>
                    <span>
                      <span className="text-slate-300 font-medium">
                        NFT Badges:
                      </span>{" "}
                      Exclusive collectibles
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500 mt-0.5">•</span>
                    <span>
                      <span className="text-slate-300 font-medium">
                        Tier Benefits:
                      </span>{" "}
                      Higher tiers = more rewards
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500 mt-0.5">•</span>
                    <span>
                      <span className="text-slate-300 font-medium">
                        Recognition:
                      </span>{" "}
                      Stand out on leaderboard
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Additional Info Card */}
            <div className="pt-6 border-t border-slate-800">
              <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-800/50">
                <h3 className="text-base font-semibold text-slate-200 mb-2 tracking-tight">
                  Ready to Start?
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Connect your wallet, choose your bot name, and submit your
                  registration. Our team will review your application and notify
                  you once approved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Connect Modal */}
      <WalletConnectModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onConnect={handleWalletConnected}
      />
    </div>
  );
}
