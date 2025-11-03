"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Settings, LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  useEffect(() => {
    // Get initial session
    supabase()
      .auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user as any);
        }
        setLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase().auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user as any);
      } else {
        setUser(null);
      }
      setLoading(false);
      setSigningOut(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase().auth.signOut();
      router.push("/");
    } catch (error) {
      console.error("Sign out error:", error);
      setSigningOut(false);
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
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-800/50 hover:bg-zinc-800 transition-all cursor-pointer group/user">
        <img
          src={avatarUrl}
          alt={displayName}
          className="h-7 w-7 rounded-full border-2 border-indigo-500 object-cover transition-transform group-hover/user:scale-110"
        />
        <span className="text-sm text-zinc-200 hidden sm:inline font-medium">
          {displayName}
        </span>
      </div>
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="p-2 hover:bg-zinc-800 rounded-md text-zinc-300 hover:text-red-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative group"
        title={signingOut ? "Signing out..." : "Sign Out"}
      >
        {signingOut ? (
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
        ) : (
          <LogOut size={18} />
        )}
      </button>
      <button className="p-2 hover:bg-zinc-800 rounded-md text-zinc-300 hover:text-indigo-400 transition-all">
        <Settings size={18} />
      </button>
    </div>
  );
}
