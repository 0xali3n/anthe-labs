"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentUser, updateCurrentUser } from "@/lib/usersApi";
import { AbortError } from "@/lib/apiClient";
import { getAvatars, type Avatar } from "@/lib/avatarsApi";
import { formatWalletAddress } from "@/lib/walletsApi";
import { connectTwitter, disconnectTwitter } from "@/lib/twitterApi";
import { X, CheckCircle, AlertCircle, Image, Copy, Check } from "lucide-react";

interface UserData {
  id: string;
  email: string;
  full_name?: string;
  display_name?: string;
  username?: string;
  avatar_url?: string; // Original Google photo
  selected_avatar_url?: string; // User's chosen avatar
  avatar_source?: "google" | "custom"; // Which avatar is selected
  bio?: string;
  wallet_address?: string;
  twitter_username?: string;
  twitter_connected?: boolean;
  twitter_user_id?: string;
}

export default function Settings() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connectingTwitter, setConnectingTwitter] = useState(false);
  const [disconnectingTwitter, setDisconnectingTwitter] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);

  // Editable fields
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Track original values to detect changes
  const [originalDisplayName, setOriginalDisplayName] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [originalAvatarUrl, setOriginalAvatarUrl] = useState<string | null>(
    null
  );
  const [originalAvatarSource, setOriginalAvatarSource] = useState<
    "google" | "custom" | null
  >(null);

  // Avatar selection
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null>(
    null
  );
  const [selectedAvatarSource, setSelectedAvatarSource] = useState<
    "google" | "custom" | null
  >(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const previousPathnameRef = useRef<string | null>(null);

  // Load user data when navigating to /settings
  useEffect(() => {
    const isOnSettingsPage = pathname === "/settings";
    const wasOnSettingsPage = previousPathnameRef.current === "/settings";
    const justNavigatedToSettings = isOnSettingsPage && !wasOnSettingsPage;

    // Update previous pathname
    previousPathnameRef.current = pathname;

    // Reset state when leaving settings page
    if (!isOnSettingsPage) {
      setUser(null);
      setLoading(true);
      setError(null);
      isLoadingRef.current = false;
      return;
    }

    // Always load when navigating to settings page
    // If we just navigated here, reset the loading flag to force a fresh load
    if (justNavigatedToSettings) {
      isLoadingRef.current = false;
      setUser(null); // Clear user data to force reload
      setLoading(true);
      setError(null);
    }

    // Prevent duplicate concurrent loads
    if (isLoadingRef.current) {
      console.log("[Settings] Already loading, skipping duplicate load");
      return;
    }

    // If we already have user data and didn't just navigate here, don't reload
    if (user && !justNavigatedToSettings) {
      console.log("[Settings] User data already loaded, skipping reload");
      return;
    }

    let mounted = true;
    const abortController = new AbortController();
    isLoadingRef.current = true;

    async function loadUser() {
      console.log("[Settings] Starting to load user data...");
      setLoading(true);
      setError(null);

      try {
        // Wait for Supabase session to be ready
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!mounted || abortController.signal.aborted) {
          console.log("[Settings] Load aborted (unmounted or cancelled)");
          isLoadingRef.current = false;
          return;
        }

        if (sessionError) {
          console.error("[Settings] Session error:", sessionError);
          isLoadingRef.current = false;
          if (mounted) {
            setError("Failed to get session. Please try again.");
            setLoading(false);
          }
          return;
        }

        if (!session?.access_token) {
          console.log("[Settings] No session, redirecting to home");
          isLoadingRef.current = false;
          if (mounted) {
            router.push("/");
          }
          return;
        }

        console.log("[Settings] Session found, fetching user data...");
        const userData = await getCurrentUser(abortController.signal);

        if (!mounted || abortController.signal.aborted) {
          console.log("[Settings] Load aborted after fetch");
          isLoadingRef.current = false;
          return;
        }

        console.log("[Settings] User data loaded successfully");
        setUser(userData);
        const initialDisplayName =
          userData.display_name || userData.full_name || "";
        const initialUsername = userData.username || "";
        const initialAvatarUrl =
          userData.selected_avatar_url || userData.avatar_url || null;
        const initialAvatarSource = userData.avatar_source || null;

        setDisplayName(initialDisplayName);
        setUsername(initialUsername);
        setOriginalDisplayName(initialDisplayName);
        setOriginalUsername(initialUsername);
        setSelectedAvatarUrl(initialAvatarUrl);
        setSelectedAvatarSource(initialAvatarSource);
        setOriginalAvatarUrl(initialAvatarUrl);
        setOriginalAvatarSource(initialAvatarSource);
        setAvatarFailed(false);
        setLoading(false);
        isLoadingRef.current = false;
      } catch (error: any) {
        isLoadingRef.current = false;

        // Silently handle abort errors (intentional cancellation)
        if (
          error instanceof AbortError ||
          error.message === "Request aborted" ||
          error.name === "AbortError"
        ) {
          console.log("[Settings] Request aborted (intentional)");
          return;
        }

        if (!mounted) {
          return;
        }

        if (
          error.message?.includes("No session") ||
          error.message?.includes("Unauthorized") ||
          error.message?.includes("401")
        ) {
          console.log("[Settings] Unauthorized, redirecting to home");
          router.push("/");
          return;
        }

        console.error("[Settings] Failed to load user data:", error);
        setError(error.message || "Failed to load user data");
        setLoading(false);
      } finally {
        // Ensure loading state is always cleared, even if something unexpected happens
        if (mounted && !abortController.signal.aborted) {
          isLoadingRef.current = false;
        }
      }
    }

    // Wait for router to be ready, then load user
    // Use immediate execution but ensure session check happens properly
    loadUser();

    return () => {
      mounted = false;
      isLoadingRef.current = false;
      // Only abort if not already aborted
      if (!abortController.signal.aborted) {
        abortController.abort();
      }
    };
  }, [pathname, router]);

  // Close modal when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        showAvatarPicker
      ) {
        setShowAvatarPicker(false);
      }
    }

    // Close on Escape key
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && showAvatarPicker) {
        setShowAvatarPicker(false);
      }
    }

    if (showAvatarPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [showAvatarPicker]);

  // Load avatars when avatar picker is opened
  useEffect(() => {
    async function loadAvatars() {
      if (!showAvatarPicker || avatars.length > 0) return;

      try {
        setLoadingAvatars(true);
        const avatarsList = await getAvatars();
        setAvatars(avatarsList);
      } catch (error) {
        console.error("Failed to load avatars:", error);
      } finally {
        setLoadingAvatars(false);
      }
    }

    loadAvatars();
  }, [showAvatarPicker, avatars.length]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    // Validate username format (alphanumeric and underscore only)
    if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
      setError("Username can only contain letters, numbers, and underscores");
      setSaving(false);
      return;
    }

    try {
      const updateData: any = {
        display_name: displayName || undefined,
        username: username || undefined,
      };

      // Include selected_avatar_url and avatar_source if changed
      if (selectedAvatarUrl && selectedAvatarSource && user) {
        // Only update if avatar actually changed
        const currentUrl = user.selected_avatar_url || user.avatar_url;
        const currentSource =
          user.avatar_source ||
          (user.selected_avatar_url === user.avatar_url ? "google" : "custom");

        if (
          selectedAvatarUrl !== currentUrl ||
          selectedAvatarSource !== currentSource
        ) {
          updateData.selected_avatar_url = selectedAvatarUrl;
          updateData.avatar_source = selectedAvatarSource;
        }
      }

      const updatedUser = await updateCurrentUser(updateData);

      // Update original values to match new saved values
      const newDisplayName =
        updatedUser.display_name || updatedUser.full_name || "";
      const newUsername = updatedUser.username || "";
      const newAvatarUrl =
        updatedUser.selected_avatar_url || updatedUser.avatar_url || null;
      const newAvatarSource = updatedUser.avatar_source || null;

      setUser(updatedUser);
      setDisplayName(newDisplayName);
      setUsername(newUsername);
      setOriginalDisplayName(newDisplayName);
      setOriginalUsername(newUsername);
      setSelectedAvatarUrl(newAvatarUrl);
      setSelectedAvatarSource(newAvatarSource);
      setOriginalAvatarUrl(newAvatarUrl);
      setOriginalAvatarSource(newAvatarSource);
      setIsEditing(false);
      setShowAvatarPicker(false);
      setSuccess(true);
      setSaveSuccessToast(true);
      setTimeout(() => {
        setSuccess(false);
        setSaveSuccessToast(false);
      }, 3000);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to update profile";
      setError(
        errorMessage.includes("already taken")
          ? "Username is already taken"
          : errorMessage
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSelect = async (
    avatarUrl: string,
    source: "google" | "custom"
  ) => {
    setSelectedAvatarUrl(avatarUrl);
    setSelectedAvatarSource(source);
    setAvatarFailed(false); // Reset error state for new selection
    setShowAvatarPicker(false);
  };

  const handleCancel = () => {
    if (user) {
      setDisplayName(originalDisplayName);
      setUsername(originalUsername);
      setSelectedAvatarUrl(originalAvatarUrl);
      setSelectedAvatarSource(originalAvatarSource);
      setAvatarFailed(false);
    }
    setIsEditing(false);
    setShowAvatarPicker(false);
    setError(null);
    setSuccess(false);
    setSaveSuccessToast(false);
  };

  // Check if form has changes
  const hasChanges = () => {
    if (!user) return false;
    const currentAvatarUrl =
      selectedAvatarUrl || user.selected_avatar_url || user.avatar_url;
    const currentAvatarSource =
      selectedAvatarSource ||
      user.avatar_source ||
      (user.selected_avatar_url === user.avatar_url ? "google" : "custom");

    return (
      displayName !== originalDisplayName ||
      username !== originalUsername ||
      currentAvatarUrl !== originalAvatarUrl ||
      currentAvatarSource !== originalAvatarSource
    );
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.push("/");
    } catch (error) {
      console.error("Sign out error:", error);
      setSigningOut(false);
      setShowSignOutModal(false);
    }
  };

  const handleSignOutClick = () => {
    setShowSignOutModal(true);
  };

  const handleConnectTwitter = async () => {
    try {
      setConnectingTwitter(true);
      setError(null);
      const result = await connectTwitter();
      if (result.success) {
        // Reload user data to get updated Twitter info
        const userData = await getCurrentUser();
        setUser(userData);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (error: any) {
      console.error("Twitter connect error:", error);
      setError(error.message || "Failed to connect Twitter");
    } finally {
      setConnectingTwitter(false);
    }
  };

  const handleDisconnectTwitter = async () => {
    try {
      setDisconnectingTwitter(true);
      setError(null);
      await disconnectTwitter();
      // Reload user data
      const userData = await getCurrentUser();
      setUser(userData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      console.error("Twitter disconnect error:", error);
      setError(error.message || "Failed to disconnect Twitter");
    } finally {
      setDisconnectingTwitter(false);
    }
  };

  // Skeleton Loading Component
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-10 w-48 bg-slate-800/50 rounded-xl animate-pulse mb-3"></div>
          <div className="h-5 w-64 bg-slate-800/30 rounded-lg animate-pulse"></div>
        </div>

        {/* Profile Section Skeleton */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 mb-6">
          <div className="flex items-center gap-6">
            {/* Avatar Skeleton */}
            <div className="h-28 w-28 rounded-full bg-slate-800/50 animate-pulse"></div>

            {/* Name & Info Skeleton */}
            <div className="flex-1 space-y-3">
              <div className="h-8 w-48 bg-slate-800/50 rounded-lg animate-pulse"></div>
              <div className="h-5 w-32 bg-slate-800/30 rounded-lg animate-pulse"></div>
              <div className="h-10 w-40 bg-slate-800/30 rounded-xl animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Account Details Skeleton */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mb-6">
          <div className="h-6 w-40 bg-slate-800/50 rounded-lg animate-pulse mb-6"></div>
          <div className="space-y-3">
            <div className="h-20 bg-slate-800/30 rounded-xl animate-pulse"></div>
            <div className="h-20 bg-slate-800/30 rounded-xl animate-pulse"></div>
          </div>
        </div>

        {/* Logout Button Skeleton */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="h-12 bg-slate-800/30 rounded-xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Helper to check if URL is a Google avatar
  const isGoogleAvatar = (url?: string) =>
    !!url && url.includes("googleusercontent.com");

  // Primary avatar URL (user's selected or original)
  const primaryAvatarUrl =
    selectedAvatarUrl || user.selected_avatar_url || user.avatar_url;

  // Fallback URL (initials)
  const fallbackAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || user.email?.split("@")[0] || "User")}&background=6366f1&color=fff`;

  // Use fallback only if primary failed
  const avatarUrl = avatarFailed
    ? fallbackAvatarUrl
    : primaryAvatarUrl || fallbackAvatarUrl;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">
          Settings
        </h1>
        <p className="text-slate-400 text-base sm:text-lg">
          Manage your account details and preferences
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-900/20 border border-green-500/50 rounded-xl flex items-center gap-3 backdrop-blur-sm">
          <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
          <p className="text-green-400 font-medium">
            Profile updated successfully!
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-xl flex items-center gap-3 backdrop-blur-sm">
          <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
          <p className="text-red-400 font-medium">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Profile Section */}
        <div
          className="relative bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm"
          style={{ boxShadow: "0 6px 18px rgba(2,8,20,0.45)" }}
        >
          {/* Top-right action area: Edit OR Save/Cancel */}
          <div className="absolute top-6 right-6 flex items-center gap-3">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                aria-label="Edit profile"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="text-sm font-semibold">Edit Profile</span>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                {/* Save button - disabled until changes */}
                <button
                  onClick={handleSave}
                  disabled={saving || !hasChanges()}
                  aria-label="Save changes"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {saving ? (
                    <svg
                      className="animate-spin h-5 w-5"
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
                  ) : null}
                  <span className="text-sm font-semibold">Save</span>
                </button>

                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all duration-200 border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                  aria-label="Cancel editing"
                >
                  <X size={18} />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-6 pl-2">
            <div className="relative">
              <div className="relative">
                <img
                  src={avatarUrl}
                  alt={displayName || "User"}
                  className="h-24 w-24 sm:h-28 sm:w-28 rounded-full border-2 border-blue-500 object-cover shadow-lg transition-all"
                  loading="lazy"
                  referrerPolicy={
                    isGoogleAvatar(avatarUrl) ? "no-referrer" : undefined
                  }
                  crossOrigin="anonymous"
                  onError={() => {
                    if (
                      !avatarFailed &&
                      primaryAvatarUrl &&
                      avatarUrl === primaryAvatarUrl
                    ) {
                      setAvatarFailed(true);
                    }
                  }}
                />
                {isEditing && (
                  <button
                    onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                    className="absolute -bottom-1 -right-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg border-2 border-slate-900 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                    title="Change profile picture"
                    aria-label="Change profile picture"
                  >
                    <Image size={16} />
                  </button>
                )}
              </div>
              {saving && (
                <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-2 z-10">
                  <svg
                    className="animate-spin h-4 w-4 text-white"
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
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-4 mb-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1 break-words">
                    {displayName || user.email?.split("@")[0] || "User"}
                  </h2>
                  {username ? (
                    <p className="text-blue-400 font-mono text-sm sm:text-base break-all">
                      @{username}
                    </p>
                  ) : (
                    <p className="text-slate-500 text-sm">No username set</p>
                  )}
                </div>
              </div>

              {/* Twitter Connection (kept inside main flow) */}
              <div className="flex items-center gap-3 flex-wrap">
                {user.twitter_connected && user.twitter_username ? (
                  <div className="flex items-center gap-2 group">
                    <a
                      href={`https://twitter.com/${user.twitter_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-5 py-2.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl transition-all font-medium shadow-lg shadow-slate-900/20 hover:shadow-slate-900/30"
                    >
                      <span>@{user.twitter_username}</span>
                    </a>
                    <button
                      onClick={handleDisconnectTwitter}
                      disabled={disconnectingTwitter}
                      className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-red-600/10 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100"
                      title="Disconnect Twitter"
                    >
                      {disconnectingTwitter ? (
                        <svg
                          className="animate-spin h-4 w-4"
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
                        <X size={18} />
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleConnectTwitter}
                    disabled={connectingTwitter}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-900/20 hover:shadow-slate-900/30"
                  >
                    {connectingTwitter ? (
                      <>
                        <svg
                          className="animate-spin h-5 w-5"
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
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <span>Connect Twitter</span>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Editable Fields - Only shown when editing */}
          {isEditing && (
            <div className="mt-8 pt-8 border-t border-slate-800 space-y-6">
              {/* Display Name */}
              <div>
                <label
                  htmlFor="display-name"
                  className="block text-sm font-semibold text-slate-300 mb-2.5"
                >
                  Display Name
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  Display name shown to other users
                </p>
                <input
                  id="display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  aria-describedby="display-name-help"
                />
                <p id="display-name-help" className="sr-only">
                  Display name shown to other users
                </p>
              </div>

              {/* Username */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-semibold text-slate-300 mb-2.5"
                >
                  Username
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  Must be unique. Only letters, numbers, and underscores
                  allowed.
                </p>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) =>
                    setUsername(
                      e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")
                    )
                  }
                  placeholder="Choose a username"
                  maxLength={30}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
                  aria-describedby="username-help"
                />
                <p id="username-help" className="sr-only">
                  Username must be unique and contain only letters, numbers, and
                  underscores
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Avatar Picker Modal */}
        {showAvatarPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div
              ref={modalRef}
              className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden transform transition-all"
              style={{
                animation: "modalSlideIn 0.2s ease-out",
              }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-900/50">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    Choose Profile Picture
                  </h3>
                  <p className="text-sm text-slate-400">
                    Select your Google photo or a custom avatar
                  </p>
                </div>
                <button
                  onClick={() => setShowAvatarPicker(false)}
                  className="p-2 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-slate-200"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] custom-scrollbar">
                {/* Google Photo Option */}
                {user?.avatar_url && (
                  <div className="mb-8">
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                        Your Google Photo
                      </p>
                    </div>
                    <div className="flex justify-center">
                      <button
                        onClick={() =>
                          handleAvatarSelect(user.avatar_url!, "google")
                        }
                        className={`relative w-32 h-32 rounded-2xl overflow-hidden border-2 transition-all duration-200 group ${
                          user.avatar_source === "google" ||
                          (!user.avatar_source &&
                            selectedAvatarUrl === user.avatar_url)
                            ? "border-blue-500 ring-4 ring-blue-500/30 shadow-xl shadow-blue-500/30 scale-105"
                            : "border-slate-700 hover:border-blue-400 hover:shadow-xl hover:scale-105"
                        }`}
                      >
                        <img
                          src={user.avatar_url}
                          alt="Google Photo"
                          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            // Hide broken image and show placeholder
                            (e.target as HTMLImageElement).style.display =
                              "none";
                            const parent = (e.target as HTMLImageElement)
                              .parentElement;
                            if (
                              parent &&
                              !parent.querySelector(".avatar-error-placeholder")
                            ) {
                              const placeholder = document.createElement("div");
                              placeholder.className =
                                "avatar-error-placeholder w-full h-full bg-slate-800 flex items-center justify-center text-slate-500";
                              placeholder.textContent = "Failed to load";
                              parent.appendChild(placeholder);
                            }
                          }}
                        />
                        {(user.avatar_source === "google" ||
                          (!user.avatar_source &&
                            selectedAvatarUrl === user.avatar_url)) && (
                          <div className="absolute inset-0 bg-blue-500/30 flex items-center justify-center">
                            <div className="bg-blue-500 rounded-full p-2.5 shadow-lg">
                              <CheckCircle size={20} className="text-white" />
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-3">
                          <p className="text-xs text-white font-bold text-center">
                            Google Photo
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Custom Avatars */}
                {loadingAvatars ? (
                  <div>
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                        Custom Avatars
                      </p>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4">
                      {[...Array(6)].map((_, i) => (
                        <div
                          key={i}
                          className="aspect-square bg-slate-800/50 rounded-xl animate-pulse"
                        />
                      ))}
                    </div>
                  </div>
                ) : avatars.length > 0 ? (
                  <div>
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                        Custom Avatars
                      </p>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4">
                      {avatars.map((avatar) => {
                        const isSelected =
                          user?.avatar_source === "custom" &&
                          selectedAvatarUrl === avatar.url;
                        return (
                          <button
                            key={avatar.name}
                            onClick={() =>
                              handleAvatarSelect(avatar.url, "custom")
                            }
                            className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 group ${
                              isSelected
                                ? "border-blue-500 ring-4 ring-blue-500/30 shadow-xl shadow-blue-500/30 scale-105"
                                : "border-slate-700 hover:border-blue-400 hover:shadow-xl hover:scale-105"
                            }`}
                          >
                            <img
                              src={avatar.url}
                              alt={avatar.name}
                              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                              onError={(e) => {
                                // Hide broken image and show placeholder
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                                const parent = (e.target as HTMLImageElement)
                                  .parentElement;
                                if (
                                  parent &&
                                  !parent.querySelector(
                                    ".avatar-error-placeholder"
                                  )
                                ) {
                                  const placeholder =
                                    document.createElement("div");
                                  placeholder.className =
                                    "avatar-error-placeholder w-full h-full bg-slate-800 flex items-center justify-center text-slate-500 text-xs";
                                  placeholder.textContent = "Error";
                                  parent.appendChild(placeholder);
                                }
                              }}
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-blue-500/30 flex items-center justify-center">
                                <div className="bg-blue-500 rounded-full p-2 shadow-lg">
                                  <CheckCircle
                                    size={18}
                                    className="text-white"
                                  />
                                </div>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="p-4 bg-slate-800/50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                      <Image size={40} className="text-slate-600" />
                    </div>
                    <p className="text-slate-400 text-base font-medium mb-2">
                      No custom avatars available
                    </p>
                    <p className="text-slate-600 text-sm">
                      Contact administrator to add avatars
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Account Details */}
        <div
          className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm"
          style={{ boxShadow: "0 6px 18px rgba(2,8,20,0.45)" }}
        >
          <h2 className="text-xl font-semibold text-white mb-6">
            Account Details
          </h2>
          <div className="space-y-3">
            {/* Email */}
            <div className="p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800/70 transition-all border border-slate-800/50">
              <p className="text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wide">
                Email Address
              </p>
              <p className="text-slate-100 font-medium break-all">
                {user.email}
              </p>
            </div>

            {/* Wallet Address */}
            {user.wallet_address && (
              <div className="p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800/70 transition-all border border-slate-800/50">
                <p className="text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wide">
                  Wallet Address
                </p>
                <div className="flex items-center gap-3">
                  <p className="text-slate-100 font-mono text-sm break-all flex-1">
                    {user.wallet_address}
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          user.wallet_address!
                        );
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      } catch (error) {
                        console.error("Failed to copy:", error);
                        setError("Failed to copy address to clipboard");
                      }
                    }}
                    className="p-2.5 hover:bg-slate-700 rounded-lg transition-all duration-200 flex-shrink-0 border border-slate-700 hover:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                    title={copied ? "Copied!" : "Copy wallet address"}
                    aria-label={copied ? "Copied!" : "Copy wallet address"}
                  >
                    {copied ? (
                      <Check size={18} className="text-green-400" />
                    ) : (
                      <Copy
                        size={18}
                        className="text-slate-400 hover:text-blue-400 transition-colors"
                      />
                    )}
                  </button>
                </div>
                {/* Copy Toast */}
                {copied && (
                  <div
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                    className="fixed top-20 right-4 px-3 py-2 bg-green-900/90 border border-green-500/50 rounded-lg text-green-400 text-sm font-medium shadow-lg z-50"
                  >
                    Copied!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <div
          className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm"
          style={{ boxShadow: "0 6px 18px rgba(2,8,20,0.45)" }}
        >
          <button
            onClick={handleSignOutClick}
            disabled={signingOut}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            {signingOut ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
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
              <span>Sign Out</span>
            )}
          </button>
        </div>
      </div>

      {/* Sign Out Confirmation Modal */}
      {showSignOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-white mb-2">Sign Out</h3>
            <p className="text-slate-400 mb-6">
              Are you sure you want to sign out? You'll need to sign in again to
              access your account.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowSignOutModal(false)}
                disabled={signingOut}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                {signingOut ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
