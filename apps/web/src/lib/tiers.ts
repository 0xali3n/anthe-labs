// Tier system configuration and utilities

export type MetricType = "volume" | "trades" | "pnl" | "roi";

export interface TierConfig {
  name: string;
  title: string; // Display title for the tier
  min: number;
  max: number | null; // null means infinity
  color: string;
  bgColor: string;
  borderColor: string;
  icon?: string;
}

export interface TierThresholds {
  volume: TierConfig[];
  trades: TierConfig[];
  pnl: TierConfig[];
  roi: TierConfig[];
}

// Tier configurations
export const TIER_THRESHOLDS: TierThresholds = {
  volume: [
    { name: "Bronze", title: "Starting Trader", min: 0, max: 9999, color: "#B77A40", bgColor: "rgba(183, 122, 64, 0.1)", borderColor: "rgba(183, 122, 64, 0.3)" },
    { name: "Silver", title: "Active Trader", min: 10000, max: 49999, color: "#9CA3AF", bgColor: "rgba(156, 163, 175, 0.1)", borderColor: "rgba(156, 163, 175, 0.3)" },
    { name: "Gold", title: "Experienced Trader", min: 50000, max: 199999, color: "#D4AF37", bgColor: "rgba(212, 175, 55, 0.1)", borderColor: "rgba(212, 175, 55, 0.3)" },
    { name: "Platinum", title: "Elite Trader", min: 200000, max: 999999, color: "#7DD3FC", bgColor: "rgba(125, 211, 252, 0.1)", borderColor: "rgba(125, 211, 252, 0.3)" },
    { name: "Diamond", title: "Master Trader", min: 1000000, max: null, color: "#7C3AED", bgColor: "rgba(124, 58, 237, 0.1)", borderColor: "rgba(124, 58, 237, 0.3)" },
  ],
  trades: [
    { name: "Rookie", title: "New Trader", min: 0, max: 9, color: "#9CA3AF", bgColor: "rgba(156, 163, 175, 0.1)", borderColor: "rgba(156, 163, 175, 0.3)" },
    { name: "Active", title: "Regular Trader", min: 10, max: 99, color: "#60A5FA", bgColor: "rgba(96, 165, 250, 0.1)", borderColor: "rgba(96, 165, 250, 0.3)" },
    { name: "Pro", title: "Professional Trader", min: 100, max: 499, color: "#D4AF37", bgColor: "rgba(212, 175, 55, 0.1)", borderColor: "rgba(212, 175, 55, 0.3)" },
    { name: "Veteran", title: "Seasoned Trader", min: 500, max: 1999, color: "#7DD3FC", bgColor: "rgba(125, 211, 252, 0.1)", borderColor: "rgba(125, 211, 252, 0.3)" },
    { name: "Legend", title: "Trading Legend", min: 2000, max: null, color: "#7C3AED", bgColor: "rgba(124, 58, 237, 0.1)", borderColor: "rgba(124, 58, 237, 0.3)" },
  ],
  pnl: [
    { name: "Negative", title: "Losses Recorded", min: -Infinity, max: -0.01, color: "#EF4444", bgColor: "rgba(239, 68, 68, 0.1)", borderColor: "rgba(239, 68, 68, 0.3)" },
    { name: "Neutral", title: "Minimal Gains", min: 0, max: 999, color: "#9CA3AF", bgColor: "rgba(156, 163, 175, 0.1)", borderColor: "rgba(156, 163, 175, 0.3)" },
    { name: "Positive", title: "Profitable Trader", min: 1000, max: 9999, color: "#10B981", bgColor: "rgba(16, 185, 129, 0.1)", borderColor: "rgba(16, 185, 129, 0.3)" },
    { name: "High-Gain", title: "High Performer", min: 10000, max: 99999, color: "#D4AF37", bgColor: "rgba(212, 175, 55, 0.1)", borderColor: "rgba(212, 175, 55, 0.3)" },
    { name: "Exceptional", title: "Exceptional Trader", min: 100000, max: null, color: "#7C3AED", bgColor: "rgba(124, 58, 237, 0.1)", borderColor: "rgba(124, 58, 237, 0.3)" },
  ],
  roi: [
    { name: "Low", title: "Negative Returns", min: -Infinity, max: -0.01, color: "#EF4444", bgColor: "rgba(239, 68, 68, 0.1)", borderColor: "rgba(239, 68, 68, 0.3)" },
    { name: "Moderate", title: "Steady Returns", min: 0, max: 9.99, color: "#9CA3AF", bgColor: "rgba(156, 163, 175, 0.1)", borderColor: "rgba(156, 163, 175, 0.3)" },
    { name: "Good", title: "Strong Returns", min: 10, max: 29.99, color: "#10B981", bgColor: "rgba(16, 185, 129, 0.1)", borderColor: "rgba(16, 185, 129, 0.3)" },
    { name: "Excellent", title: "Exceptional Returns", min: 30, max: 99.99, color: "#D4AF37", bgColor: "rgba(212, 175, 55, 0.1)", borderColor: "rgba(212, 175, 55, 0.3)" },
    { name: "Elite", title: "Elite Performer", min: 100, max: null, color: "#7C3AED", bgColor: "rgba(124, 58, 237, 0.1)", borderColor: "rgba(124, 58, 237, 0.3)" },
  ],
};

// Calculate tier for a given metric value
export function getTier(metricType: MetricType, value: number): TierConfig | null {
  const tiers = TIER_THRESHOLDS[metricType];
  
  for (const tier of tiers) {
    if (value >= tier.min && (tier.max === null || value <= tier.max)) {
      return tier;
    }
  }
  
  return null;
}

// Get progress to next tier
export function getProgressToNextTier(metricType: MetricType, value: number): {
  currentTier: TierConfig | null;
  nextTier: TierConfig | null;
  progress: number; // 0-100
  remaining: number;
} {
  const tiers = TIER_THRESHOLDS[metricType];
  const currentTier = getTier(metricType, value);
  
  if (!currentTier) {
    return { currentTier: null, nextTier: null, progress: 0, remaining: 0 };
  }
  
  // Find next tier
  const currentIndex = tiers.findIndex(t => t.name === currentTier.name);
  const nextTier = currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
  
  if (!nextTier) {
    // Already at max tier
    return { currentTier, nextTier: null, progress: 100, remaining: 0 };
  }
  
  const range = nextTier.min - currentTier.min;
  const progress = ((value - currentTier.min) / range) * 100;
  const remaining = nextTier.min - value;
  
  return {
    currentTier,
    nextTier,
    progress: Math.min(100, Math.max(0, progress)),
    remaining: Math.max(0, remaining),
  };
}

// Tooltip descriptions for each tier
export const TIER_TOOLTIPS: Record<MetricType, Record<string, { title: string; description: string; range: string }>> = {
  volume: {
    Bronze: { title: "Starting Trader", description: "Starting tier for new traders building their trading portfolio.", range: "$0–$9,999 total volume" },
    Silver: { title: "Active Trader", description: "Active trader with growing experience and consistent activity.", range: "$10,000–$49,999 total volume" },
    Gold: { title: "Experienced Trader", description: "Higher discovery ranking and gold profile outline. Featured in search results.", range: "$50,000–$199,999 total volume" },
    Platinum: { title: "Elite Trader", description: "Featured in leaderboards and priority support. Top-tier visibility.", range: "$200,000–$999,999 total volume" },
    Diamond: { title: "Master Trader", description: "Top-tier trader with maximum visibility and benefits. Premium status.", range: "$1,000,000+ total volume" },
  },
  trades: {
    Rookie: { title: "New Trader", description: "New to the platform, just getting started with trading.", range: "0–9 trades" },
    Active: { title: "Regular Trader", description: "Regular trading activity showing commitment to the platform.", range: "10–99 trades" },
    Pro: { title: "Professional Trader", description: "Experienced trader with consistent activity and proven track record.", range: "100–499 trades" },
    Veteran: { title: "Seasoned Trader", description: "Highly experienced with extensive trading history and deep market knowledge.", range: "500–1,999 trades" },
    Legend: { title: "Trading Legend", description: "Elite trader with exceptional activity and experience. Recognized expert.", range: "2,000+ trades" },
  },
  pnl: {
    Negative: { title: "Losses Recorded", description: "Review trading strategy and risk management. Consider adjusting approach.", range: "< $0 PnL" },
    Neutral: { title: "Minimal Gains", description: "Minimal gains or losses. Building experience and refining strategy.", range: "$0–$999 PnL" },
    Positive: { title: "Profitable Trader", description: "Profitable trading performance showing consistent gains.", range: "$1,000–$9,999 PnL" },
    "High-Gain": { title: "High Performer", description: "Strong profitable performance with significant returns.", range: "$10,000–$99,999 PnL" },
    Exceptional: { title: "Exceptional Trader", description: "Outstanding trading results demonstrating exceptional skill and strategy.", range: "$100,000+ PnL" },
  },
  roi: {
    Low: { title: "Negative Returns", description: "Review trading strategy and risk management. Focus on risk-adjusted returns.", range: "< 0% ROI" },
    Moderate: { title: "Steady Returns", description: "Steady but conservative returns. Consistent performance.", range: "0%–9.99% ROI" },
    Good: { title: "Strong Returns", description: "Strong consistent returns showing solid trading skills.", range: "10%–29.99% ROI" },
    Excellent: { title: "Exceptional Returns", description: "Exceptional returns with consistent performance. Top-tier results.", range: "30%–99.99% ROI" },
    Elite: { title: "Elite Performer", description: "Outstanding returns indicating exceptional trading skill and market expertise.", range: "100%+ ROI" },
  },
};

// Get tooltip data for a tier
export function getTierTooltip(metricType: MetricType, tierName: string): { title: string; description: string; range: string } {
  return TIER_TOOLTIPS[metricType][tierName] || { title: tierName, description: `${tierName} tier`, range: "" };
}

// Check if tier is premium (Gold, Platinum, Diamond)
export function isPremiumTier(tierName: string): boolean {
  return ["Gold", "Platinum", "Diamond", "Veteran", "Legend", "High-Gain", "Exceptional", "Excellent", "Elite"].includes(tierName);
}

