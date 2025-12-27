"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Palanquin_Dark, Outfit } from "next/font/google";
import { UserData, getUserByUsername, getAllUsernames } from "@/lib/usersApi";
import {
  Twitter,
  Send,
  Copy,
  Check,
  TrendingUp,
  BarChart3,
  DollarSign,
  Percent,
  Search,
  Calendar,
  Shield,
  Clock,
  Download,
  X,
} from "lucide-react";
import { getTier, TierConfig, TIER_THRESHOLDS } from "@/lib/tiers";
import { generateStatsImage } from "@/lib/generateStatsImage";

const palanquinDark = Palanquin_Dark({
  weight: ["400", "700"],
  subsets: ["latin"],
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

interface UserStats {
  Address: string;
  NumberOfTxns: number;
  TotalVolume: string;
  PNL: string;
  ROI: string;
}

// Data Update Timer Component
function DataUpdateTimer() {
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    const calculateTimeRemaining = () => {
      // Get current time in IST (UTC+5:30)
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const ist = new Date(utc + 5.5 * 3600000);

      const currentMinutes = ist.getMinutes();

      let nextUpdate: Date;

      if (currentMinutes < 40) {
        // Next update is at 40th minute of current hour
        nextUpdate = new Date(ist);
        nextUpdate.setMinutes(40);
        nextUpdate.setSeconds(0);
        nextUpdate.setMilliseconds(0);
      } else {
        // Next update is at 40th minute of next hour
        nextUpdate = new Date(ist);
        nextUpdate.setHours(ist.getHours() + 1);
        nextUpdate.setMinutes(40);
        nextUpdate.setSeconds(0);
        nextUpdate.setMilliseconds(0);
      }

      const diff = nextUpdate.getTime() - ist.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    };

    // Calculate immediately
    calculateTimeRemaining();

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/30 border border-slate-700/50 rounded-lg">
      <Clock size={14} className="text-slate-400" />
      <span className="text-xs text-slate-400">
        Updates in{" "}
        <span className="text-blue-400 font-medium">{timeRemaining}</span>
      </span>
    </div>
  );
}

// Verified Badge Component with Hover Tooltip
function VerifiedBadge({ isVerified }: { isVerified: boolean }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  const updateTooltipPosition = () => {
    if (badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      setTooltipPosition({
        top: rect.top + scrollY + rect.height / 2,
        left: rect.right + scrollX + 12,
      });
    }
  };

  const handleMouseEnter = () => {
    updateTooltipPosition();
    setShowTooltip(true);
  };

  useEffect(() => {
    if (showTooltip) {
      const updatePosition = () => updateTooltipPosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [showTooltip]);

  if (isVerified) {
    return (
      <>
        <div
          ref={badgeRef}
          className="relative inline-block"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div className="flex items-center gap-1 px-2 py-1 bg-[#3B82F6]/10 border border-[#3B82F6]/30 rounded-lg">
            <Shield
              size={12}
              className="sm:w-[14px] sm:h-[14px] text-[#3B82F6]"
            />
            <span className="text-xs text-[#3B82F6] font-medium">Verified</span>
          </div>
        </div>

        {showTooltip && (
          <div
            className="fixed pointer-events-none"
            style={{
              top: `${tooltipPosition.top}px`,
              left: `${tooltipPosition.left}px`,
              transform: "translateY(-50%)",
              zIndex: 99999,
            }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <div
              ref={tooltipRef}
              className="pointer-events-auto w-64 bg-gradient-to-br from-[#0F1419] via-[#0A0D12] to-[#0F1419] border border-white/20 rounded-xl p-4 shadow-2xl backdrop-blur-xl transition-all duration-200"
              style={{
                animation: "tooltipFadeIn 0.2s ease-out",
                boxShadow: `0 20px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
              }}
            >
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-gradient-to-br from-[#0F1419] to-[#0A0D12] border-l border-b border-[#3B82F6]/40 shadow-[-2px_2px_4px_rgba(0,0,0,0.3)]" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={16} className="text-[#3B82F6]" />
                  <h4
                    className={`${palanquinDark.className} text-sm font-bold text-white`}
                  >
                    Verified Account
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Twitter connected with real account, active followers, and
                  verified activity.
                </p>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Unverified badge
  return (
    <>
      <div
        ref={badgeRef}
        className="relative inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="flex items-center gap-1 px-2 py-1 bg-slate-700/20 border border-slate-600/30 rounded-lg">
          <Shield
            size={12}
            className="sm:w-[14px] sm:h-[14px] text-slate-400"
          />
          <span className="text-xs text-slate-400 font-medium">Unverified</span>
        </div>
      </div>

      {showTooltip && (
        <div
          className="fixed pointer-events-none"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: "translateY(-50%)",
            zIndex: 99999,
          }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div
            ref={tooltipRef}
            className="pointer-events-auto w-64 bg-gradient-to-br from-[#0F1419] via-[#0A0D12] to-[#0F1419] border border-white/20 rounded-xl p-4 shadow-2xl backdrop-blur-xl transition-all duration-200"
            style={{
              animation: "tooltipFadeIn 0.2s ease-out",
              boxShadow: `0 20px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(148, 163, 184, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
            }}
          >
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-gradient-to-br from-[#0F1419] to-[#0A0D12] border-l border-b border-slate-500/40 shadow-[-2px_2px_4px_rgba(0,0,0,0.3)]" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={16} className="text-slate-400" />
                <h4
                  className={`${palanquinDark.className} text-sm font-bold text-white`}
                >
                  Unverified
                </h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-2">
                Connect your Twitter account for verification.
              </p>
              <p className="text-xs text-slate-400">
                Go to Settings to connect Twitter.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Volume Tier Badge Component with Hover Tooltip showing all tiers
function VolumeTierBadge({ tier }: { tier: TierConfig }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  const allTiers = TIER_THRESHOLDS.volume;

  // Calculate tooltip position based on badge position
  const updateTooltipPosition = () => {
    if (badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      setTooltipPosition({
        top: rect.top + scrollY + rect.height / 2,
        left: rect.right + scrollX + 12, // 12px spacing
      });
    }
  };

  const handleMouseEnter = () => {
    updateTooltipPosition();
    setShowTooltip(true);
  };

  // Update position on scroll/resize
  useEffect(() => {
    if (showTooltip) {
      const updatePosition = () => updateTooltipPosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [showTooltip]);

  return (
    <>
      <div
        ref={badgeRef}
        className="relative inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Tier Badge */}
        <div
          className="px-3 py-1.5 rounded-lg border font-semibold text-xs cursor-pointer transition-all duration-200 hover:scale-105"
          style={{
            backgroundColor: tier.bgColor,
            borderColor: tier.borderColor,
            color: tier.color,
            boxShadow: `0 2px 8px ${tier.borderColor}40`,
          }}
        >
          {tier.name}
        </div>
      </div>

      {/* Premium Tooltip Popup - Fixed positioning outside container */}
      {showTooltip && (
        <div
          className="fixed pointer-events-none"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: "translateY(-50%)",
            zIndex: 99999,
          }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div
            ref={tooltipRef}
            className="pointer-events-auto w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-gradient-to-br from-[#0F1419] via-[#0A0D12] to-[#0F1419] border border-white/20 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl transition-all duration-200"
            style={{
              animation: "tooltipFadeIn 0.2s ease-out",
              boxShadow: `0 20px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px ${tier.borderColor}30, inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
            }}
          >
            {/* Tooltip Arrow - pointing left */}
            <div
              className="absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45"
              style={{
                background: "linear-gradient(135deg, #0F1419 0%, #0A0D12 100%)",
                borderLeft: `1px solid ${tier.borderColor}40`,
                borderBottom: `1px solid ${tier.borderColor}40`,
                boxShadow: `-2px 2px 4px rgba(0, 0, 0, 0.3)`,
              }}
            />

            {/* Tooltip Content - All Tiers */}
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: tier.color }}
                />
                <h4
                  className={`${palanquinDark.className} text-sm font-bold text-white`}
                >
                  Volume Tiers
                </h4>
              </div>
              <div className="space-y-2">
                {allTiers.map((t) => {
                  const isCurrentTier = t.name === tier.name;
                  const rangeText =
                    t.max === null
                      ? `$${t.min.toLocaleString()}+`
                      : `$${t.min.toLocaleString()} - $${t.max.toLocaleString()}`;

                  return (
                    <div
                      key={t.name}
                      className={`p-3 rounded-xl border transition-all duration-200 ${
                        isCurrentTier
                          ? "ring-2 scale-[1.02]"
                          : "hover:bg-white/5"
                      }`}
                      style={{
                        backgroundColor: isCurrentTier
                          ? `${t.bgColor}80`
                          : "transparent",
                        borderColor: isCurrentTier
                          ? t.borderColor
                          : "rgba(255, 255, 255, 0.08)",
                        boxShadow: isCurrentTier
                          ? `0 4px 12px ${t.borderColor}30`
                          : "none",
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-white/10"
                            style={{ backgroundColor: t.color }}
                          />
                          <span
                            className="text-xs font-bold truncate"
                            style={{ color: t.color }}
                          >
                            {t.name}
                          </span>
                          {isCurrentTier && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-medium whitespace-nowrap">
                              Current
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                          {rangeText}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params?.username as string;
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allUsernames, setAllUsernames] = useState<
    {
      username: string;
      displayName: string;
      avatarUrl: string | null;
      twitterConnected: boolean;
    }[]
  >([]);
  const [filteredUsernames, setFilteredUsernames] = useState<
    {
      username: string;
      displayName: string;
      avatarUrl: string | null;
      twitterConnected: boolean;
    }[]
  >([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Load all usernames on mount
  useEffect(() => {
    async function loadUsernames() {
      const usernames = await getAllUsernames();
      setAllUsernames(usernames);
    }
    loadUsernames();
  }, []);

  // Filter usernames based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsernames([]);
      setShowAutocomplete(false);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = allUsernames.filter(
      (u) =>
        u.username.toLowerCase().includes(query) ||
        u.displayName.toLowerCase().includes(query)
    );
    setFilteredUsernames(filtered.slice(0, 10)); // Limit to 10 results
    setShowAutocomplete(filtered.length > 0);
  }, [searchQuery, allUsernames]);

  // Close autocomplete when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowAutocomplete(false);
      }
    }

    if (showAutocomplete) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAutocomplete]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl);
      }
    };
  }, [previewImageUrl]);

  // Handle ESC key to close preview
  useEffect(() => {
    if (!showImagePreview) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (previewImageUrl) {
          URL.revokeObjectURL(previewImageUrl);
        }
        setPreviewImageUrl(null);
        setShowImagePreview(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showImagePreview, previewImageUrl]);

  useEffect(() => {
    async function fetchData() {
      if (!username) return;

      try {
        const userData = await getUserByUsername(username);
        setUser(userData);

        if (userData.wallet_address) {
          try {
            const statsResponse = await fetch(
              `https://perpetual-leaderboard.kanalabs.io/fetchTopPnlUsers?period=overall&search=${userData.wallet_address}`
            );
            const statsData = await statsResponse.json();

            if (
              statsData?.success &&
              statsData.data &&
              statsData.data.length > 0
            ) {
              setStats(statsData.data[0]);
            }
          } catch (error) {
            console.error("Failed to fetch stats:", error);
          }
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [username]);

  const copyProfileLink = async () => {
    const profileUrl = `${window.location.origin}/profile/${username}`;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  const shareOnTwitter = () => {
    // Format stats values
    const volume = stats?.TotalVolume
      ? `$${parseFloat(stats.TotalVolume).toLocaleString()}`
      : "$0";
    const pnl = stats?.PNL
      ? `$${parseFloat(stats.PNL).toLocaleString()}`
      : "$0";
    const roi = stats?.ROI ? `${parseFloat(stats.ROI).toFixed(2)}%` : "0.00%";

    // Define 4 templates
    const templates = [
      // Option 1 (Most Natural)
      `Check my metrics on Anthe Labs 🚀

📊 Volume: ${volume}
💹 PnL: ${pnl}
📈 ROI: ${roi}

Join me — trade on @AntheLabs https://anthe.io`,
      // Option 2 (Slightly Cleaner)
      `Tracking my trades on Anthe Labs 👀

📊 Volume: ${volume}
💹 PnL: ${pnl}
📈 ROI: ${roi}

Join me — trade on @AntheLabs https://anthe.io`,
      // Option 3 (Minimal / Premium)
      `Sharing my trading journey on Anthe Labs 🔥
      
📊 Volume: ${volume}
💹 PnL: ${pnl}
📈 ROI: ${roi}

Join me — trade on @AntheLabs https://anthe.io`,
      // Option 4 (Social / Creator Style)
      `All my trading metrics, live on Anthe Labs ⚡
      
📊 Volume: ${volume}
💹 PnL: ${pnl}
📈 ROI: ${roi}

Join me — trade on @AntheLabs https://anthe.io`,
    ];

    // Randomly select a template
    const randomTemplate =
      templates[Math.floor(Math.random() * templates.length)];

    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(randomTemplate)}`,
      "_blank"
    );
  };

  const shareOnTelegram = () => {
    const profileUrl = `${window.location.origin}/profile/${username}`;
    const text = `Check out ${user?.display_name || user?.username || "this trader"}'s profile on Anthe Labs!`;
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(profileUrl)}&text=${encodeURIComponent(text)}`,
      "_blank"
    );
  };

  const handleDownloadStatsImage = async () => {
    try {
      setIsGeneratingImage(true);
      // Format stats
      const volume = stats?.TotalVolume
        ? `$${parseFloat(stats.TotalVolume).toLocaleString()}`
        : "$0";
      const pnl = stats?.PNL
        ? `$${parseFloat(stats.PNL).toLocaleString()}`
        : "$0";
      const roi = stats?.ROI ? `${parseFloat(stats.ROI).toFixed(2)}%` : "0.00%";
      const trades = stats?.NumberOfTxns?.toLocaleString() || "0";

      // Get user display info
      const displayName =
        user?.display_name || user?.full_name || user?.username || "User";
      const avatarUrl =
        user?.selected_avatar_url ||
        user?.avatar_url ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=6366f1&color=fff`;

      // Generate image blob
      const blob = await generateStatsImage({
        stats: {
          totalVolume: volume,
          pnl: pnl,
          roi: roi,
          numberOfTxns: trades,
          walletAddress: user?.wallet_address,
          username: username,
          displayName: displayName,
          avatarUrl: avatarUrl,
        },
      });

      // Create preview URL
      const url = URL.createObjectURL(blob);
      setPreviewImageUrl(url);
      setShowImagePreview(true);
      setIsGeneratingImage(false);
    } catch (error) {
      console.error("Failed to generate stats image:", error);
      setIsGeneratingImage(false);
    }
  };

  const handleDownloadFromPreview = () => {
    if (!previewImageUrl) return;

    const a = document.createElement("a");
    a.href = previewImageUrl;
    a.download = `anthe-labs-stats-${username}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleClosePreview = () => {
    if (previewImageUrl) {
      URL.revokeObjectURL(previewImageUrl);
    }
    setPreviewImageUrl(null);
    setShowImagePreview(false);
  };

  const handleUsernameSelect = (selectedUsername: string) => {
    setSearchQuery("");
    setShowAutocomplete(false);
    router.push(`/profile/${selectedUsername}`);
  };

  // Calculate values
  const pnlValue = parseFloat(stats?.PNL || "0");
  const roiValue = parseFloat(stats?.ROI || "0");
  const volumeValue = parseFloat(stats?.TotalVolume || "0");

  // Calculate volume tier
  const volumeTier = useMemo(
    () => getTier("volume", volumeValue),
    [volumeValue]
  );

  // Format date for "Active Since"
  const formatActiveSince = (dateString?: string) => {
    if (!dateString) return "Recently";
    const date = new Date(dateString);
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1
            className={`${palanquinDark.className} text-2xl font-bold text-white mb-2`}
          >
            User Not Found
          </h1>
          <p className="text-slate-400">
            The profile you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  const displayName =
    user.display_name || user.full_name || user.username || "User";
  const avatarUrl =
    user.selected_avatar_url ||
    user.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=6366f1&color=fff`;

  return (
    <div className="min-h-screen">
      {/* Search Bar with Autocomplete */}
      <section className="pt-24 sm:pt-28 pb-3 sm:pb-4 px-3 sm:px-4 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4 lg:mb-6">
            <div className="flex-1 max-w-md relative" ref={searchRef}>
              <div className="relative">
                <Search
                  className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Search traders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (filteredUsernames.length > 0) {
                      setShowAutocomplete(true);
                    }
                  }}
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-sm sm:text-base bg-[#0b1220] border border-[#1F242D] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>

              {/* Autocomplete Dropdown */}
              {showAutocomplete && filteredUsernames.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-[#0b1220] border border-[#1F242D] rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto custom-scrollbar">
                  {filteredUsernames.map((u) => {
                    return (
                      <button
                        key={u.username}
                        onClick={() => handleUsernameSelect(u.username)}
                        className="w-full px-4 py-3 text-left hover:bg-[#151A22] transition-all duration-200 border-b border-[#1F242D] last:border-b-0 group"
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar - Only show if exists in DB */}
                          {u.avatarUrl && (
                            <div className="relative flex-shrink-0">
                              <img
                                src={u.avatarUrl}
                                alt={u.displayName}
                                className="w-10 h-10 rounded-full border border-slate-700/50 object-cover group-hover:border-[#3B82F6]/50 transition-colors"
                                referrerPolicy="no-referrer"
                              />
                              {u.twitterConnected && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#3B82F6] rounded-full border-2 border-[#0b1220] flex items-center justify-center">
                                  <Shield size={8} className="text-white" />
                                </div>
                              )}
                            </div>
                          )}

                          {/* Name and Username */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-white font-semibold text-sm truncate">
                                {u.displayName}
                              </p>
                              {u.twitterConnected && (
                                <Shield
                                  size={12}
                                  className="text-[#3B82F6] flex-shrink-0"
                                />
                              )}
                            </div>
                            <p className="text-xs text-slate-400 truncate">
                              @{u.username}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Profile Header Section */}
      <section className="px-3 sm:px-4 lg:px-8 pb-6 sm:pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-[#11151C] via-[#0F1318] to-[#0D1117] border border-[#1F242D] rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-6 relative overflow-hidden animate-fadeIn">
            {/* Vignette effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none" />
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
                  backgroundSize: "50px 50px",
                }}
              />
            </div>

            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 sm:gap-5 lg:gap-6">
                {/* Avatar */}
                <div className="relative flex-shrink-0 mx-auto sm:mx-0">
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full border-2 border-slate-700/50 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div
                    className="absolute inset-0 rounded-full -z-10"
                    style={{ boxShadow: "0 4px 20px rgba(14, 22, 35, 0.5)" }}
                  />
                </div>

                {/* Name and Info */}
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 sm:gap-2.5 mb-1.5 flex-wrap justify-center sm:justify-start">
                        <h1
                          className={`${palanquinDark.className} text-xl sm:text-2xl lg:text-2xl font-bold text-white text-center sm:text-left break-words`}
                        >
                          {displayName}
                        </h1>
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center sm:justify-start">
                          <VerifiedBadge
                            isVerified={user.twitter_connected || false}
                          />
                          {volumeTier && <VolumeTierBadge tier={volumeTier} />}
                        </div>
                      </div>
                      <p className="text-sm sm:text-base text-[#3B82F6] mb-1.5 text-center sm:text-left truncate">
                        @{user.username}
                      </p>
                      {/* Active Since */}
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs sm:text-sm justify-center sm:justify-start">
                        <Calendar
                          size={12}
                          className="sm:w-[13px] sm:h-[13px]"
                        />
                        <span className="whitespace-nowrap">
                          Active since {formatActiveSince(user.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Copy Trader Button */}
                    <button
                      onClick={() => {
                        if (user.wallet_address) {
                          // Redirect to copytrade page with trader wallet address as query parameter
                          router.push(
                            `/copytrade?address=${encodeURIComponent(user.wallet_address)}`
                          );
                        } else {
                          // If no wallet address, still redirect but without address (user can enter manually)
                          router.push("/copytrade");
                        }
                      }}
                      className={`group w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-5 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-lg font-semibold transition-all duration-300 shadow-lg shadow-blue-500/20 whitespace-nowrap ${outfit.className}`}
                    >
                      <span className="hidden min-[475px]:inline">
                        Copy This Trader
                      </span>
                      <span className="min-[475px]:hidden">Copy Trader</span>
                    </button>
                  </div>

                  {user.bio && (
                    <p className="text-slate-300 mb-3 max-w-2xl text-xs sm:text-sm text-center sm:text-left leading-relaxed">
                      {user.bio}
                    </p>
                  )}

                  {/* Twitter Button - Improved */}
                  {user.twitter_connected && user.twitter_username && (
                    <a
                      href={`https://twitter.com/${user.twitter_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-800 hover:border-[#3B82F6]/50 transition-all duration-200 group text-xs sm:text-sm mx-auto sm:mx-0"
                    >
                      <Twitter
                        size={14}
                        className="sm:w-[16px] sm:h-[16px] text-[#3B82F6] group-hover:scale-110 transition-transform"
                      />
                      <span className="text-xs sm:text-sm text-[#3B82F6] font-medium">
                        @{user.twitter_username}
                      </span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Divider */}
      <div className="h-[1px] w-full bg-white/5 my-6 sm:my-8" />

      {/* Stats Section */}
      <section className="px-3 sm:px-4 lg:px-8 pb-8 sm:pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 sm:mb-4 lg:mb-6 px-1">
            <h2
              className={`${palanquinDark.className} text-lg sm:text-xl lg:text-2xl font-bold text-white`}
            >
              Statistics
            </h2>
            <DataUpdateTimer />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {/* Total Volume */}
            <div
              className="bg-[#0b1220] border border-white/5 rounded-xl p-4 sm:p-6 hover:bg-[#151A22] hover:border-white/10 transition-all duration-200 group hover:-translate-y-1"
              style={{ boxShadow: "0px 3px 12px rgba(0,0,0,0.25)" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                  <DollarSign size={20} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">
                    Total Volume
                  </p>
                  <p className="text-xl font-bold text-white">
                    {stats?.TotalVolume
                      ? `$${parseFloat(stats.TotalVolume).toLocaleString()}`
                      : "$0.00"}
                  </p>
                </div>
              </div>
            </div>

            {/* PNL */}
            <div
              className="bg-[#0b1220] border border-white/5 rounded-xl p-4 sm:p-6 hover:bg-[#151A22] hover:border-white/10 transition-all duration-200 group hover:-translate-y-1"
              style={{ boxShadow: "0px 3px 12px rgba(0,0,0,0.25)" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
                  <TrendingUp size={20} className="text-[#3B82F6]" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">
                    PNL
                  </p>
                  <p
                    className={`text-xl font-bold ${pnlValue >= 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    {stats?.PNL
                      ? `$${parseFloat(stats.PNL).toLocaleString()}`
                      : "$0.00"}
                  </p>
                </div>
              </div>
            </div>

            {/* ROI */}
            <div
              className="bg-[#0b1220] border border-white/5 rounded-xl p-4 sm:p-6 hover:bg-[#151A22] hover:border-white/10 transition-all duration-200 group hover:-translate-y-1"
              style={{ boxShadow: "0px 3px 12px rgba(0,0,0,0.25)" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
                  <Percent size={20} className="text-[#3B82F6]" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">
                    ROI
                  </p>
                  <p
                    className={`text-xl font-bold ${roiValue >= 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    {stats?.ROI
                      ? `${parseFloat(stats.ROI).toFixed(2)}%`
                      : "0.00%"}
                  </p>
                </div>
              </div>
            </div>

            {/* Number of Trades */}
            <div
              className="bg-[#0b1220] border border-white/5 rounded-xl p-4 sm:p-6 hover:bg-[#151A22] hover:border-white/10 transition-all duration-200 group hover:-translate-y-1"
              style={{ boxShadow: "0px 3px 12px rgba(0,0,0,0.25)" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
                  <BarChart3 size={20} className="text-[#3B82F6]" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">
                    No of Trades
                  </p>
                  <p className="text-xl font-bold text-white">
                    {stats?.NumberOfTxns?.toLocaleString() || "0"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Share Profile Section - Improved */}
      <section className="px-3 sm:px-4 lg:px-8 pb-8 sm:pb-12">
        <div className="max-w-7xl mx-auto">
          <div
            className="bg-[#0b1220] border border-white/5 rounded-xl p-4 sm:p-5 lg:p-6"
            style={{ boxShadow: "0px 3px 12px rgba(0,0,0,0.25)" }}
          >
            <h3
              className={`${palanquinDark.className} text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4`}
            >
              Share Profile
            </h3>
            <div className="flex flex-col gap-3 mb-4">
              <button
                onClick={handleDownloadStatsImage}
                disabled={isGeneratingImage}
                className={`w-full flex items-center justify-center gap-2 px-5 py-3 bg-transparent border-2 border-[#3B82F6] rounded-lg hover:bg-[#3B82F6]/10 hover:border-[#3B82F6]/80 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${outfit.className}`}
              >
                {isGeneratingImage ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#3B82F6]/30 border-t-[#3B82F6] rounded-full animate-spin" />
                    <span className="text-sm sm:text-base text-[#3B82F6] font-semibold">
                      Generating...
                    </span>
                  </>
                ) : (
                  <>
                    <Download size={18} className="text-[#3B82F6]" />
                    <span className="text-sm sm:text-base text-[#3B82F6] font-semibold">
                      Download image
                    </span>
                  </>
                )}
              </button>
            </div>
            <div className="text-center text-xs text-slate-400 mb-3">
              Or share to
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={shareOnTwitter}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-800 hover:border-[#3B82F6]/50 transition-all duration-200 ${outfit.className}`}
              >
                <Twitter size={16} className="text-[#3B82F6]" />
                <span className="text-xs sm:text-sm text-white font-medium">
                  Share on X
                </span>
              </button>
              <button
                onClick={shareOnTelegram}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-800 hover:border-[#3B82F6]/50 transition-all duration-200 ${outfit.className}`}
              >
                <Send size={16} className="text-[#3B82F6]" />
                <span className="text-xs sm:text-sm text-white font-medium">
                  Telegram
                </span>
              </button>
              <button
                onClick={copyProfileLink}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-800 hover:border-[#3B82F6]/50 transition-all duration-200 ${outfit.className}`}
              >
                {copied ? (
                  <>
                    <Check size={16} className="text-green-400" />
                    <span className="text-xs sm:text-sm text-green-400 font-medium">
                      Copied!
                    </span>
                  </>
                ) : (
                  <>
                    <Copy size={16} className="text-[#3B82F6]" />
                    <span className="text-xs sm:text-sm text-white font-medium">
                      Copy Link
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Image Preview Modal - Clean & Professional */}
      {showImagePreview && previewImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/20 backdrop-blur-lg p-4 overflow-y-auto pt-24 sm:pt-28"
          onClick={handleClosePreview}
        >
          <div
            className="relative bg-[#0a0c12] border border-slate-700/40 rounded-xl w-full max-w-[600px] p-5 mx-auto shadow-2xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(10, 12, 18, 0.98) 0%, rgba(6, 9, 19, 0.98) 100%)",
              boxShadow:
                "0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(59, 130, 246, 0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleClosePreview}
              className="absolute top-3 right-3 p-1.5 bg-transparent hover:bg-slate-800/50 rounded-lg transition-colors z-10"
            >
              <X size={18} className="text-slate-400 hover:text-white" />
            </button>

            {/* Modal Header */}
            <div className="flex items-start justify-between mb-4 pr-8">
              <h3
                className={`${palanquinDark.className} text-lg font-bold text-white`}
              >
                Share Performance
              </h3>
            </div>

            {/* Image Preview - Properly contained, matches canvas edge */}
            <div className="mb-4 overflow-hidden rounded-lg bg-[#050709]">
              <img
                src={previewImageUrl}
                alt="Stats preview"
                className="w-full h-auto block"
              />
            </div>

            {/* Download Button */}
            <button
              onClick={handleDownloadFromPreview}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white rounded-lg font-semibold transition-colors ${outfit.className}`}
            >
              <Download size={16} />
              <span>Download image</span>
            </button>

            {/* Share Options */}
            <div className="mt-3 text-center">
              <p className="text-xs text-slate-400 mb-2">Or share to</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={shareOnTwitter}
                  className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors border border-slate-700/50"
                  title="Share on X"
                >
                  <Twitter
                    size={18}
                    className="text-slate-400 hover:text-white"
                  />
                </button>
                <button
                  onClick={shareOnTelegram}
                  className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors border border-slate-700/50"
                  title="Share on Telegram"
                >
                  <Send size={18} className="text-slate-400 hover:text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
