import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/", origin));
  }

  // Redirect to dashboard with code - client will handle exchange
  const redirectUrl = new URL("/dashboard", origin);
  redirectUrl.searchParams.set("code", code);
  return NextResponse.redirect(redirectUrl);
}
