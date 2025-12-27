"use client";

import { useEffect } from "react";

export default function TwitterCallback() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");
    const success = urlParams.get("twitter_connected");
    const username = urlParams.get("username");

    // Normalize origin to handle both www and non-www versions
    const normalizeOrigin = (origin: string): string => {
      try {
        const url = new URL(origin);
        // Remove www. prefix if present
        if (url.hostname.startsWith('www.')) {
          url.hostname = url.hostname.substring(4);
        }
        return url.origin;
      } catch {
        return origin;
      }
    };

    const frontendUrl = normalizeOrigin(window.location.origin);
    const parentOrigin = window.opener ? normalizeOrigin(window.opener.location.origin) : frontendUrl;

    // If we're in a popup, send message to parent
    if (window.opener) {
      if (error) {
        // Send error to parent window
        window.opener.postMessage(
          {
            type: "TWITTER_OAUTH_ERROR",
            error: decodeURIComponent(error),
          },
          parentOrigin
        );
        setTimeout(() => window.close(), 500);
        return;
      }

      if (success === "true" && username) {
        // Send success to parent window
        window.opener.postMessage(
          {
            type: "TWITTER_OAUTH_SUCCESS",
            username: username,
          },
          parentOrigin
        );
        setTimeout(() => window.close(), 500);
        return;
      }
    } else {
      // If not in popup, redirect to settings
      if (error) {
        window.location.href = `/settings?error=${encodeURIComponent(error)}`;
      } else if (success === "true") {
        window.location.href = `/settings?twitter_connected=true&username=${username}`;
      } else {
        window.location.href = "/settings";
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
        <p className="text-zinc-300 text-lg">Connecting to Twitter...</p>
        <p className="text-zinc-500 text-sm mt-2">Please wait</p>
      </div>
    </div>
  );
}

