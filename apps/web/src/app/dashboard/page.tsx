"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Dashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code");

  useEffect(() => {
    // Exchange code for session if present
    if (code) {
      supabase()
        .auth.exchangeCodeForSession(code)
        .then(({ error }) => {
          if (error) {
            console.error("Error exchanging code:", error);
          }
          // Remove code from URL after exchange
          router.replace("/dashboard");
        });
    }
  }, [code, router]);

  return (
    <section>
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
      <p className="text-zinc-400">
        Leaderboard and quick stats will appear here.
      </p>
    </section>
  );
}
