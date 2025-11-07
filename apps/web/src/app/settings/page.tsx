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
} from "lucide-react";

interface UserData {
  id: string;
  email: string;
  full_name?: string;
  display_name?: string;
  username?: string;
  avatar_url?: string;
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
    async function loadUser() {
      try {
        setLoading(true);
        const userData = await getCurrentUser();
        if (!mounted) return;

        setUser(userData);
        setDisplayName(userData.display_name || userData.full_name || "");
        setUsername(userData.username || "");
        setSelectedAvatarUrl(userData.avatar_url || null);
      } catch (error) {
        console.error("Failed to load user:", error);
        router.push("/");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadUser();
    return () => {
      mounted = false;
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

      // Always include avatar_url if selected (replaces Google photo)
      if (selectedAvatarUrl) {
        updateData.avatar_url = selectedAvatarUrl;
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

  const handleAvatarSelect = async (avatarUrl: string) => {
    // Update preview immediately
    setSelectedAvatarUrl(avatarUrl);
    setShowAvatarPicker(false);

    // Auto-save avatar selection immediately (replaces Google photo)
    if (user && avatarUrl !== user.avatar_url) {
      try {
        setSaving(true);
        setError(null);
        const updatedUser = await updateCurrentUser({
          avatar_url: avatarUrl,
        });
        setUser(updatedUser);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err: any) {
        console.error("Failed to update avatar:", err);
        setError("Failed to update avatar. Please try again.");
        // Revert to original avatar on error
        setSelectedAvatarUrl(user.avatar_url || null);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleCancel = () => {
    if (user) {
      setDisplayName(user.display_name || user.full_name || "");
      setUsername(user.username || "");
      setSelectedAvatarUrl(user.avatar_url || null);
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
            <div className="relative group">
              <div className="relative">
                <img
                  src={selectedAvatarUrl || avatarUrl}
                  alt={displayName || "User"}
                  className="h-24 w-24 rounded-full border-2 border-indigo-500 object-cover shadow-xl transition-all group-hover:border-indigo-400 group-hover:shadow-indigo-500/50 group-hover:scale-105"
                />
                {isEditing && (
                  <button
                    onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                    className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                    title="Change avatar"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Image size={22} className="text-white" />
                      <span className="text-xs text-white font-medium">
                        Change
                      </span>
                    </div>
                  </button>
                )}
              </div>
              {saving && (
                <div className="absolute -bottom-1 -right-1 bg-indigo-600 rounded-full p-1.5">
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

            {/* Avatar Picker */}
            {isEditing && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-zinc-300">
                    Profile Picture
                  </label>
                  {!showAvatarPicker && (
                    <button
                      onClick={() => setShowAvatarPicker(true)}
                      className="text-sm text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Image size={14} />
                      Choose Avatar
                    </button>
                  )}
                </div>

                {showAvatarPicker && (
                  <div className="pt-4 border-t border-zinc-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-zinc-200">
                        Select an Avatar
                      </h3>
                      <button
                        onClick={() => setShowAvatarPicker(false)}
                        className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                      >
                        Close
                      </button>
                    </div>

                    {loadingAvatars ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                        {[...Array(6)].map((_, i) => (
                          <div
                            key={i}
                            className="aspect-square bg-zinc-800/50 rounded-xl animate-pulse"
                          />
                        ))}
                      </div>
                    ) : avatars.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                        {avatars.map((avatar) => {
                          const isSelected = selectedAvatarUrl === avatar.url;
                          return (
                            <button
                              key={avatar.name}
                              onClick={() => handleAvatarSelect(avatar.url)}
                              className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 group ${
                                isSelected
                                  ? "border-indigo-500 ring-4 ring-indigo-500/30 shadow-lg shadow-indigo-500/20 scale-105"
                                  : "border-zinc-700 hover:border-indigo-400 hover:scale-105 hover:shadow-lg"
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
                    ) : (
                      <div className="text-center py-8">
                        <Image
                          size={48}
                          className="text-zinc-600 mx-auto mb-3"
                        />
                        <p className="text-zinc-500 text-sm">
                          No avatars available
                        </p>
                        <p className="text-zinc-600 text-xs mt-1">
                          Contact administrator to add avatars
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

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
