"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/useAuth";
import { upsertUser } from "@/lib/usersApi";
import { formatWalletAddress } from "@/lib/walletsApi";
import { Settings, LogOut, Wallet, Copy, Check, ChevronDown, User } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, UserData } from "@/lib/usersApi";

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
  const { session, isSignedIn, loading: authLoading } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load user data when session is available
  useEffect(() => {
    if (authLoading) return;

    if (session?.user) {
      // Save user to database - wallet is automatically created in backend
      upsertUser({
        id: session.user.id,
        email: session.user.email || "",
        full_name: session.user.user_metadata?.full_name,
        avatar_url:
          session.user.user_metadata?.avatar_url ||
          session.user.user_metadata?.picture,
        google_id:
          session.user.user_metadata?.google_id ||
          session.user.user_metadata?.sub,
      })
        .then((result) => {
          // Wallet address is automatically included in user response
          if (result?.wallet_address) {
            setWalletAddress(result.wallet_address);
          }
          // Store full user data for username
          setUserData(result);
        })
        .catch((error) => {
          console.error("❌ Failed to save user to database:", error);
        });

      // Also fetch current user data to get username
      getCurrentUser()
        .then((currentUser) => {
          setUserData(currentUser);
          if (currentUser?.wallet_address) {
            setWalletAddress(currentUser.wallet_address);
          }
        })
        .catch((error) => {
          console.error("❌ Failed to fetch user data:", error);
        });
    } else {
      setUserData(null);
      setWalletAddress(null);
    }
    setSigningOut(false);
  }, [session, authLoading]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  const handleSignOut = async () => {
    setSigningOut(true);
    setShowDropdown(false);
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

  if (authLoading) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 animate-pulse">
          <div className="h-8 w-8 rounded-full bg-slate-700"></div>
          <div className="h-4 w-20 bg-slate-700 rounded hidden lg:block"></div>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const displayName =
    session.user.user_metadata?.full_name ||
    session.user.user_metadata?.name ||
    session.user.email?.split("@")[0] ||
    "User";
  const avatarUrl =
    session.user.user_metadata?.avatar_url ||
    session.user.user_metadata?.picture ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=6366f1&color=fff`;

  // Helper to check if URL is a Google avatar
  const isGoogleAvatar = (url?: string) =>
    !!url && url.includes("googleusercontent.com");

  return (
    <div className="relative flex items-center flex-shrink-0" ref={dropdownRef}>
      {/* User Profile with Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 hover:border-slate-700 transition-all duration-200 cursor-pointer group/user"
        >
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-6 w-6 sm:h-7 sm:w-7 rounded-full border-2 border-slate-700 object-cover transition-transform duration-200 group-hover/user:scale-110 flex-shrink-0"
            referrerPolicy={isGoogleAvatar(avatarUrl) ? "no-referrer" : undefined}
            crossOrigin="anonymous"
          />
          <span className="text-xs sm:text-sm text-white hidden md:inline font-medium truncate max-w-[90px]">
            {displayName}
          </span>
          <ChevronDown 
            size={12}
            className="w-3 h-3 sm:w-[13px] sm:h-[13px] text-slate-400 transition-transform duration-200 flex-shrink-0"
            strokeWidth={2.5}
            style={{ transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div 
            className="absolute right-0 top-full mt-2 w-56 sm:w-64 bg-slate-900 border border-slate-800 rounded-xl z-50 overflow-hidden"
            style={{
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div className="py-2">
              {/* Wallet Address Section */}
              {walletAddress && (
                <div className="px-4 pt-4 pb-3 border-b border-slate-800">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs text-slate-500 font-normal uppercase tracking-wider">Wallet Address</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-950/50 px-3 py-2 rounded-lg border border-slate-800">
                    <p className="text-xs font-mono text-slate-300 flex-1 font-semibold">
                      {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                    </p>
                    <button
                      onClick={copyWalletAddress}
                      className="p-1.5 hover:bg-slate-800 rounded transition-all duration-200 flex-shrink-0"
                      title={copied ? "Copied!" : "Copy address"}
                    >
                      {copied ? (
                        <Check size={14} className="text-green-400" />
                      ) : (
                        <Copy size={14} className="text-slate-400 hover:text-blue-400" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Menu Items */}
              <div className="py-1">
                {userData?.username && (
                  <Link
                    href={`/profile/${userData.username}`}
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800 transition-colors duration-200 font-normal"
                  >
                    <User size={16} className="text-blue-400" />
                    <span>Profile</span>
                  </Link>
                )}
                <Link
                  href="/settings"
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800 transition-colors duration-200 font-normal"
                >
                  <Settings size={16} className="text-blue-400" />
                  <span>Settings</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-900/20 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-normal"
                >
                  {signingOut ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-red-400"
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
                      <span>Signing out...</span>
                    </>
                  ) : (
                    <>
                      <LogOut size={16} />
                      <span>Sign Out</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
