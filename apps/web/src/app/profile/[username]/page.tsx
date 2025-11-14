"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
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
  Copy as CopyIcon,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Target,
} from "lucide-react";
import { TierChip, TierProgressBar } from "@/components/TierBadge";
import { TierModal } from "@/components/TierModal";
import {
  getTier,
  getTierTooltip,
  isPremiumTier,
  TIER_THRESHOLDS,
  TierConfig,
  getProgressToNextTier,
} from "@/lib/tiers";

interface UserStats {
  Rank: number | null;
  Address: string;
  NumberOfTxns: number;
  TotalVolume: string;
  PNL: string;
  ROI: string;
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
    { username: string; displayName: string }[]
  >([]);
  const [filteredUsernames, setFilteredUsernames] = useState<
    { username: string; displayName: string }[]
  >([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [showTierModal, setShowTierModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{
    volume: boolean;
    pnl: boolean;
    roi: boolean;
    trades: boolean;
  }>({
    volume: false,
    pnl: false,
    roi: false,
    trades: false,
  });
  const searchRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);
  const pnlRef = useRef<HTMLDivElement>(null);
  const roiRef = useRef<HTMLDivElement>(null);
  const tradesRef = useRef<HTMLDivElement>(null);

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

  // Scroll to section function
  const scrollToSection = (section: "volume" | "pnl" | "roi" | "trades") => {
    const refs = {
      volume: volumeRef,
      pnl: pnlRef,
      roi: roiRef,
      trades: tradesRef,
    };
    const ref = refs[section];
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
      // Expand the section when scrolling to it
      setExpandedSections((prev) => ({ ...prev, [section]: true }));
    }
  };

  // Toggle section expansion
  const toggleSection = (section: "volume" | "pnl" | "roi" | "trades") => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

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
    const profileUrl = `${window.location.origin}/profile/${username}`;
    const text = `Check out ${user?.display_name || user?.username || "this trader"}'s profile on Anthé Labs!`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(profileUrl)}`,
      "_blank"
    );
  };

  const shareOnTelegram = () => {
    const profileUrl = `${window.location.origin}/profile/${username}`;
    const text = `Check out ${user?.display_name || user?.username || "this trader"}'s profile on Anthé Labs!`;
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(profileUrl)}&text=${encodeURIComponent(text)}`,
      "_blank"
    );
  };

  const handleUsernameSelect = (selectedUsername: string) => {
    setSearchQuery("");
    setShowAutocomplete(false);
    router.push(`/profile/${selectedUsername}`);
  };

  // Calculate values - must be before early returns to maintain hook order
  const pnlValue = parseFloat(stats?.PNL || "0");
  const roiValue = parseFloat(stats?.ROI || "0");
  const volumeValue = parseFloat(stats?.TotalVolume || "0");
  const tradesValue = stats?.NumberOfTxns || 0;

  // Calculate tiers - memoized to prevent recalculation
  // MUST be called before early returns to maintain hook order
  const volumeTier = useMemo(
    () => getTier("volume", volumeValue),
    [volumeValue]
  );
  const tradesTier = useMemo(
    () => getTier("trades", tradesValue),
    [tradesValue]
  );
  const pnlTier = useMemo(() => getTier("pnl", pnlValue), [pnlValue]);
  const roiTier = useMemo(() => getTier("roi", roiValue), [roiValue]);

  // Primary tier (default: Volume)
  const primaryTier = useMemo(() => volumeTier, [volumeTier]);
  const isPremiumUser = useMemo(
    () => primaryTier && isPremiumTier(primaryTier.name),
    [primaryTier]
  );

  // Generate sparkline data - memoized to prevent regeneration
  const sparklineData = useMemo(() => {
    const points = 20;
    const data = [];
    let value = 50;
    for (let i = 0; i < points; i++) {
      value += (Math.random() - 0.5) * 10;
      value = Math.max(10, Math.min(90, value));
      data.push({ x: i, y: value });
    }
    return data;
  }, []);

  const sparklinePath = useMemo(() => {
    return sparklineData
      .map(
        (point, i) =>
          `${i === 0 ? "M" : "L"} ${(i / (sparklineData.length - 1)) * 100} ${100 - point.y}`
      )
      .join(" ");
  }, [sparklineData]);

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
      <div className="min-h-screen bg-[#060913] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#060913] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">User Not Found</h1>
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
    <div className="min-h-screen bg-[#060913]">
      {/* Search Bar with Autocomplete */}
      <section className="pt-20 pb-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex-1 max-w-md relative" ref={searchRef}>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
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
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0b1220] border border-[#1F242D] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>

              {/* Autocomplete Dropdown */}
              {showAutocomplete && filteredUsernames.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-[#0b1220] border border-[#1F242D] rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto">
                  {filteredUsernames.map((u) => (
                    <button
                      key={u.username}
                      onClick={() => handleUsernameSelect(u.username)}
                      className="w-full px-4 py-3 text-left hover:bg-[#151A22] transition-colors border-b border-[#1F242D] last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <p className="text-white font-medium">
                            @{u.username}
                          </p>
                          <p className="text-sm text-slate-400">
                            {u.displayName}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Profile Header Section */}
      <section className="px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-[#11151C] via-[#0F1318] to-[#0D1117] border border-[#1F242D] rounded-2xl p-8 sm:p-10 relative overflow-hidden animate-fadeIn">
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
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 lg:gap-8">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-2 border-slate-700/50 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div
                    className="absolute inset-0 rounded-full -z-10"
                    style={{ boxShadow: "0 6px 30px rgba(14, 22, 35, 0.6)" }}
                  />
                </div>

                {/* Name and Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h1 className="text-3xl sm:text-4xl font-bold text-white">
                          {displayName}
                        </h1>
                        {user.twitter_connected && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-[#3B82F6]/10 border border-[#3B82F6]/30 rounded-lg">
                            <Shield size={14} className="text-[#3B82F6]" />
                            <span className="text-xs text-[#3B82F6] font-medium">
                              Verified
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-lg text-[#3B82F6] mb-2">
                        @{user.username}
                      </p>
                      {/* Active Since */}
                      <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <Calendar size={14} />
                        <span>
                          Active since {formatActiveSince(user.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Copy Trader Button */}
                    <button
                      onClick={() => {
                        // Do nothing for now
                      }}
                      className={`flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#3B82F6] to-[#2563EB] hover:from-[#2563EB] hover:to-[#1D4ED8] text-white rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-[#3B82F6]/20 hover:shadow-xl hover:shadow-[#3B82F6]/30 whitespace-nowrap ${
                        isPremiumUser
                          ? "ring-2 ring-[#D4AF37] ring-opacity-40 border border-[#D4AF37]/30"
                          : ""
                      }`}
                    >
                      <CopyIcon size={18} />
                      Copy This Trader
                    </button>
                  </div>

                  {user.bio && (
                    <p className="text-slate-300 mb-4 max-w-2xl">{user.bio}</p>
                  )}

                  {/* Twitter Button - Improved */}
                  {user.twitter_connected && user.twitter_username && (
                    <a
                      href={`https://twitter.com/${user.twitter_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-800 hover:border-[#3B82F6]/50 transition-all duration-200 group"
                    >
                      <Twitter
                        size={18}
                        className="text-[#3B82F6] group-hover:scale-110 transition-transform"
                      />
                      <span className="text-sm text-[#3B82F6] font-medium">
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
      <div className="h-[1px] w-full bg-white/5 my-8" />

      {/* Achievements Section - Reordered */}
      <section className="px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">Achievements</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {/* Total Volume */}
            <div
              className="bg-[#0b1220] border border-white/5 rounded-xl p-6 hover:bg-[#151A22] hover:border-white/10 transition-all duration-200 relative group hover:-translate-y-1 flex flex-col justify-between min-h-[180px]"
              style={{ boxShadow: "0px 3px 12px rgba(0,0,0,0.25)" }}
            >
              <div className="absolute top-3 right-3">
                <TierChip
                  tier={volumeTier}
                  tooltip={
                    volumeTier
                      ? getTierTooltip("volume", volumeTier.name)
                      : undefined
                  }
                />
              </div>
              <div className="flex items-center gap-3 mb-3">
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
              <div className="mt-4">
                <TierProgressBar metricType="volume" value={volumeValue} />
              </div>
            </div>

            {/* PNL with Sparkline */}
            <div
              className="bg-[#0b1220] border border-white/5 rounded-xl p-6 hover:bg-[#151A22] hover:border-white/10 transition-all duration-200 relative overflow-hidden group hover:-translate-y-1 flex flex-col justify-between min-h-[180px]"
              style={{ boxShadow: "0px 3px 12px rgba(0,0,0,0.25)" }}
            >
              <div className="absolute top-3 right-3 z-10">
                <TierChip
                  tier={pnlTier}
                  tooltip={
                    pnlTier ? getTierTooltip("pnl", pnlTier.name) : undefined
                  }
                />
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
                  <TrendingUp size={20} className="text-[#3B82F6]" />
                </div>
                <div className="flex-1">
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
              {/* Mini Sparkline */}
              <div className="absolute bottom-2 right-2 w-20 h-8 opacity-50">
                <svg
                  viewBox="0 0 100 100"
                  className="w-full h-full"
                  preserveAspectRatio="none"
                >
                  <path
                    d={sparklinePath}
                    stroke={pnlValue >= 0 ? "#4ade80" : "#f87171"}
                    strokeWidth="2"
                    fill="none"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>
              <div className="mt-4">
                <TierProgressBar metricType="pnl" value={pnlValue} />
              </div>
            </div>

            {/* ROI */}
            <div
              className="bg-[#0b1220] border border-white/5 rounded-xl p-6 hover:bg-[#151A22] hover:border-white/10 transition-all duration-200 group hover:-translate-y-1 flex flex-col justify-between min-h-[180px]"
              style={{ boxShadow: "0px 3px 12px rgba(0,0,0,0.25)" }}
            >
              <div className="absolute top-3 right-3">
                <TierChip
                  tier={roiTier}
                  tooltip={
                    roiTier ? getTierTooltip("roi", roiTier.name) : undefined
                  }
                />
              </div>
              <div className="flex items-center gap-3 mb-3">
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
              <div className="mt-4">
                <TierProgressBar metricType="roi" value={roiValue} />
              </div>
            </div>

            {/* Number of Trades */}
            <div
              className="bg-[#0b1220] border border-white/5 rounded-xl p-6 hover:bg-[#151A22] hover:border-white/10 transition-all duration-200 group hover:-translate-y-1 flex flex-col justify-between min-h-[180px]"
              style={{ boxShadow: "0px 3px 12px rgba(0,0,0,0.25)" }}
            >
              <div className="absolute top-3 right-3">
                <TierChip
                  tier={tradesTier}
                  tooltip={
                    tradesTier
                      ? getTierTooltip("trades", tradesTier.name)
                      : undefined
                  }
                />
              </div>
              <div className="flex items-center gap-3 mb-3">
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
              <div className="mt-4">
                <TierProgressBar metricType="trades" value={tradesValue} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Share Profile Section - Improved */}
      <section className="px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-7xl mx-auto">
          <div
            className="bg-[#0b1220] border border-white/5 rounded-xl p-6"
            style={{ boxShadow: "0px 3px 12px rgba(0,0,0,0.25)" }}
          >
            <h3 className="text-lg font-semibold text-white mb-4">
              Share Profile
            </h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={shareOnTwitter}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-800 hover:border-[#3B82F6]/50 transition-all duration-200"
              >
                <Twitter size={16} className="text-[#3B82F6]" />
                <span className="text-sm text-white font-medium">
                  Share on X
                </span>
              </button>
              <button
                onClick={shareOnTelegram}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-800 hover:border-[#3B82F6]/50 transition-all duration-200"
              >
                <Send size={16} className="text-[#3B82F6]" />
                <span className="text-sm text-white font-medium">Telegram</span>
              </button>
              <button
                onClick={copyProfileLink}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-800 hover:border-[#3B82F6]/50 transition-all duration-200"
              >
                {copied ? (
                  <>
                    <Check size={16} className="text-green-400" />
                    <span className="text-sm text-green-400 font-medium">
                      Copied!
                    </span>
                  </>
                ) : (
                  <>
                    <Copy size={16} className="text-[#3B82F6]" />
                    <span className="text-sm text-white font-medium">
                      Copy Link
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Section Divider */}
      <div className="h-[1px] w-full bg-white/5 my-8" />

      {/* Tier Overview Section */}
      <section className="px-4 sm:px-6 lg:px-8 pb-12 relative">
        {/* Floating Navigation */}
        <div className="hidden lg:block fixed left-8 top-1/2 -translate-y-1/2 z-40">
          <div
            className="bg-[#0b1220] border border-white/5 rounded-xl p-3 space-y-2"
            style={{ boxShadow: "0px 3px 12px rgba(0,0,0,0.25)" }}
          >
            <button
              onClick={() => scrollToSection("volume")}
              className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              <DollarSign size={14} />
              <span>Volume</span>
            </button>
            <button
              onClick={() => scrollToSection("pnl")}
              className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              <TrendingUp size={14} />
              <span>PnL</span>
            </button>
            <button
              onClick={() => scrollToSection("roi")}
              className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              <Percent size={14} />
              <span>ROI</span>
            </button>
            <button
              onClick={() => scrollToSection("trades")}
              className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              <BarChart3 size={14} />
              <span>Trades</span>
            </button>
          </div>
        </div>

        {/* Sticky Explain Tiers Button */}
        <div className="hidden lg:block fixed right-8 top-1/2 -translate-y-1/2 z-40">
          <button
            onClick={() => setShowTierModal(true)}
            className="flex flex-col items-center gap-2 px-4 py-3 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-[#3B82F6]/30 hover:shadow-xl hover:shadow-[#3B82F6]/40 group"
            title="Learn about tiers"
          >
            <HelpCircle
              size={20}
              className="group-hover:scale-110 transition-transform"
            />
            <span className="text-xs">Learn Tiers</span>
          </button>
        </div>

        <div className="max-w-7xl mx-auto">
          <div
            className="bg-[#0b1220] border border-white/5 rounded-xl p-6 sm:p-8 relative"
            style={{ boxShadow: "0px 3px 12px rgba(0,0,0,0.25)" }}
          >
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-2 animate-fadeIn">
                Tier System Overview
              </h3>
              <p className="text-sm text-slate-400">
                Understand how tiers work and see your current status across all
                metrics
              </p>
            </div>

            {/* Tier Summary Widget */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="bg-[#0B0E13] border border-white/5 rounded-lg p-4 text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">
                  Volume
                </p>
                {volumeTier ? (
                  <p
                    className="text-base font-bold"
                    style={{ color: volumeTier.color }}
                  >
                    {volumeTier.name}
                  </p>
                ) : (
                  <p className="text-base font-bold text-slate-500">No Tier</p>
                )}
              </div>
              <div className="bg-[#0B0E13] border border-white/5 rounded-lg p-4 text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">
                  PnL
                </p>
                {pnlTier ? (
                  <p
                    className="text-base font-bold"
                    style={{ color: pnlTier.color }}
                  >
                    {pnlTier.name}
                  </p>
                ) : (
                  <p className="text-base font-bold text-slate-500">No Tier</p>
                )}
              </div>
              <div className="bg-[#0B0E13] border border-white/5 rounded-lg p-4 text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">
                  ROI
                </p>
                {roiTier ? (
                  <p
                    className="text-base font-bold"
                    style={{ color: roiTier.color }}
                  >
                    {roiTier.name}
                  </p>
                ) : (
                  <p className="text-base font-bold text-slate-500">No Tier</p>
                )}
              </div>
              <div className="bg-[#0B0E13] border border-white/5 rounded-lg p-4 text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">
                  Trades
                </p>
                {tradesTier ? (
                  <p
                    className="text-base font-bold"
                    style={{ color: tradesTier.color }}
                  >
                    {tradesTier.name}
                  </p>
                ) : (
                  <p className="text-base font-bold text-slate-500">No Tier</p>
                )}
              </div>
            </div>

            {/* Volume Tiers - Collapsible */}
            <div className="mb-6" ref={volumeRef}>
              <button
                onClick={() => toggleSection("volume")}
                className="w-full flex items-center justify-between p-4 bg-[#0B0E13] border border-white/5 rounded-lg hover:border-white/10 transition-all duration-200 mb-2"
              >
                <div className="flex items-center gap-3">
                  <DollarSign size={18} className="text-[#3B82F6]" />
                  <h4 className="text-lg font-semibold text-white">
                    Total Volume Tiers
                  </h4>
                  {volumeTier && (
                    <span
                      className="text-xs px-3 py-1 rounded-full font-medium border-l-4"
                      style={{
                        backgroundColor: volumeTier.bgColor,
                        color: volumeTier.color,
                        borderLeftColor: volumeTier.color,
                        borderRight: `1px solid ${volumeTier.borderColor}`,
                        borderTop: `1px solid ${volumeTier.borderColor}`,
                        borderBottom: `1px solid ${volumeTier.borderColor}`,
                      }}
                    >
                      <Target size={12} className="inline mr-1" />
                      Your Tier: {volumeTier.name}
                    </span>
                  )}
                </div>
                {expandedSections.volume ? (
                  <ChevronUp size={20} className="text-slate-400" />
                ) : (
                  <ChevronDown size={20} className="text-slate-400" />
                )}
              </button>
              {expandedSections.volume && (
                <div className="space-y-2 animate-fadeIn">
                  {TIER_THRESHOLDS.volume.map((tier: TierConfig) => {
                    const isCurrentTier = volumeTier?.name === tier.name;
                    const progress = getProgressToNextTier(
                      "volume",
                      volumeValue
                    );
                    return (
                      <div
                        key={tier.name}
                        className={`p-4 rounded-lg border transition-all duration-200 ${
                          isCurrentTier
                            ? "bg-gradient-to-r from-[#0B0E13] to-[#0A0C10] border-2"
                            : "bg-[#0B0E13] border border-white/5"
                        }`}
                        style={
                          isCurrentTier
                            ? {
                                borderColor: tier.borderColor,
                                boxShadow: `0 0 0 1px ${tier.borderColor}40, 0px 3px 12px rgba(0,0,0,0.25)`,
                              }
                            : { boxShadow: "0px 3px 12px rgba(0,0,0,0.25)" }
                        }
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: tier.color }}
                              />
                              <h5
                                className="text-base font-semibold"
                                style={{ color: tier.color }}
                              >
                                {tier.title} ({tier.name})
                              </h5>
                              {isCurrentTier && (
                                <span className="text-xs px-2.5 py-1 rounded font-medium border-l-4 bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]">
                                  <Target size={12} className="inline mr-1" />
                                  You are here
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-400 mb-1.5">
                              {tier.min === 0
                                ? `$${tier.min.toLocaleString()} - $${tier.max?.toLocaleString()}`
                                : tier.max === null
                                  ? `$${tier.min.toLocaleString()}+`
                                  : `$${tier.min.toLocaleString()} - $${tier.max.toLocaleString()}`}
                            </p>
                            <p className="text-sm text-slate-300 leading-relaxed mb-3">
                              {getTierTooltip("volume", tier.name).description}
                            </p>
                            {isCurrentTier && progress.nextTier && (
                              <div className="mt-3">
                                <TierProgressBar
                                  metricType="volume"
                                  value={volumeValue}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PnL Tiers - Collapsible */}
            <div className="mb-6" ref={pnlRef}>
              <button
                onClick={() => toggleSection("pnl")}
                className="w-full flex items-center justify-between p-4 bg-[#0B0E13] border border-white/5 rounded-lg hover:border-white/10 transition-all duration-200 mb-2"
              >
                <div className="flex items-center gap-3">
                  <TrendingUp size={18} className="text-[#3B82F6]" />
                  <h4 className="text-lg font-semibold text-white">
                    PnL Tiers
                  </h4>
                  {pnlTier && (
                    <span
                      className="text-xs px-3 py-1 rounded-full font-medium border-l-4"
                      style={{
                        backgroundColor: pnlTier.bgColor,
                        color: pnlTier.color,
                        borderLeftColor: pnlTier.color,
                        borderRight: `1px solid ${pnlTier.borderColor}`,
                        borderTop: `1px solid ${pnlTier.borderColor}`,
                        borderBottom: `1px solid ${pnlTier.borderColor}`,
                      }}
                    >
                      <Target size={12} className="inline mr-1" />
                      Your Tier: {pnlTier.name}
                    </span>
                  )}
                </div>
                {expandedSections.pnl ? (
                  <ChevronUp size={20} className="text-slate-400" />
                ) : (
                  <ChevronDown size={20} className="text-slate-400" />
                )}
              </button>
              {expandedSections.pnl && (
                <div className="space-y-2 animate-fadeIn">
                  {TIER_THRESHOLDS.pnl.map((tier: TierConfig) => {
                    const isCurrentTier = pnlTier?.name === tier.name;
                    const progress = getProgressToNextTier("pnl", pnlValue);
                    return (
                      <div
                        key={tier.name}
                        className={`p-4 rounded-lg border transition-all duration-200 ${
                          isCurrentTier
                            ? "bg-gradient-to-r from-[#0B0E13] to-[#0A0C10] border-2"
                            : "bg-[#0B0E13] border border-white/5"
                        }`}
                        style={
                          isCurrentTier
                            ? {
                                borderColor: tier.borderColor,
                                boxShadow: `0 0 0 1px ${tier.borderColor}40, 0px 3px 12px rgba(0,0,0,0.25)`,
                              }
                            : { boxShadow: "0px 3px 12px rgba(0,0,0,0.25)" }
                        }
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: tier.color }}
                              />
                              <h5
                                className="text-base font-semibold"
                                style={{ color: tier.color }}
                              >
                                {tier.title} ({tier.name})
                              </h5>
                              {isCurrentTier && (
                                <span className="text-xs px-2.5 py-1 rounded font-medium border-l-4 bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]">
                                  <Target size={12} className="inline mr-1" />
                                  You are here
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-400 mb-1.5">
                              {tier.min === -Infinity
                                ? `< $0`
                                : tier.max === null
                                  ? `$${tier.min.toLocaleString()}+`
                                  : `$${tier.min.toLocaleString()} - $${tier.max.toLocaleString()}`}
                            </p>
                            <p className="text-sm text-slate-300 leading-relaxed mb-3">
                              {getTierTooltip("pnl", tier.name).description}
                            </p>
                            {isCurrentTier && progress.nextTier && (
                              <div className="mt-3">
                                <TierProgressBar
                                  metricType="pnl"
                                  value={pnlValue}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ROI Tiers - Collapsible */}
            <div className="mb-6" ref={roiRef}>
              <button
                onClick={() => toggleSection("roi")}
                className="w-full flex items-center justify-between p-4 bg-[#0B0E13] border border-white/5 rounded-lg hover:border-white/10 transition-all duration-200 mb-2"
              >
                <div className="flex items-center gap-3">
                  <Percent size={18} className="text-[#3B82F6]" />
                  <h4 className="text-lg font-semibold text-white">
                    ROI Tiers
                  </h4>
                  {roiTier && (
                    <span
                      className="text-xs px-3 py-1 rounded-full font-medium border-l-4"
                      style={{
                        backgroundColor: roiTier.bgColor,
                        color: roiTier.color,
                        borderLeftColor: roiTier.color,
                        borderRight: `1px solid ${roiTier.borderColor}`,
                        borderTop: `1px solid ${roiTier.borderColor}`,
                        borderBottom: `1px solid ${roiTier.borderColor}`,
                      }}
                    >
                      <Target size={12} className="inline mr-1" />
                      Your Tier: {roiTier.name}
                    </span>
                  )}
                </div>
                {expandedSections.roi ? (
                  <ChevronUp size={20} className="text-slate-400" />
                ) : (
                  <ChevronDown size={20} className="text-slate-400" />
                )}
              </button>
              {expandedSections.roi && (
                <div className="space-y-2 animate-fadeIn">
                  {TIER_THRESHOLDS.roi.map((tier: TierConfig) => {
                    const isCurrentTier = roiTier?.name === tier.name;
                    const progress = getProgressToNextTier("roi", roiValue);
                    return (
                      <div
                        key={tier.name}
                        className={`p-4 rounded-lg border transition-all duration-200 ${
                          isCurrentTier
                            ? "bg-gradient-to-r from-[#0B0E13] to-[#0A0C10] border-2"
                            : "bg-[#0B0E13] border border-white/5"
                        }`}
                        style={
                          isCurrentTier
                            ? {
                                borderColor: tier.borderColor,
                                boxShadow: `0 0 0 1px ${tier.borderColor}40, 0px 3px 12px rgba(0,0,0,0.25)`,
                              }
                            : { boxShadow: "0px 3px 12px rgba(0,0,0,0.25)" }
                        }
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: tier.color }}
                              />
                              <h5
                                className="text-base font-semibold"
                                style={{ color: tier.color }}
                              >
                                {tier.title} ({tier.name})
                              </h5>
                              {isCurrentTier && (
                                <span className="text-xs px-2.5 py-1 rounded font-medium border-l-4 bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]">
                                  <Target size={12} className="inline mr-1" />
                                  You are here
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-400 mb-1.5">
                              {tier.min === -Infinity
                                ? `< 0%`
                                : tier.max === null
                                  ? `${tier.min}%+`
                                  : `${tier.min}% - ${tier.max}%`}
                            </p>
                            <p className="text-sm text-slate-300 leading-relaxed mb-3">
                              {getTierTooltip("roi", tier.name).description}
                            </p>
                            {isCurrentTier && progress.nextTier && (
                              <div className="mt-3">
                                <TierProgressBar
                                  metricType="roi"
                                  value={roiValue}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Trades Tiers - Collapsible */}
            <div className="mb-6" ref={tradesRef}>
              <button
                onClick={() => toggleSection("trades")}
                className="w-full flex items-center justify-between p-4 bg-[#0B0E13] border border-white/5 rounded-lg hover:border-white/10 transition-all duration-200 mb-2"
              >
                <div className="flex items-center gap-3">
                  <BarChart3 size={18} className="text-[#3B82F6]" />
                  <h4 className="text-lg font-semibold text-white">
                    Number of Trades Tiers
                  </h4>
                  {tradesTier && (
                    <span
                      className="text-xs px-3 py-1 rounded-full font-medium border-l-4"
                      style={{
                        backgroundColor: tradesTier.bgColor,
                        color: tradesTier.color,
                        borderLeftColor: tradesTier.color,
                        borderRight: `1px solid ${tradesTier.borderColor}`,
                        borderTop: `1px solid ${tradesTier.borderColor}`,
                        borderBottom: `1px solid ${tradesTier.borderColor}`,
                      }}
                    >
                      <Target size={12} className="inline mr-1" />
                      Your Tier: {tradesTier.name}
                    </span>
                  )}
                </div>
                {expandedSections.trades ? (
                  <ChevronUp size={20} className="text-slate-400" />
                ) : (
                  <ChevronDown size={20} className="text-slate-400" />
                )}
              </button>
              {expandedSections.trades && (
                <div className="space-y-2 animate-fadeIn">
                  {TIER_THRESHOLDS.trades.map((tier: TierConfig) => {
                    const isCurrentTier = tradesTier?.name === tier.name;
                    const progress = getProgressToNextTier(
                      "trades",
                      tradesValue
                    );
                    return (
                      <div
                        key={tier.name}
                        className={`p-4 rounded-lg border transition-all duration-200 ${
                          isCurrentTier
                            ? "bg-gradient-to-r from-[#0B0E13] to-[#0A0C10] border-2"
                            : "bg-[#0B0E13] border border-white/5"
                        }`}
                        style={
                          isCurrentTier
                            ? {
                                borderColor: tier.borderColor,
                                boxShadow: `0 0 0 1px ${tier.borderColor}40, 0px 3px 12px rgba(0,0,0,0.25)`,
                              }
                            : { boxShadow: "0px 3px 12px rgba(0,0,0,0.25)" }
                        }
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: tier.color }}
                              />
                              <h5
                                className="text-base font-semibold"
                                style={{ color: tier.color }}
                              >
                                {tier.title} ({tier.name})
                              </h5>
                              {isCurrentTier && (
                                <span className="text-xs px-2.5 py-1 rounded font-medium border-l-4 bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]">
                                  <Target size={12} className="inline mr-1" />
                                  You are here
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-400 mb-1.5">
                              {tier.min === 0
                                ? `${tier.min} - ${tier.max} trades`
                                : tier.max === null
                                  ? `${tier.min}+ trades`
                                  : `${tier.min} - ${tier.max} trades`}
                            </p>
                            <p className="text-sm text-slate-300 leading-relaxed mb-3">
                              {getTierTooltip("trades", tier.name).description}
                            </p>
                            {isCurrentTier && progress.nextTier && (
                              <div className="mt-3">
                                <TierProgressBar
                                  metricType="trades"
                                  value={tradesValue}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Tier Modal */}
      <TierModal
        isOpen={showTierModal}
        onClose={() => setShowTierModal(false)}
      />
    </div>
  );
}
