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

  useEffect(() => {
    // Check initial auth state
    supabase()
      .auth.getSession()
      .then(({ data: { session } }) => {
        setIsSignedIn(!!session);
        setLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase().auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(!!session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signInGoogle() {
    const origin = window.location.origin;
    await supabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback` },
    });
  }

  return (
    <nav className="border-b border-zinc-800 bg-zinc-900/70 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between py-3 px-4">
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
        <div className="flex items-center gap-3">
          {!loading && (
            <>
              {isSignedIn ? (
                <UserButton />
              ) : (
                <>
                  <button className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md transition-all">
                    Deposit
                  </button>
                  <button className="text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-md transition-all">
                    Withdraw
                  </button>
                  <button
                    onClick={signInGoogle}
                    className="signin-glow text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-3 py-1.5 rounded-md transition-all"
                  >
                    Sign In
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
