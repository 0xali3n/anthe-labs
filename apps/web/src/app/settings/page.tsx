"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentUser, updateCurrentUser } from "@/lib/usersApi";
import { getAvatars, type Avatar } from "@/lib/avatarsApi";
import { formatWalletAddress } from "@/lib/walletsApi";
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

        const userData = await getCurrentUser();

        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (!mounted) return;

        setUser(userData);
        setDisplayName(userData.display_name || userData.full_name || "");
        setUsername(userData.username || "");
        // Use selected_avatar_url if available, otherwise fallback to avatar_url
        setSelectedAvatarUrl(
          userData.selected_avatar_url || userData.avatar_url || null
        );
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
          setLoading(false);
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
  }, [router]);

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
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-indigo-400 mb-2">Settings</h1>
        <p className="text-zinc-400">
          Manage your account details and preferences
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-900/20 border border-green-500/50 rounded-lg flex items-center gap-3">
          <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
          <p className="text-green-400">Profile updated successfully!</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex items-center gap-3">
          <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Profile Section */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 backdrop-blur-sm">
          <div className="flex items-start gap-6 mb-6">
            <div className="relative">
              <div className="relative">
                <img
                  src={selectedAvatarUrl || user?.avatar_url || avatarUrl}
                  alt={displayName || "User"}
                  className="h-24 w-24 rounded-full border-2 border-indigo-500 object-cover shadow-xl transition-all"
                />
                {isEditing && (
                  <button
                    onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                    className="absolute -bottom-1 -right-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-2 shadow-lg border-2 border-zinc-900 transition-all hover:scale-110"
                    title="Change profile picture"
                  >
                    <Image size={16} />
                  </button>
                )}
              </div>
              {saving && (
                <div className="absolute -bottom-1 -right-1 bg-indigo-600 rounded-full p-1.5 z-10">
                  <svg
                    className="animate-spin h-3 w-3 text-white"
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
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-zinc-100 mb-1">
                {displayName || user.email?.split("@")[0] || "User"}
              </h2>
              {username && (
                <p className="text-indigo-400 font-mono text-sm">@{username}</p>
              )}
              {!username && !isEditing && (
                <p className="text-zinc-500 text-sm">No username set</p>
              )}
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all font-medium"
              >
                <Edit2 size={16} />
                Edit Profile
              </button>
            )}
          </div>

          {/* Editable Fields */}
          <div className="space-y-4">
            {/* Avatar Picker - At the top */}
            {isEditing && showAvatarPicker && (
              <div className="mb-6 pb-6 border-b border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-zinc-100 mb-1">
                      Select Profile Picture
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Choose your Google photo or a custom avatar
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAvatarPicker(false)}
                    className="text-zinc-400 hover:text-zinc-200 transition-colors p-1.5 hover:bg-zinc-800 rounded-lg"
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Google Photo Option */}
                {user?.avatar_url && (
                  <div className="mb-6">
                    <p className="text-xs text-zinc-400 mb-3 font-medium uppercase tracking-wide">
                      Your Google Photo
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() =>
                          handleAvatarSelect(user.avatar_url!, "google")
                        }
                        className={`relative w-24 h-24 rounded-xl overflow-hidden border-2 transition-all duration-200 group ${
                          user.avatar_source === "google" ||
                          (!user.avatar_source &&
                            selectedAvatarUrl === user.avatar_url)
                            ? "border-indigo-500 ring-4 ring-indigo-500/30 shadow-lg shadow-indigo-500/20"
                            : "border-zinc-700 hover:border-indigo-400 hover:shadow-lg"
                        }`}
                      >
                        <img
                          src={user.avatar_url}
                          alt="Google Photo"
                          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                        />
                        {(user.avatar_source === "google" ||
                          (!user.avatar_source &&
                            selectedAvatarUrl === user.avatar_url)) && (
                          <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                            <div className="bg-indigo-500 rounded-full p-2">
                              <CheckCircle size={18} className="text-white" />
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-2">
                          <p className="text-[10px] text-white font-semibold text-center">
                            Google
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Custom Avatars */}
                {loadingAvatars ? (
                  <div>
                    <p className="text-xs text-zinc-400 mb-3 font-medium uppercase tracking-wide">
                      Custom Avatars
                    </p>
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                      {[...Array(6)].map((_, i) => (
                        <div
                          key={i}
                          className="aspect-square bg-zinc-800/50 rounded-xl animate-pulse"
                        />
                      ))}
                    </div>
                  </div>
                ) : avatars.length > 0 ? (
                  <div>
                    <p className="text-xs text-zinc-400 mb-3 font-medium uppercase tracking-wide">
                      Custom Avatars
                    </p>
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
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
                                ? "border-indigo-500 ring-4 ring-indigo-500/30 shadow-lg shadow-indigo-500/20"
                                : "border-zinc-700 hover:border-indigo-400 hover:shadow-lg"
                            }`}
                          >
                            <img
                              src={avatar.url}
                              alt={avatar.name}
                              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                                <div className="bg-indigo-500 rounded-full p-1.5">
                                  <CheckCircle
                                    size={16}
                                    className="text-white"
                                  />
                                </div>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Image size={48} className="text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-500 text-sm">
                      No custom avatars available
                    </p>
                    <p className="text-zinc-600 text-xs mt-1">
                      Contact administrator to add avatars
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Display Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              ) : (
                <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
                  <User size={18} className="text-indigo-400 flex-shrink-0" />
                  <p className="text-zinc-200 font-medium">
                    {displayName || "Not set"}
                  </p>
                </div>
              )}
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Username <span className="text-zinc-500 text-xs">(unique)</span>
              </label>
              {isEditing ? (
                <div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) =>
                      setUsername(
                        e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")
                      )
                    }
                    placeholder="Choose a username"
                    maxLength={30}
                    className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono"
                  />
                  <p className="mt-1.5 text-xs text-zinc-500">
                    Only letters, numbers, and underscores allowed
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
                  <User size={18} className="text-indigo-400 flex-shrink-0" />
                  <p className="text-zinc-200 font-mono">
                    {username ? `@${username}` : "Not set"}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex items-center gap-3 pt-4 border-t border-zinc-800">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
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
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Account Details */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-zinc-100 mb-4">
            Account Details
          </h2>
          <div className="space-y-4">
            {/* Email */}
            <div className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800/70 transition-colors">
              <Mail size={18} className="text-indigo-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-500 mb-1">Email Address</p>
                <p className="text-zinc-200 font-medium break-all">
                  {user.email}
                </p>
              </div>
            </div>

            {/* Wallet Address */}
            {user.wallet_address && (
              <div className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800/70 transition-colors">
                <Wallet size={18} className="text-indigo-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-500 mb-1">Wallet Address</p>
                  <div className="flex items-center gap-2">
                    <p className="text-zinc-200 font-mono text-sm break-all">
                      {user.wallet_address}
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(user.wallet_address!);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="ml-auto p-2 hover:bg-zinc-700 rounded-lg transition-all flex-shrink-0"
                      title={copied ? "Copied!" : "Copy wallet address"}
                    >
                      {copied ? (
                        <Check size={16} className="text-green-400" />
                      ) : (
                        <Copy
                          size={16}
                          className="text-zinc-400 hover:text-indigo-400"
                        />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 backdrop-blur-sm">
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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
