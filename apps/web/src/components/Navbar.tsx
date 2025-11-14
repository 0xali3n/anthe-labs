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
    <nav className="sticky top-0 z-50 px-4 sm:px-6 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto">
        {/* Outer rounded pill container with glassmorphism */}
        <div
          className="rounded-2xl header-pill flex items-center justify-between px-5 py-3"
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
          <div className="flex items-center gap-6">
            {/* Logo capsule */}
            <Link href="/" className="flex items-center gap-3 no-underline">
              <div className="logo-pill flex items-center gap-3 px-3 py-1 rounded-full">
                {/* circular icon area */}
                <div className="logo-circle flex items-center justify-center shrink-0">
                  <img
                    src="/logo.png"
                    alt="Anthé Labs"
                    className="h-6 w-6"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>

                {/* company name with gradient */}
                <span className="text-base font-semibold bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent tracking-tight">
                  Anthé Labs
                </span>
              </div>
            </Link>

            {/* Nav links block: rounded, spaced */}
            <div className="hidden md:flex items-center gap-2 bg-transparent rounded-full px-1 py-1">
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
          </div>

          {/* Right: deposit / balance / profile */}
          <div className="flex items-center gap-3">
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-9 w-20 bg-slate-800/50 rounded-lg animate-pulse"></div>
                <div className="h-9 w-24 bg-slate-800/50 rounded-lg animate-pulse"></div>
              </div>
            ) : (
              <>
                {isSignedIn && (
                  <>
                    {/* Deposit button: rounded capsule with gradient */}
                    <button className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20">
                      <Wallet size={14} />
                      <span className="hidden sm:inline">Deposit</span>
                    </button>

                    {/* Balance display: pill with semi-transparent gradient */}
                    <div
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-700/30"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(30,41,59,0.45), rgba(15,23,42,0.35))",
                      }}
                    >
                      <img
                        src="/aptos.png"
                        alt="Aptos"
                        className="h-4 w-4 rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <span className="text-sm font-semibold text-white">
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
                    className="px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed bg-slate-800 hover:bg-slate-700 text-white shadow-sm"
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
                        <span className="hidden sm:inline">Signing in...</span>
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
    </nav>
  );
}
