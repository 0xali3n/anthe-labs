"use client";

import { TierConfig, isPremiumTier, getProgressToNextTier } from "@/lib/tiers";
import { Award } from "lucide-react";
import { useState, useRef } from "react";

interface TierBadgeProps {
  tier: TierConfig | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  tooltip?: string | { title: string; description: string; range: string };
  className?: string;
}

export function TierMedallion({ tier, size = "md", showLabel = true, tooltip, className = "" }: TierBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  if (!tier) {
    return null;
  }

  const isPremium = isPremiumTier(tier.name);
  // Only show glow for top premium tiers (Platinum/Diamond)
  const shouldGlow = ["Platinum", "Diamond", "Legend", "Exceptional", "Elite"].includes(tier.name);
  
  const sizeClasses = {
    sm: "w-10 h-10 text-xs", // 40px
    md: "w-16 h-16 text-sm", // 64px
    lg: "w-20 h-20 text-base", // 80px
  };

  const iconSizes = {
    sm: 16, // 16px icon
    md: 24, // 24px icon
    lg: 32, // 32px icon
  };

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full border-2 flex items-center justify-center relative transition-all duration-300 hover:scale-110`}
        style={{
          borderColor: tier.borderColor,
          background: `linear-gradient(135deg, ${tier.bgColor}, rgba(15, 23, 42, 0.5))`,
          boxShadow: shouldGlow
            ? `0 8px 40px ${tier.color}10, inset 0 1px 0 rgba(255,255,255,0.1)`
            : "inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
        onMouseEnter={() => tooltip && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => tooltip && setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        tabIndex={tooltip ? 0 : undefined}
        role={tooltip ? "button" : undefined}
        aria-label={tooltip || tier.name}
      >
        <Award size={iconSizes[size]} style={{ color: tier.color }} />
        {isPremium && (
          <div
            className="absolute inset-0 rounded-full opacity-30"
            style={{
              background: `radial-gradient(circle, ${tier.color}40, transparent 70%)`,
            }}
          />
        )}
      </div>
      {showLabel && (
        <span
          className="text-xs font-medium mt-1"
          style={{ color: tier.color }}
        >
          {tier.name}
        </span>
      )}
      {showTooltip && tooltip && (
        <div
          ref={tooltipRef}
          className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-5 py-4 bg-[#0F1318] border border-[#1F242D] rounded-xl z-50 shadow-2xl backdrop-blur-sm"
          style={{
            maxWidth: "320px",
            whiteSpace: "normal",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)",
          }}
        >
          {typeof tooltip === "string" ? (
            <p className="text-sm text-[#E5E7EB] leading-relaxed">{tooltip}</p>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: tier.color }}
                />
                <h4 className="text-base font-bold text-white" style={{ color: tier.color }}>
                  {tooltip.title}
                </h4>
              </div>
              <div className="pl-3.5 border-l-2" style={{ borderColor: tier.borderColor }}>
                <p className="text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  {tooltip.range}
                </p>
                <p className="text-sm text-slate-400 leading-relaxed">{tooltip.description}</p>
              </div>
            </div>
          )}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-[#0F1318] border-r border-b border-[#1F242D] rotate-45"
            style={{ boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)" }}
          />
        </div>
      )}
    </div>
  );
}

interface TierChipProps {
  tier: TierConfig | null;
  tooltip?: string | { title: string; description: string; range: string };
  className?: string;
}

export function TierChip({ tier, tooltip, className = "" }: TierChipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  if (!tier) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/50 border border-[#1F242D] text-xs text-slate-500 ${className}`}>
        No Tier
      </div>
    );
  }

  return (
    <div className={`relative inline-flex items-center gap-1.5 ${className}`}>
      <div
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-200 hover:scale-105"
        style={{
          backgroundColor: tier.bgColor,
          borderColor: tier.borderColor,
          borderLeftWidth: "3px",
          borderLeftColor: tier.color,
          color: tier.color,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
        }}
        onMouseEnter={() => tooltip && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => tooltip && setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        tabIndex={tooltip ? 0 : undefined}
        role={tooltip ? "button" : undefined}
        aria-label={tooltip || tier.name}
      >
        <Award size={12} />
        <span>{tier.name}</span>
      </div>
      {showTooltip && tooltip && (
        <div
          ref={tooltipRef}
          className="absolute bottom-full mb-3 left-0 px-5 py-4 bg-[#0F1318] border border-[#1F242D] rounded-xl z-50 shadow-2xl backdrop-blur-sm"
          style={{
            maxWidth: "320px",
            whiteSpace: "normal",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)",
          }}
        >
          {typeof tooltip === "string" ? (
            <p className="text-sm text-[#E5E7EB] leading-relaxed">{tooltip}</p>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: tier.color }}
                />
                <h4 className="text-base font-bold text-white" style={{ color: tier.color }}>
                  {tooltip.title}
                </h4>
              </div>
              <div className="pl-3.5 border-l-2" style={{ borderColor: tier.borderColor }}>
                <p className="text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  {tooltip.range}
                </p>
                <p className="text-sm text-slate-400 leading-relaxed">{tooltip.description}</p>
              </div>
            </div>
          )}
          <div
            className="absolute top-full left-5 -mt-1 w-2.5 h-2.5 bg-[#0F1318] border-r border-b border-[#1F242D] rotate-45"
            style={{ boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)" }}
          />
        </div>
      )}
    </div>
  );
}

interface TierProgressBarProps {
  metricType: "volume" | "trades" | "pnl" | "roi";
  value: number;
  className?: string;
}

export function TierProgressBar({ metricType, value, className = "" }: TierProgressBarProps) {
  const { currentTier, nextTier, progress, remaining } = getProgressToNextTier(metricType, value);

  if (!currentTier || !nextTier) {
    return null;
  }

  const progressRounded = Math.round(progress);
  const hasProgress = progress > 0;

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">
          Progress to {nextTier.name}
        </span>
        <span className="text-slate-300 font-medium">
          {progress.toFixed(1)}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressRounded}
        aria-label={`Progress to ${nextTier.name} tier: ${progress.toFixed(1)}%`}
        className="h-1.5 bg-[#1F242D] rounded-full overflow-hidden"
      >
        <div
          className="h-full rounded-full transition-all ease-out"
          style={{
            width: `${progress}%`,
            backgroundColor: currentTier.color,
            boxShadow: hasProgress ? `0 0 8px ${currentTier.color}40` : "none",
            transitionDuration: "600ms",
          }}
        />
      </div>
      {remaining > 0 ? (
        <p className="text-xs text-slate-500">
          {remaining.toLocaleString()} {metricType === "volume" ? "$" : metricType === "trades" ? "trades" : metricType === "pnl" ? "$" : "%"} to {nextTier.name}
        </p>
      ) : progress === 0 ? (
        <p className="text-xs text-slate-500">No progress yet</p>
      ) : null}
    </div>
  );
}

