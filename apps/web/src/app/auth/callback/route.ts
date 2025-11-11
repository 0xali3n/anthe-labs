import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle OAuth errors from Google/Supabase
  if (error) {
    console.error("OAuth error:", error, errorDescription);
    const redirectUrl = new URL("/", origin);
    redirectUrl.searchParams.set(
      "error",
      encodeURIComponent(errorDescription || error)
    );
    return NextResponse.redirect(redirectUrl);
  }

  // If no code, redirect to home
  if (!code) {
    return NextResponse.redirect(new URL("/", origin));
  }

  // SECURITY: Use URL hash (#) instead of query params (?)
  // Hash is not sent to server, not logged, more secure
  // Redirect to home with code in hash - Supabase will detect it automatically
  const redirectUrl = new URL("/", origin);
  // Use hash fragment - more secure than query params
  redirectUrl.hash = `#access_token=&code=${code}`;
  return NextResponse.redirect(redirectUrl);
}
