"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import UserButton from "./UserButton";

const navLinks = [
  { name: "Home", path: "/" },
  { name: "Dashboard", path: "/dashboard" },
  { name: "Trader", path: "/trader" },
  { name: "Copytrade", path: "/copytrade" },
  { name: "Profile", path: "/profile" },
  { name: "About", path: "/about" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    // Check initial auth state
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
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
    <nav className="border-b border-zinc-800 bg-zinc-900/70 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between py-3 px-3 sm:px-4 gap-2 sm:gap-4">
        {/* LEFT: Logo */}
        <div className="flex items-center gap-2">
          <img src="/favicon.ico" alt="logo" className="h-7 w-7 rounded" />
          <Link
            href="/"
            className="text-xl font-bold text-indigo-400 tracking-wide"
          >
            Anthé Labs
          </Link>
        </div>

        {/* MIDDLE: Navigation Links */}
        <div className="hidden md:flex gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              href={link.path}
              className={`nav-link text-sm font-medium transition-colors ${
                pathname === link.path
                  ? "text-indigo-400"
                  : "text-zinc-400 hover:text-indigo-400"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="h-8 w-20 bg-zinc-800/50 rounded-md animate-pulse"></div>
            </div>
          ) : (
            <>
              {/* Action Buttons - Grouped */}
              <div className="flex items-center gap-2">
                <button className="text-xs sm:text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-2 sm:px-3 py-1.5 rounded-md transition-all whitespace-nowrap">
                  Deposit
                </button>
                <button className="text-xs sm:text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2 sm:px-3 py-1.5 rounded-md transition-all whitespace-nowrap">
                  Withdraw
                </button>
              </div>
              
              {/* User Section - Separated with divider */}
              <div className="h-6 w-px bg-zinc-700 mx-1"></div>
              
              {isSignedIn ? (
                <UserButton />
              ) : (
                <button
                  onClick={signInGoogle}
                  disabled={signingIn}
                  className="signin-glow text-xs sm:text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-3 sm:px-4 py-1.5 rounded-md transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 min-w-[80px] sm:min-w-[100px] justify-center whitespace-nowrap"
                >
                  {signingIn ? (
                    <>
                      <svg
                        className="animate-spin h-3 w-3 sm:h-4 sm:w-4 text-white"
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
    </nav>
  );
}
