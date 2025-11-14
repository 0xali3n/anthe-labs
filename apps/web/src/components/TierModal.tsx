"use client";

import { X } from "lucide-react";
import { TIER_THRESHOLDS, MetricType, getTierTooltip } from "@/lib/tiers";
import { useEffect, useRef } from "react";

interface TierModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TierModal({ isOpen, onClose }: TierModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Store previously focused element
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Focus trap
      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== "Tab") return;

        const modal = modalRef.current;
        if (!modal) return;

        const focusableElements = modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      };

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      };

      document.addEventListener("keydown", handleTab);
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";

      // Focus close button on open
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);

      return () => {
        document.removeEventListener("keydown", handleTab);
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "unset";
        // Restore previous focus
        previousFocusRef.current?.focus();
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatRange = (min: number, max: number | null, type: MetricType) => {
    const prefix = type === "volume" || type === "pnl" ? "$" : "";
    const suffix = type === "roi" ? "%" : "";
    const minFormatted = min === -Infinity ? "Negative" : `${prefix}${min.toLocaleString()}${suffix}`;
    const maxFormatted = max === null ? "+" : `${prefix}${max.toLocaleString()}${suffix}`;
    return `${minFormatted} - ${maxFormatted}`;
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="bg-[#0F1318] border border-[#1F242D] rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        style={{
          boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tier-modal-title"
      >
        <div className="sticky top-0 bg-gradient-to-b from-[#0F1318] to-[#0B0E13] border-b border-[#1F242D] px-8 py-5 flex items-center justify-between backdrop-blur-sm">
          <div>
            <h2 id="tier-modal-title" className="text-2xl font-bold text-white mb-1">Tier System</h2>
            <p className="text-sm text-slate-400">Understand how trader tiers work. Higher tiers get better visibility, badges, and premium features.</p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-all duration-200 p-2 hover:bg-slate-800/50 rounded-lg hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 focus:ring-offset-[#0F1318]"
            aria-label="Close Tier modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-10 overflow-y-auto max-h-[calc(90vh-100px)]">
          {/* Volume Tiers */}
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Total Volume</h3>
            <p className="text-sm text-slate-400 mb-6">Trading volume determines your tier level</p>
            <div className="space-y-3">
              {TIER_THRESHOLDS.volume.map((tier) => (
                <div
                  key={tier.name}
                  className="flex items-start gap-5 p-5 bg-gradient-to-br from-[#0B0E13] to-[#0A0C10] border border-[#1F242D] rounded-xl hover:border-[#2A313D] transition-all duration-200 hover:shadow-lg"
                  style={{
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center border-2 flex-shrink-0"
                    style={{
                      borderColor: tier.borderColor,
                      backgroundColor: tier.bgColor,
                      boxShadow: `0 0 20px ${tier.color}20`,
                    }}
                  >
                    <span className="text-lg font-bold" style={{ color: tier.color }}>
                      {tier.name[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-bold text-white" style={{ color: tier.color }}>
                        {tier.title}
                      </span>
                      <span className="px-2.5 py-1 text-xs font-semibold bg-slate-800/50 border border-slate-700/50 rounded-md text-slate-300">
                        {formatRange(tier.min, tier.max, "volume")}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">{getTierTooltip("volume", tier.name).description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trades Tiers */}
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Number of Trades</h3>
            <p className="text-sm text-slate-400 mb-6">Activity level based on total trades executed</p>
            <div className="space-y-3">
              {TIER_THRESHOLDS.trades.map((tier) => (
                <div
                  key={tier.name}
                  className="flex items-start gap-5 p-5 bg-gradient-to-br from-[#0B0E13] to-[#0A0C10] border border-[#1F242D] rounded-xl hover:border-[#2A313D] transition-all duration-200 hover:shadow-lg"
                  style={{
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center border-2 flex-shrink-0"
                    style={{
                      borderColor: tier.borderColor,
                      backgroundColor: tier.bgColor,
                      boxShadow: `0 0 20px ${tier.color}20`,
                    }}
                  >
                    <span className="text-lg font-bold" style={{ color: tier.color }}>
                      {tier.name[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-bold text-white" style={{ color: tier.color }}>
                        {tier.title}
                      </span>
                      <span className="px-2.5 py-1 text-xs font-semibold bg-slate-800/50 border border-slate-700/50 rounded-md text-slate-300">
                        {formatRange(tier.min, tier.max || 0, "trades")} trades
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">{getTierTooltip("trades", tier.name).description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PnL Tiers */}
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Profit & Loss (PnL)</h3>
            <p className="text-sm text-slate-400 mb-6">Tier based on total profit and loss performance</p>
            <div className="space-y-3">
              {TIER_THRESHOLDS.pnl.map((tier) => (
                <div
                  key={tier.name}
                  className="flex items-start gap-5 p-5 bg-gradient-to-br from-[#0B0E13] to-[#0A0C10] border border-[#1F242D] rounded-xl hover:border-[#2A313D] transition-all duration-200 hover:shadow-lg"
                  style={{
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center border-2 flex-shrink-0"
                    style={{
                      borderColor: tier.borderColor,
                      backgroundColor: tier.bgColor,
                      boxShadow: `0 0 20px ${tier.color}20`,
                    }}
                  >
                    <span className="text-lg font-bold" style={{ color: tier.color }}>
                      {tier.name[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-bold text-white" style={{ color: tier.color }}>
                        {tier.title}
                      </span>
                      <span className="px-2.5 py-1 text-xs font-semibold bg-slate-800/50 border border-slate-700/50 rounded-md text-slate-300">
                        {formatRange(tier.min === -Infinity ? -999999 : tier.min, tier.max, "pnl")}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">{getTierTooltip("pnl", tier.name).description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ROI Tiers */}
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Return on Investment (ROI)</h3>
            <p className="text-sm text-slate-400 mb-6">Tier based on percentage returns achieved</p>
            <div className="space-y-3">
              {TIER_THRESHOLDS.roi.map((tier) => (
                <div
                  key={tier.name}
                  className="flex items-start gap-5 p-5 bg-gradient-to-br from-[#0B0E13] to-[#0A0C10] border border-[#1F242D] rounded-xl hover:border-[#2A313D] transition-all duration-200 hover:shadow-lg"
                  style={{
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center border-2 flex-shrink-0"
                    style={{
                      borderColor: tier.borderColor,
                      backgroundColor: tier.bgColor,
                      boxShadow: `0 0 20px ${tier.color}20`,
                    }}
                  >
                    <span className="text-lg font-bold" style={{ color: tier.color }}>
                      {tier.name[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-bold text-white" style={{ color: tier.color }}>
                        {tier.title}
                      </span>
                      <span className="px-2.5 py-1 text-xs font-semibold bg-slate-800/50 border border-slate-700/50 rounded-md text-slate-300">
                        {formatRange(tier.min === -Infinity ? -100 : tier.min, tier.max, "roi")}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">{getTierTooltip("roi", tier.name).description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

