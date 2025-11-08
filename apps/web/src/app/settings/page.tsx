"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentUser, updateCurrentUser } from "@/lib/usersApi";
import { getAvatars, type Avatar } from "@/lib/avatarsApi";
import { formatWalletAddress } from "@/lib/walletsApi";
import { connectTwitter, disconnectTwitter } from "@/lib/twitterApi";
import {
  LogOut,
  Mail,
  Wallet,
  User,
  Edit2,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Image,
  Copy,
  Check,
  Twitter,
  Link2,
  Info,
} from "lucide-react";

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
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connectingTwitter, setConnectingTwitter] = useState(false);
  const [disconnectingTwitter, setDisconnectingTwitter] = useState(false);

  // Editable fields
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Avatar selection
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null>(
    null
  );
  const modalRef = useRef<HTMLDivElement>(null);

  // kept for compatibility (not used for hover tooltip)
  const [showUsernameInfo, setShowUsernameInfo] = useState(false);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    async function loadUser() {
      try {
        // Check if user is authenticated first
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          router.push("/");
          return;
        }

        setLoading(true);
        setError(null);

        // Add timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.warn("User loading taking too long...");
            setError(
              "Loading is taking longer than expected. Please refresh the page."
            );
            setLoading(false);
          }
        }, 8000); // 8 second timeout

        console.log("🔄 Fetching user data...");
        const userData = await getCurrentUser();
        console.log("✅ User data received:", userData);

        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (!mounted) {
          console.log("⚠️ Component unmounted, skipping state update");
          return;
        }

        console.log("📝 Updating state with user data");
        setUser(userData);
        setDisplayName(userData.display_name || userData.full_name || "");
        setUsername(userData.username || "");
        // Use selected_avatar_url if available, otherwise fallback to avatar_url
        setSelectedAvatarUrl(
          userData.selected_avatar_url || userData.avatar_url || null
        );
        console.log("✅ State updated, setting loading to false");
      } catch (error: any) {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        console.error("Failed to load user:", error);

        // If it's an auth error, redirect to home
        if (
          error.message?.includes("No session") ||
          error.message?.includes("Unauthorized")
        ) {
          router.push("/");
          return;
        }

        // Show error but don't block - allow user to see the page
        setError(
          error.message || "Failed to load user data. Please refresh the page."
        );
      } finally {
        if (mounted) {
          console.log("🏁 Finally block: setting loading to false");
          setLoading(false);
        } else {
          console.log("⚠️ Component unmounted, not updating loading state");
        }
      }
    }

    loadUser();
    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

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
      if (selectedAvatarUrl && user) {
        const currentSource =
          user.avatar_source ||
          (user.selected_avatar_url === user.avatar_url ? "google" : "custom");
        updateData.selected_avatar_url = selectedAvatarUrl;
        updateData.avatar_source =
          selectedAvatarUrl === user.avatar_url ? "google" : "custom";
      }

      const updatedUser = await updateCurrentUser(updateData);

      setUser(updatedUser);
      setIsEditing(false);
      setShowAvatarPicker(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
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
    // Update preview immediately (don't save yet - wait for Save button)
    setSelectedAvatarUrl(avatarUrl);
    setShowAvatarPicker(false);
    // Don't show success message here - only when Save is clicked
  };

  const handleCancel = () => {
    if (user) {
      setDisplayName(user.display_name || user.full_name || "");
      setUsername(user.username || "");
      setSelectedAvatarUrl(user.selected_avatar_url || user.avatar_url || null);
    }
    setIsEditing(false);
    setShowAvatarPicker(false);
    setError(null);
    setSuccess(false);
  };

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

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-zinc-800 rounded"></div>
            <div className="h-4 w-32 bg-zinc-800 rounded"></div>
            <div className="space-y-3 mt-6">
              <div className="h-4 w-full bg-zinc-800 rounded"></div>
              <div className="h-4 w-3/4 bg-zinc-800 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const avatarUrl =
    user.selected_avatar_url ||
    user.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || user.email?.split("@")[0] || "User")}&background=6366f1&color=fff`;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-indigo-400 mb-2">Settings</h1>
        <p className="text-zinc-400">Manage your account details and preferences</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-900/20 border border-green-500/50 rounded-xl flex items-center gap-3 backdrop-blur-sm">
          <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
          <p className="text-green-400 font-medium">Profile updated successfully!</p>
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
        <div className="relative bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 backdrop-blur-sm shadow-lg">
          {/* Top-right action area: Edit OR Save/Cancel */}
          <div className="absolute top-8 right-4 flex items-center gap-3">
            {!isEditing ? (
              // Bigger pill-like button (shape similar to small rounded X connect button but larger)
              <button
                onClick={() => setIsEditing(true)}
                aria-label="Edit profile"
                className="flex items-center gap-2 px-4 py-2 rounded-[14px] bg-gradient-to-r from-[#1E3A8A] via-[#1D4ED8] to-[#3B82F6] text-white shadow-[0_8px_24px_rgba(30,64,175,0.35)] hover:brightness-110 transition transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
>
                <Edit2 size={18} />
                <span className="text-base font-medium">Edit Profile</span>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                {/* Save button matching the same larger style */}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  aria-label="Save changes"
                  className="flex items-center gap-2 px-4 py-2 rounded-[14px] bg-gradient-to-r from-[#1E3A8A] via-[#1D4ED8] to-[#3B82F6] text-white shadow-[0_8px_24px_rgba(30,64,175,0.35)] hover:brightness-110 transition transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <Save size={18} />
                  )}
                  <span className="text-base font-medium">Save</span>
                </button>

                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="w-11 h-11 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-full transition-shadow border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Cancel"
                >
                  <X size={18} />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="relative">
                <img
                  src={selectedAvatarUrl || user?.avatar_url || avatarUrl}
                  alt={displayName || "User"}
                  className="h-28 w-28 rounded-full border-2 border-indigo-500 object-cover shadow-xl transition-all"
                />
                {isEditing && (
                  <button
                    onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                    className="absolute -bottom-1 -right-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-2.5 shadow-lg border-2 border-zinc-900 transition-all hover:scale-110"
                    title="Change profile picture"
                  >
                    <Image size={18} />
                  </button>
                )}
              </div>
              {saving && (
                <div className="absolute -bottom-1 -right-1 bg-indigo-600 rounded-full p-2 z-10">
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                <div>
                  <h2 className="text-3xl font-bold text-zinc-100 mb-1">{displayName || user.email?.split("@")[0] || "User"}</h2>
                  {username ? (
                    <p className="text-indigo-400 font-mono text-base">@{username}</p>
                  ) : (
                    <p className="text-zinc-500 text-sm">No username set</p>
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
                      className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-xl transition-all font-medium shadow-lg shadow-zinc-900/20 hover:shadow-zinc-900/30"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-twitter-x" viewBox="0 0 16 16">
                        <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z" />
                      </svg>
                      <span>@{user.twitter_username}</span>
                    </a>
                    <button
                      onClick={handleDisconnectTwitter}
                      disabled={disconnectingTwitter}
                      className="p-2.5 text-zinc-400 hover:text-red-400 hover:bg-red-600/10 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100"
                      title="Disconnect Twitter"
                    >
                      {disconnectingTwitter ? (
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
                    className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-xl transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-zinc-900/20 hover:shadow-zinc-900/30"
                  >
                    {connectingTwitter ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-twitter-x" viewBox="0 0 16 16">
                          <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z" />
                        </svg>
                        <span>Connect</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Editable Fields - Only shown when editing (kept below header) */}
          {isEditing && (
            <div className="mt-8 pt-8 border-t border-zinc-800 space-y-6">
              {/* Display Name */}
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2.5">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Username */}
              <div>
                {/* Use a group so tooltip appears on hover */}
                <label className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-2.5">
                  <span>Username</span>

                  {/* Info button with hover-only tooltip (no click) */}
                  <div className="relative inline-flex group">
                    <button
                      type="button"
                      aria-label="Username rules"
                      className="p-1 rounded-full hover:bg-zinc-800/60 text-zinc-400"
                    >
                      <Info size={14} />
                    </button>

                    {/* Tooltip: appears to the right on hover */}
                    <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover:block">
                      <div className="rounded-md bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs py-2 px-3 shadow-lg whitespace-nowrap">
                        Only letters, numbers, and underscores allowed
                      </div>
                      <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-zinc-900 border-t border-l border-zinc-700" />
                    </div>
                  </div>
                </label>

                <input
                  type="text"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                  }
                  placeholder="Choose a username"
                  maxLength={30}
                  className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono"
                />
                {/* Tooltip handled by hover above; we do not show text on click */}
              </div>
            </div>
          )}
        </div>

        {/* Avatar Picker Modal */}
        {showAvatarPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div
              ref={modalRef}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden transform transition-all"
              style={{
                animation: "modalSlideIn 0.2s ease-out",
              }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-gradient-to-r from-zinc-900 to-zinc-900/50">
                <div>
                  <h3 className="text-xl font-bold text-zinc-100 mb-1">Choose Profile Picture</h3>
                  <p className="text-sm text-zinc-400">Select your Google photo or a custom avatar</p>
                </div>
                <button
                  onClick={() => setShowAvatarPicker(false)}
                  className="p-2 hover:bg-zinc-800 rounded-xl transition-all text-zinc-400 hover:text-zinc-200"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] custom-scrollbar">
                {/* Google Photo Option */}
                {user?.avatar_url && (
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                        <Image size={16} className="text-indigo-400" />
                      </div>
                      <p className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">Your Google Photo</p>
                    </div>
                    <div className="flex justify-center">
                      <button
                        onClick={() => handleAvatarSelect(user.avatar_url!, "google")}
                        className={`relative w-32 h-32 rounded-2xl overflow-hidden border-2 transition-all duration-200 group ${
                          user.avatar_source === "google" ||
                          (!user.avatar_source &&
                            selectedAvatarUrl === user.avatar_url)
                            ? "border-indigo-500 ring-4 ring-indigo-500/30 shadow-xl shadow-indigo-500/30 scale-105"
                            : "border-zinc-700 hover:border-indigo-400 hover:shadow-xl hover:scale-105"
                        }`}
                      >
                        <img src={user.avatar_url} alt="Google Photo" className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110" />
                        {(user.avatar_source === "google" ||
                          (!user.avatar_source &&
                            selectedAvatarUrl === user.avatar_url)) && (
                          <div className="absolute inset-0 bg-indigo-500/30 flex items-center justify-center">
                            <div className="bg-indigo-500 rounded-full p-2.5 shadow-lg">
                              <CheckCircle size={20} className="text-white" />
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-3">
                          <p className="text-xs text-white font-bold text-center">Google Photo</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Custom Avatars */}
                {loadingAvatars ? (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                        <Image size={16} className="text-indigo-400" />
                      </div>
                      <p className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">Custom Avatars</p>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="aspect-square bg-zinc-800/50 rounded-xl animate-pulse" />
                      ))}
                    </div>
                  </div>
                ) : avatars.length > 0 ? (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                        <Image size={16} className="text-indigo-400" />
                      </div>
                      <p className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">Custom Avatars</p>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4">
                      {avatars.map((avatar) => {
                        const isSelected =
                          user?.avatar_source === "custom" &&
                          selectedAvatarUrl === avatar.url;
                        return (
                          <button
                            key={avatar.name}
                            onClick={() => handleAvatarSelect(avatar.url, "custom")}
                            className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 group ${
                              isSelected
                                ? "border-indigo-500 ring-4 ring-indigo-500/30 shadow-xl shadow-indigo-500/30 scale-105"
                                : "border-zinc-700 hover:border-indigo-400 hover:shadow-xl hover:scale-105"
                            }`}
                          >
                            <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110" />
                            {isSelected && (
                              <div className="absolute inset-0 bg-indigo-500/30 flex items-center justify-center">
                                <div className="bg-indigo-500 rounded-full p-2 shadow-lg">
                                  <CheckCircle size={18} className="text-white" />
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
                    <div className="p-4 bg-zinc-800/50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                      <Image size={40} className="text-zinc-600" />
                    </div>
                    <p className="text-zinc-400 text-base font-medium mb-2">No custom avatars available</p>
                    <p className="text-zinc-600 text-sm">Contact administrator to add avatars</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Account Details */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
              <User size={20} className="text-indigo-400" />
            </div>
            <h2 className="text-xl font-semibold text-zinc-100">Account Details</h2>
          </div>
          <div className="space-y-3">
            {/* Email */}
            <div className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-xl hover:bg-zinc-800/70 transition-all border border-zinc-800/50">
              <div className="p-2.5 bg-indigo-500/20 rounded-lg border border-indigo-500/30 flex-shrink-0">
                <Mail size={18} className="text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-500 mb-1.5 font-medium uppercase tracking-wide">Email Address</p>
                <p className="text-zinc-100 font-medium break-all">{user.email}</p>
              </div>
            </div>

            {/* Wallet Address */}
            {user.wallet_address && (
              <div className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-xl hover:bg-zinc-800/70 transition-all border border-zinc-800/50">
                <div className="p-2.5 bg-indigo-500/20 rounded-lg border border-indigo-500/30 flex-shrink-0">
                  <Wallet size={18} className="text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-500 mb-1.5 font-medium uppercase tracking-wide">Wallet Address</p>
                  <div className="flex items-center gap-3">
                    <p className="text-zinc-100 font-mono text-sm break-all">{user.wallet_address}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(user.wallet_address!);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="ml-auto p-2.5 hover:bg-zinc-700 rounded-lg transition-all flex-shrink-0 border border-zinc-700 hover:border-indigo-500/50"
                      title={copied ? "Copied!" : "Copy wallet address"}
                    >
                      {copied ? (
                        <Check size={18} className="text-green-400" />
                      ) : (
                        <Copy size={18} className="text-zinc-400 hover:text-indigo-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm shadow-lg">
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-red-500/10 hover:shadow-red-500/20"
          >
            {signingOut ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Signing out...</span>
              </>
            ) : (
              <>
                <LogOut size={18} />
                <span>Sign Out</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
