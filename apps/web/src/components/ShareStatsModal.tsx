"use client";

import { useState, useEffect } from "react";
import { Download, X, Send, Copy, Check } from "lucide-react";
import { Outfit } from "next/font/google";
import { generateStatsImage } from "@/lib/generateStatsImage";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

interface ShareStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: {
    totalVolume: string;
    pnl: string;
    roi: string;
    numberOfTxns: string;
  };
  user: {
    walletAddress?: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

export default function ShareStatsModal({
  isOpen,
  onClose,
  stats,
  user,
}: ShareStatsModalProps) {
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showCopyNotification, setShowCopyNotification] = useState(false);

  // Get formatted stats
  const getFormattedStats = () => {
    return {
      volume: stats.totalVolume || "$0",
      pnl: stats.pnl || "$0",
      roi: stats.roi || "0.00%",
    };
  };

  // Get random template
  const getRandomTemplate = () => {
    const { volume, pnl, roi } = getFormattedStats();

    const templates = [
      `Check my metrics on Anthe Labs 🚀

📊 Volume: ${volume}
💹 PnL: ${pnl}
📈 ROI: ${roi}

Join me — trade on @AntheLabs
https://anthe.io`,
      `Tracking my trades on Anthe Labs 👀

📊 Volume: ${volume}
💹 PnL: ${pnl}
📈 ROI: ${roi}

Join me — trade on @AntheLabs 
https://anthe.io`,
      `Sharing my trading journey on Anthe Labs 🔥
      
📊 Volume: ${volume}
💹 PnL: ${pnl}
📈 ROI: ${roi}

Join me — trade on @AntheLabs 
https://anthe.io`,
      `All my trading metrics, live on Anthe Labs ⚡
      
📊 Volume: ${volume}
💹 PnL: ${pnl}
📈 ROI: ${roi}

Join me — trade on @AntheLabs 
https://anthe.io`,
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  };

  // Copy template to clipboard
  const copyToClipboard = async (template?: string) => {
    try {
      const textToCopy = template || getRandomTemplate();
      await navigator.clipboard.writeText(textToCopy);
      setShowCopyNotification(true);
      setTimeout(() => setShowCopyNotification(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const shareOnTwitter = () => {
    const template = getRandomTemplate();
    copyToClipboard(template);
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(template)}`,
      "_blank"
    );
  };

  const shareOnTelegram = () => {
    const template = getRandomTemplate();
    copyToClipboard(template);
    const profileUrl = `${window.location.origin}/profile/${user.username}`;
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(profileUrl)}&text=${encodeURIComponent(template)}`,
      "_blank"
    );
  };

  // Generate image when modal opens
  useEffect(() => {
    if (isOpen && !previewImageUrl && !isGeneratingImage) {
      const generateImage = async () => {
        try {
          setIsGeneratingImage(true);

          const displayName =
            user.displayName || user.username || "User";
          const avatarUrl =
            user.avatarUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=6366f1&color=fff`;

          const blob = await generateStatsImage({
            stats: {
              totalVolume: stats.totalVolume,
              pnl: stats.pnl,
              roi: stats.roi,
              numberOfTxns: stats.numberOfTxns,
              walletAddress: user.walletAddress,
              username: user.username,
              displayName: displayName,
              avatarUrl: avatarUrl,
            },
          });

          const url = URL.createObjectURL(blob);
          setPreviewImageUrl(url);
          setIsGeneratingImage(false);
        } catch (error) {
          console.error("Failed to generate stats image:", error);
          setIsGeneratingImage(false);
        }
      };

      generateImage();
    }

    // Reset preview when modal closes
    if (!isOpen && previewImageUrl) {
      URL.revokeObjectURL(previewImageUrl);
      setPreviewImageUrl(null);
      setIsGeneratingImage(false);
    }
  }, [isOpen, previewImageUrl, isGeneratingImage, stats, user]);

  const handleDownloadFromPreview = () => {
    if (!previewImageUrl) return;

    const a = document.createElement("a");
    a.href = previewImageUrl;
    a.download = `anthe-labs-stats-${user.username || "user"}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleClosePreview = () => {
    if (previewImageUrl) {
      URL.revokeObjectURL(previewImageUrl);
    }
    setPreviewImageUrl(null);
    setIsGeneratingImage(false);
    onClose();
  };

  // Handle ESC key and body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          handleClosePreview();
        }
      };

      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "";
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [isOpen]);

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl);
      }
    };
  }, [previewImageUrl]);

  if (!isOpen) return null;

  return (
    <>
      {/* Image Preview Modal */}
      {previewImageUrl && (
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
                className={`text-lg font-bold text-white`}
              >
                Share Performance
              </h3>
            </div>

            {/* Image Preview */}
            <div className="mb-4 overflow-hidden rounded-lg bg-[#050709]">
              <img
                src={previewImageUrl}
                alt="Stats preview"
                className="w-full h-auto block"
              />
            </div>

            {/* Download Button */}
            <div className="flex justify-center">
              <button
                onClick={handleDownloadFromPreview}
                className={`flex items-center justify-center gap-2 px-6 py-2.5 bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white rounded-lg font-semibold transition-colors min-w-[500px] ${outfit.className}`}
              >
                <Download size={16} />
                <span>Download image</span>
              </button>
            </div>

            {/* OR Text */}
            <div className="mt-4 text-center">
              <span className="text-xs text-slate-400">OR</span>
            </div>

            {/* Share Options */}
            <div className="mt-3">
              <div className="flex items-center justify-center gap-2.5">
                <button
                  onClick={shareOnTwitter}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-colors border border-slate-700/50 shadow-sm"
                >
                  <img src="/x.svg" alt="X" className="w-3 h-3" />
                  <span className="text-slate-300 text-xs font-medium">
                    Share on X
                  </span>
                </button>
                <button
                  onClick={shareOnTelegram}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-colors border border-slate-700/50 shadow-sm"
                >
                  <Send size={14} className="text-slate-300" />
                  <span className="text-slate-300 text-xs font-medium">
                    Share on Telegram
                  </span>
                </button>
                <button
                  onClick={() => copyToClipboard()}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-colors border border-slate-700/50 shadow-sm"
                >
                  <Copy size={14} className="text-slate-300" />
                  <span className="text-slate-300 text-xs font-medium">
                    Copy
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copy Notification Toast */}
      {showCopyNotification && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-[#0a0c12] border border-slate-700/50 rounded-lg px-4 py-3 shadow-2xl flex items-center gap-2">
            <Check size={18} className="text-green-400" />
            <span className="text-white text-sm font-medium">
              Copied to clipboard!
            </span>
          </div>
        </div>
      )}
    </>
  );
}

