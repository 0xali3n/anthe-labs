"use client";

import { useState } from "react";
import { Download, Check, Copy } from "lucide-react";
import { Palanquin_Dark } from "next/font/google";
import Image from "next/image";
import Link from "next/link";

const palanquinDark = Palanquin_Dark({
  weight: ["400", "700"],
  subsets: ["latin"],
});

interface MediaAsset {
  name: string;
  description: string;
  file: string;
  format: string;
  size: string;
  category: "logo" | "icon";
}

const mediaAssets: MediaAsset[] = [
  {
    name: "Full Logo",
    description: "Complete Anthe Labs logo with brand name",
    file: "/mediakit/Full Logo.png",
    format: "PNG",
    size: "High Resolution",
    category: "logo",
  },
  {
    name: "Favicon (Colour)",
    description: "Coloured favicon for light backgrounds",
    file: "/mediakit/Favicon Colour.png",
    format: "PNG",
    size: "High Resolution",
    category: "icon",
  },
  {
    name: "Favicon (White)",
    description: "White favicon for dark backgrounds",
    file: "/mediakit/favicon white.png",
    format: "PNG",
    size: "High Resolution",
    category: "icon",
  },
];

export default function MediaKitPage() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleDownload = async (asset: MediaAsset) => {
    setDownloading(asset.file);
    try {
      const response = await fetch(asset.file);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = asset.file.split("/").pop() || asset.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setDownloading(null);
    }
  };

  const copyImageUrl = async (file: string) => {
    try {
      const fullUrl = `${window.location.origin}${file}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(file);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 relative">
      {/* Background Pattern */}
      <div
        className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      <div className="max-w-6xl mx-auto pt-24 pb-16 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h1
            className={`${palanquinDark.className} text-3xl sm:text-4xl md:text-5xl font-semibold text-white mb-4 tracking-tight`}
          >
            Media Kit
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Download official Anthe Labs logos and brand assets. Please use our
            brand assets responsibly and in accordance with our brand guidelines.
          </p>
        </div>

        {/* All Logos - Side by Side */}
        <div className="mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {mediaAssets.map((asset) => (
              <div
                key={asset.file}
                className="group rounded-xl p-4 transition-all duration-300 border border-slate-800/50 bg-slate-900/30 hover:bg-slate-900/50 hover:border-slate-700/50"
              >
                {/* Preview */}
                <div
                  className={`rounded-lg p-6 mb-3 flex items-center justify-center border bg-slate-900/50 border-slate-800/50 ${
                    asset.category === "logo"
                      ? "min-h-[200px]"
                      : "min-h-[180px]"
                  }`}
                >
                  <div
                    className={`relative ${
                      asset.category === "logo"
                        ? "w-full h-[140px] max-w-[280px]"
                        : "w-24 h-24"
                    }`}
                  >
                    <Image
                      src={asset.file}
                      alt={asset.name}
                      fill
                      className="object-contain"
                      unoptimized
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      onError={(e) => {
                        console.error("Image failed to load:", asset.file);
                        // Fallback to img tag if Next Image fails
                        const target = e.target as HTMLImageElement;
                        if (target.parentElement) {
                          const img = document.createElement("img");
                          img.src = asset.file;
                          img.alt = asset.name;
                          img.className = "object-contain w-full h-full";
                          target.parentElement.innerHTML = "";
                          target.parentElement.appendChild(img);
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Info */}
                <div className="mb-3">
                  <h3 className="text-white font-semibold text-sm mb-1">
                    {asset.name}
                  </h3>
                  <p className="text-slate-400 text-xs mb-2">
                    {asset.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{asset.format}</span>
                    <span>•</span>
                    <span>{asset.size}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(asset)}
                    disabled={downloading === asset.file}
                    className="flex-1 px-3 py-2 bg-blue-600/80 hover:bg-blue-600 border border-blue-500/50 hover:border-blue-400/50 text-white rounded-lg text-xs font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    {downloading === asset.file ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Downloading...</span>
                      </>
                    ) : (
                      <>
                        <Download size={14} />
                        <span>Download</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => copyImageUrl(asset.file)}
                    className="px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-slate-600/50 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-all duration-200 flex items-center justify-center"
                    title="Copy image URL"
                  >
                    {copied === asset.file ? (
                      <Check size={14} className="text-green-400" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Section */}
        <div className="text-center p-6 rounded-2xl bg-slate-900/50 border border-slate-800/50">
          <p className="text-slate-400 text-sm mb-4">
            Need additional assets or have questions about brand usage?
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600/80 hover:bg-blue-600 border border-blue-500/50 hover:border-blue-400/50 text-white rounded-lg text-sm font-semibold transition-all duration-200"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}

