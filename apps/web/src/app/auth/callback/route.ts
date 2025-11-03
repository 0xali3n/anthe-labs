import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");

  // Redirect to home - Supabase will automatically detect and exchange the code
  // because detectSessionInUrl is enabled in the client config
  if (code) {
    // Pass code in URL so Supabase can detect it
    const redirectUrl = new URL("/", origin);
    redirectUrl.searchParams.set("code", code);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.redirect(new URL("/", origin));
}
