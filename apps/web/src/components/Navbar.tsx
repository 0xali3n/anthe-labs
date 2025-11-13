"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import UserButton from "./UserButton";
import { Wallet } from "lucide-react";

const navLinks = [
  { name: "Home", path: "/" },
  { name: "Leaderboard", path: "/leaderboard" },
  { name: "Copytrade", path: "/copytrade" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [balance, setBalance] = useState<string>("0.00");

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsSignedIn(!!session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(!!session);
      setLoading(false);
      setSigningIn(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
    <nav className="sticky top-0 z-50 px-4 sm:px-6 lg:px-8 py-2">
      <div className="max-w-7xl mx-auto">
        <div
          className="border border-slate-800/80 rounded-2xl shadow-xl shadow-black/30 px-4 sm:px-6 py-2 backdrop-blur-xl"
          style={{
            background: "linear-gradient(to bottom, #0f172a, #0b0f14)",
          }}
        >
          <div className="flex items-center justify-between gap-4">
            {/* LEFT: Logo + Navigation Links */}
            <div className="flex items-center gap-12 sm:gap-14">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2 flex-shrink-0">
                <img
                  src="/logo.png"
                  alt="Anthé Labs"
                  className="h-7 w-7 sm:h-8 sm:w-8"
                  onError={(e) => {
                    // Fallback if logo doesn't exist yet
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <span className="text-lg sm:text-xl font-semibold text-white leading-tight">
                  Anthé Labs
                </span>
              </Link>

              {/* Navigation Links */}
              <div className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => {
                  const isActive = pathname === link.path;
                  return (
                    <Link
                      key={link.path}
                      href={link.path}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "text-white bg-slate-800/50"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/30"
                      }`}
                    >
                      {link.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* RIGHT: Deposit, Balance, User Profile */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-9 w-20 bg-slate-800/50 rounded-lg animate-pulse"></div>
                  <div className="h-9 w-24 bg-slate-800/50 rounded-lg animate-pulse"></div>
                </div>
              ) : (
                <>
                  {isSignedIn && (
                    <>
                      {/* Deposit Button */}
                      <button className="flex items-center gap-2 px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap hover:shadow-[0_0_10px_rgba(59,130,246,0.4)]">
                        <Wallet size={14} />
                        <span className="hidden sm:inline">Deposit</span>
                      </button>

                      {/* Balance Display */}
                      <div
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700/30"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(30, 41, 59, 0.4), rgba(15, 23, 42, 0.4))",
                        }}
                      >
                        <img
                          src="/aptos.png"
                          alt="Aptos"
                          className="h-4 w-4"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                        <span className="text-sm font-semibold text-blue-400">
                          {balance} USDT
                        </span>
                      </div>
                    </>
                  )}

                  {/* User Profile or Sign In */}
                  {isSignedIn ? (
                    <UserButton />
                  ) : (
                    <button
                      onClick={signInGoogle}
                      disabled={signingIn}
                      className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap shadow-sm"
                    >
                      {signingIn ? (
                        <>
                          <svg
                            className="animate-spin h-4 w-4 text-white inline-block mr-2"
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
                          <span className="hidden sm:inline">
                            Signing in...
                          </span>
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
