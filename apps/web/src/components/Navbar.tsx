"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useEffect, useState, useRef, useCallback } from "react";
import UserButton from "./UserButton";
import DepositWithdrawModal from "./DepositWithdrawModal";
import { getCurrentUser } from "@/lib/usersApi";
import { getUSDTBalance } from "@/lib/walletsApi";
import { Wallet, Menu, X } from "lucide-react";

const navLinks = [
  { name: "Home", path: "/" },
  { name: "Leaderboard", path: "/leaderboard" },
  { name: "Copytrade", path: "/copytrade" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { isSignedIn, loading: authLoading } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [balance, setBalance] = useState<string>("0.00");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const balanceFetchedRef = useRef(false);

  // Fetch balance function - memoized to avoid unnecessary re-renders
  const fetchBalance = useCallback(async () => {
    if (!isSignedIn || !walletAddress) {
      setBalance("0.00");
      return;
    }

    try {
      setIsRefreshingBalance(true);
      const result = await getUSDTBalance();
      
      if (result.success && result.balance) {
        setBalance(result.balance);
      } else {
        setBalance("0.00");
      }
    } catch (error) {
      console.error("Failed to fetch balance:", error);
      setBalance("0.00");
    } finally {
      setIsRefreshingBalance(false);
    }
  }, [isSignedIn, walletAddress]);

  // Fetch wallet address when signed in
  useEffect(() => {
    if (!authLoading && isSignedIn) {
      getCurrentUser()
        .then((userData) => {
          if (userData?.wallet_address) {
            setWalletAddress(userData.wallet_address);
          }
        })
        .catch((error) => {
          console.error("[Navbar] Failed to fetch wallet address:", error);
        });
    } else if (!authLoading && !isSignedIn) {
      setWalletAddress(null);
      setBalance("0.00");
      balanceFetchedRef.current = false;
    }
    setSigningIn(false);
  }, [authLoading, isSignedIn]);

  // Fetch balance when wallet address is available (only once on mount)
  useEffect(() => {
    if (isSignedIn && walletAddress && !balanceFetchedRef.current) {
      balanceFetchedRef.current = true;
      fetchBalance();
    }
  }, [isSignedIn, walletAddress, fetchBalance]);

  // Fetch balance on pathname change (page navigation)
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (isSignedIn && walletAddress && prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      fetchBalance();
    }
  }, [pathname, fetchBalance, isSignedIn, walletAddress]);

  // Handle tab visibility changes - refresh balance when user returns to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      // When tab becomes visible again, refresh balance if user is signed in
      // Reset the ref so balance can be fetched again
      if (!document.hidden && isSignedIn && walletAddress) {
        balanceFetchedRef.current = false; // Reset to allow refresh
        fetchBalance();
      }
    };

    // Also handle window focus for better compatibility
    const handleFocus = () => {
      if (isSignedIn && walletAddress) {
        balanceFetchedRef.current = false; // Reset to allow refresh
        fetchBalance();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isSignedIn, walletAddress, fetchBalance]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setShowMobileMenu(false);
      }
    }

    if (showMobileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMobileMenu]);

  async function signInGoogle() {
    setSigningIn(true);
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}`,
        },
      });
    } catch (error) {
      console.error("Sign in error:", error);
      setSigningIn(false);
    }
  }

  return (
    <nav className="sticky top-0 z-50 px-3 sm:px-4 lg:px-8 py-2 sm:py-3">
      <div className="max-w-7xl mx-auto">
        {/* Outer rounded pill container with glassmorphism */}
        <div
          className="rounded-xl sm:rounded-2xl header-pill flex items-center justify-between px-3 sm:px-4 lg:px-5 py-2 sm:py-3"
          style={{
            background: "rgba(6, 9, 19, 0.75)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.05)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
          }}
        >
          {/* Left: logo block + nav links */}
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 min-w-0 flex-1">
            {/* Logo capsule */}
            <Link href="/" className="flex items-center gap-2 sm:gap-3 no-underline min-w-0">
              <div className="logo-pill flex items-center gap-1.5 sm:gap-2 lg:gap-3 px-2 sm:px-3 py-1 rounded-full">
                {/* circular icon area */}
                <div className="logo-circle flex items-center justify-center shrink-0">
                  <img
                    src="/logo.png"
                    alt="Anthé Labs"
                    className="h-5 w-5 sm:h-6 sm:w-6"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>

                {/* company name with gradient */}
                <span className="text-sm sm:text-base font-semibold bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent tracking-tight">
                  Anthé Labs
                </span>
              </div>
            </Link>

            {/* Nav links block: rounded, spaced - hidden on mobile */}
            <div className="hidden lg:flex items-center gap-2 bg-transparent rounded-full px-1 py-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    href={link.path}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "text-white bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 shadow-active-link"
                        : "text-slate-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden flex items-center justify-center p-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors"
              aria-label="Toggle menu"
            >
              {showMobileMenu ? (
                <X size={18} className="text-slate-300" />
              ) : (
                <Menu size={18} className="text-slate-300" />
              )}
            </button>
          </div>

          {/* Right: deposit / balance / profile */}
          <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 shrink-0">
            {authLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-8 sm:h-9 w-16 sm:w-20 bg-slate-800/50 rounded-lg animate-pulse"></div>
                <div className="hidden sm:block h-8 sm:h-9 w-20 sm:w-24 bg-slate-800/50 rounded-lg animate-pulse"></div>
              </div>
            ) : (
              <>
                {isSignedIn && (
                  <>
                    {/* Deposit button: rounded capsule with gradient - icon only on mobile */}
                    <button
                      onClick={() => setShowDepositModal(true)}
                      className="flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 lg:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
                    >
                      <Wallet size={14} className="sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Deposit</span>
                    </button>

                    {/* Balance display: pill with semi-transparent gradient - compact on mobile */}
                    <div
                      className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full border border-slate-700/30"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(30,41,59,0.45), rgba(15,23,42,0.35))",
                      }}
                    >
                      <img
                        src="/aptos.png"
                        alt="Aptos"
                        className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <span className="text-[10px] sm:text-xs lg:text-sm font-semibold text-white whitespace-nowrap">
                        {balance} USDT
                      </span>
                    </div>
                  </>
                )}

                {/* User Profile or Sign In button */}
                {isSignedIn ? (
                  <UserButton />
                ) : (
                  <button
                    onClick={signInGoogle}
                    disabled={signingIn}
                    className="px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed bg-slate-800 hover:bg-slate-700 text-white shadow-sm"
                  >
                    {signingIn ? (
                      <>
                        <svg
                          className="animate-spin h-3.5 w-3.5 sm:h-4 sm:w-4 text-white inline-block sm:mr-2"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        <span className="hidden sm:inline">Signing in...</span>
                      </>
                    ) : (
                      <span className="hidden sm:inline">Sign In</span>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {showMobileMenu && (
          <div
            ref={mobileMenuRef}
            className="lg:hidden mt-2 bg-[#0b1220] border border-[#1F242D] rounded-xl shadow-xl overflow-hidden"
            style={{
              background: "rgba(6, 9, 19, 0.95)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="py-2">
              {navLinks.map((link) => {
                const isActive = pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    href={link.path}
                    onClick={() => setShowMobileMenu(false)}
                    className={`block px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "text-white bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-l-2 border-blue-500"
                        : "text-slate-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Deposit/Withdraw Modal */}
      <DepositWithdrawModal
        isOpen={showDepositModal}
        onClose={async () => {
          setShowDepositModal(false);
          // Refresh balance when modal closes (user might have deposited)
          if (isSignedIn && walletAddress) {
            // Small delay to ensure any pending transactions are processed
            setTimeout(() => {
              fetchBalance();
            }, 300);
          }
        }}
        walletAddress={walletAddress}
        balance={balance}
        onRefreshBalance={fetchBalance}
        isRefreshingBalance={isRefreshingBalance}
      />
    </nav>
  );
}
