"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { upsertUser } from "@/lib/usersApi";
import { formatWalletAddress } from "@/lib/walletsApi";
import { Settings, LogOut, Wallet, Copy, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    name?: string;
    picture?: string;
  };
}

export default function UserButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    // Listen for auth changes (handles both initial session and subsequent changes)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user as any);

        // Save user to database - wallet is automatically created in backend
        try {
          const result = await upsertUser({
            id: session.user.id,
            email: session.user.email || "",
            full_name: session.user.user_metadata?.full_name,
            avatar_url:
              session.user.user_metadata?.avatar_url ||
              session.user.user_metadata?.picture,
            google_id:
              session.user.user_metadata?.google_id ||
              session.user.user_metadata?.sub,
          });
          
          // Debug: Log the full result to see what we're getting
          console.log("📦 User upsert result:", result);
          
          // Wallet address is automatically included in user response
          // No separate API call needed!
          if (result?.wallet_address) {
            setWalletAddress(result.wallet_address);
            console.log("✅ Wallet address loaded:", result.wallet_address);
          } else {
            console.warn("⚠️ No wallet_address in response:", result);
          }
        } catch (error) {
          console.error("❌ Failed to save user to database:", error);
          // Don't block UI if database save fails
        }
      } else {
        setUser(null);
        setWalletAddress(null);
      }
      setLoading(false);
      setSigningOut(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.push("/");
    } catch (error) {
      console.error("Sign out error:", error);
      setSigningOut(false);
    }
  };

  const copyWalletAddress = async () => {
    if (!walletAddress) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy address:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-800/50 animate-pulse">
          <div className="h-7 w-7 rounded-full bg-zinc-700"></div>
          <div className="h-4 w-20 bg-zinc-700 rounded hidden sm:block"></div>
        </div>
        <div className="h-9 w-9 rounded-md bg-zinc-800/50 animate-pulse"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "User";
  const avatarUrl =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=6366f1&color=fff`;

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
      {/* Wallet Address - Show if exists */}
      {walletAddress && (
        <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md bg-zinc-800/50 hover:bg-zinc-800 transition-all group">
          <Wallet size={14} className="text-indigo-400 flex-shrink-0" />
          <span className="text-xs font-mono text-indigo-300 hidden md:inline">
            {formatWalletAddress(walletAddress)}
          </span>
          <button
            onClick={copyWalletAddress}
            className="p-0.5 sm:p-1 hover:bg-zinc-700 rounded transition-all flex-shrink-0"
            title={copied ? "Copied!" : "Copy full address"}
          >
            {copied ? (
              <Check size={12} className="text-green-400" />
            ) : (
              <Copy size={12} className="text-zinc-400 group-hover:text-indigo-400" />
            )}
          </button>
        </div>
      )}

      {/* User Info */}
      <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-md bg-zinc-800/50 hover:bg-zinc-800 transition-all cursor-pointer group/user">
        <img
          src={avatarUrl}
          alt={displayName}
          className="h-6 w-6 sm:h-7 sm:w-7 rounded-full border-2 border-indigo-500 object-cover transition-transform group-hover/user:scale-110 flex-shrink-0"
        />
        <span className="text-xs sm:text-sm text-zinc-200 hidden lg:inline font-medium truncate max-w-[120px]">
          {displayName}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="p-1.5 sm:p-2 hover:bg-zinc-800 rounded-md text-zinc-300 hover:text-red-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative group flex-shrink-0"
          title={signingOut ? "Signing out..." : "Sign Out"}
        >
          {signingOut ? (
            <svg
              className="animate-spin h-3 w-3 sm:h-4 sm:w-4 text-red-400"
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
          ) : (
            <LogOut size={16} className="sm:w-[18px] sm:h-[18px]" />
          )}
        </button>
        <Link
          href="/settings"
          className="p-1.5 sm:p-2 hover:bg-zinc-800 rounded-md text-zinc-300 hover:text-indigo-400 transition-all flex-shrink-0"
          title="Settings"
        >
          <Settings size={16} className="sm:w-[18px] sm:h-[18px]" />
        </Link>
      </div>
    </div>
  );
}
