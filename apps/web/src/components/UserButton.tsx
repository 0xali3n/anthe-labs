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
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase().auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <button className="p-2 hover:bg-zinc-800 rounded-md text-zinc-300 hover:text-indigo-400 transition-all">
        <Settings size={18} />
      </button>
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
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-800/50 hover:bg-zinc-800 transition-all">
        <img
          src={avatarUrl}
          alt={displayName}
          className="h-7 w-7 rounded-full border-2 border-indigo-500"
        />
        <span className="text-sm text-zinc-200 hidden sm:inline">
          {displayName}
        </span>
      </div>
      <button
        onClick={handleSignOut}
        className="p-2 hover:bg-zinc-800 rounded-md text-zinc-300 hover:text-red-400 transition-all"
        title="Sign Out"
      >
        <LogOut size={18} />
      </button>
      <button className="p-2 hover:bg-zinc-800 rounded-md text-zinc-300 hover:text-indigo-400 transition-all">
        <Settings size={18} />
      </button>
    </div>
  );
}
