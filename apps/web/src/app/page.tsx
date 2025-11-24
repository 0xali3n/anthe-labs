"use client";

import Link from "next/link";
import { Palanquin_Dark, Outfit } from "next/font/google";
import {
  ArrowRight,
  TrendingUp,
  Shield,
  Zap,
  Users,
  BarChart3,
  Copy,
  Grid3x3,
  Bot,
  MessageSquare,
  Lock,
  ExternalLink,
  Globe,
  Target,
  Cpu,
} from "lucide-react";
import { useEffect, useState } from "react";

const palanquinDark = Palanquin_Dark({
  weight: ["400", "700"],
  subsets: ["latin"],
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});


export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [counters, setCounters] = useState({
    volume: 0,
    traders: 0,
    roi: 0,
    uptime: 0,
  });

  useEffect(() => {
    setMounted(true);

    // Animate counters
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;

    const animateCounter = (
      start: number,
      end: number,
      callback: (val: number) => void
    ) => {
      let current = start;
      const increment = (end - start) / steps;
      const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
          callback(end);
          clearInterval(timer);
        } else {
          callback(Math.floor(current * 10) / 10);
        }
      }, interval);
    };

    setTimeout(() => {
      animateCounter(0, 2400, (val) =>
        setCounters((c) => ({ ...c, volume: val }))
      );
      animateCounter(0, 1200, (val) =>
        setCounters((c) => ({ ...c, traders: val }))
      );
      animateCounter(0, 15.8, (val) =>
        setCounters((c) => ({ ...c, roi: val }))
      );
      animateCounter(0, 99.9, (val) =>
        setCounters((c) => ({ ...c, uptime: val }))
      );
    }, 500);
  }, []);

  // Scannable feature tiles (6 max)
  const features = [
    {
      icon: Copy,
      title: "Copy Trading",
      description: "Mirror elite traders automatically.",
      status: "live",
    },
    {
      icon: Grid3x3,
      title: "Grid Bots",
      description: "Turnkey grid strategies for steady returns.",
      status: "coming",
    },
    {
      icon: Bot,
      title: "AI Bots",
      description: "ML-powered, adaptive execution.",
      status: "coming",
    },
    {
      icon: MessageSquare,
      title: "Social Feed",
      description: "Discover & follow traders you trust.",
      status: "coming",
    },
    {
      icon: BarChart3,
      title: "Analytics",
      description: "Live P&L, risk & performance metrics.",
      status: "live",
    },
    {
      icon: Lock,
      title: "Security",
      description: "Non-custodial wallet + audited contracts.",
      status: "live",
    },
  ];

  const stats = [
    { value: `$${counters.volume}K+`, label: "Total Volume" },
    { value: `${counters.traders}+`, label: "Active Traders" },
    { value: `${counters.roi.toFixed(1)}%`, label: "Avg ROI" },
    { value: `${counters.uptime.toFixed(1)}%`, label: "Uptime" },
  ];

  const testimonials = [
    {
      name: "Karthik Subramanian",
      role: "@ns_karthik",
      verified: true,
      timestamp: "Oct 28",
      content:
        "an extremely satisfying addition to the family. always believed that hackathons are the birthplace of great things. to see one more product being composed on top and to be able to support this and many more such builders, is a fantastic feeling",
      avatar: "/karthik.png",
      link: "https://x.com/ns_karthik/status/1983220910963233181?s=20",
    },
    {
      name: "Xyra Labs",
      role: "@xyralabs_",
      verified: true,
      timestamp: "Oct 28",
      content:
        "Every great product starts with a bold vision and Anthe embodies that. ⚡\n\nWe're proud to announce our first incubation: @AntheLabs\n\n@AntheLabs is building the social + intelligence layer for on-chain trading - where anyone can follow top traders, copy their strategies, and automate trades in real-time.\n\nWelcome to the @xyralabs_ Family 💙",
      avatar: "/xyralabs.png",
      link: "https://x.com/xyralabs_/status/1983220290571383009?s=20",
    },
    {
      name: "M",
      role: "@M_createz",
      verified: true,
      timestamp: "Oct 28",
      content:
        "@AntheLabs is officially being incubated by @xyralabs_ 👋\n\nAnthe is building the next-gen social trading infrastructure, combining:\n\n• Real-time Copy Trading\n• Social Trading Feed\n• Smart Grid & DCA Bots\n• Analytics & Creator Monetization\n\nA platform where traders and investors connect, share, and grow together.",
      avatar: "/m.png",
      link: "https://x.com/M_createz/status/1983222318609617351?s=20",
    },
  ];

  return (
    <div className="min-h-screen relative">
      {/* Cleaner Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
        {/* Subtle accent in top corner */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-72 pb-32 px-4 sm:px-6 lg:px-8">
        {/* Cosmic Trading Curve Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ background: 'linear-gradient(135deg, #060913 0%, #0A0F1F 100%)' }}>

          {/* Saturn Planet + Rotating Rings System */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1400 900" preserveAspectRatio="xMidYMin slice">
            <defs>
              <radialGradient id="planetGradient" cx="50%" cy="50%">
                <stop offset="0%" stopColor="rgba(120, 130, 150, 0.4)" />
                <stop offset="60%" stopColor="rgba(90, 100, 120, 0.3)" />
                <stop offset="100%" stopColor="rgba(60, 70, 90, 0.1)" />
              </radialGradient>

              <radialGradient id="planetGlow" cx="50%" cy="50%">
                <stop offset="0%" stopColor="rgba(96, 165, 250, 0.15)" />
                <stop offset="70%" stopColor="rgba(59, 130, 246, 0.05)" />
                <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
              </radialGradient>

              <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(100, 116, 139, 0.1)" />
                <stop offset="20%" stopColor="rgba(96, 165, 250, 0.3)" />
                <stop offset="50%" stopColor="rgba(125, 211, 252, 0.5)" />
                <stop offset="80%" stopColor="rgba(96, 165, 250, 0.3)" />
                <stop offset="100%" stopColor="rgba(100, 116, 139, 0.1)" />
              </linearGradient>

              <filter id="ringGlow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="signalGlow">
                <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Top-Middle Saturn Position: cx=700, cy=50 (lowered below navbar) */}

            {/* Outer Glow */}
            <ellipse cx="700" cy="50" rx="400" ry="200" fill="url(#planetGlow)" opacity="0.5" />

            {/* Planet Body */}
            <ellipse cx="700" cy="50" rx="180" ry="140" fill="url(#planetGradient)" opacity="0.8" />

            {/* Surface Bands */}
            <ellipse cx="700" cy="70" rx="170" ry="20" fill="rgba(110, 120, 140, 0.2)" opacity="0.5" />
            <ellipse cx="700" cy="110" rx="160" ry="18" fill="rgba(80, 90, 110, 0.15)" opacity="0.4" />
            <ellipse cx="700" cy="150" rx="150" ry="15" fill="rgba(60, 70, 90, 0.15)" opacity="0.3" />

            {/* 14 Rings Surrounding Saturn */}

            {/* Ring 1 (Inner) */}
            <ellipse cx="700" cy="50" rx="240" ry="160" fill="none" stroke="rgba(96, 165, 250, 0.2)" strokeWidth="1" opacity="0.4">
              <animateTransform attributeName="transform" type="rotate" from="0 700 50" to="360 700 50" dur="200s" repeatCount="indefinite" />
            </ellipse>

            {/* Ring 2 */}
            <ellipse cx="700" cy="50" rx="280" ry="185" fill="none" stroke="rgba(125, 211, 252, 0.25)" strokeWidth="1.5" opacity="0.5">
              <animateTransform attributeName="transform" type="rotate" from="0 700 50" to="360 700 50" dur="190s" repeatCount="indefinite" />
            </ellipse>

            {/* Ring 3 */}
            <ellipse cx="700" cy="50" rx="320" ry="210" fill="none" stroke="rgba(96, 165, 250, 0.3)" strokeWidth="2" opacity="0.6">
              <animateTransform attributeName="transform" type="rotate" from="0 700 50" to="360 700 50" dur="180s" repeatCount="indefinite" />
            </ellipse>

            {/* Ring 4 */}
            <ellipse cx="700" cy="50" rx="360" ry="235" fill="none" stroke="url(#ringGradient)" strokeWidth="3" opacity="0.7" filter="url(#ringGlow)">
              <animateTransform attributeName="transform" type="rotate" from="0 700 50" to="360 700 50" dur="170s" repeatCount="indefinite" />
            </ellipse>

            {/* Ring 5 */}
            <ellipse cx="700" cy="50" rx="400" ry="260" fill="none" stroke="rgba(125, 211, 252, 0.35)" strokeWidth="2" opacity="0.6">
              <animateTransform attributeName="transform" type="rotate" from="0 700 50" to="360 700 50" dur="160s" repeatCount="indefinite" />
            </ellipse>

            {/* Ring 6 */}
            <ellipse cx="700" cy="50" rx="440" ry="285" fill="none" stroke="rgba(96, 165, 250, 0.3)" strokeWidth="1.5" opacity="0.5">
              <animateTransform attributeName="transform" type="rotate" from="0 700 50" to="360 700 50" dur="150s" repeatCount="indefinite" />
            </ellipse>

            {/* Ring 7 - Cassini Division Gap Area */}
            <ellipse cx="700" cy="50" rx="480" ry="310" fill="none" stroke="rgba(100, 116, 139, 0.1)" strokeWidth="1" opacity="0.3">
              <animateTransform attributeName="transform" type="rotate" from="0 700 50" to="360 700 50" dur="145s" repeatCount="indefinite" />
            </ellipse>

            {/* Ring 8 */}
            <ellipse cx="700" cy="50" rx="540" ry="350" fill="none" stroke="url(#ringGradient)" strokeWidth="4" opacity="0.6" filter="url(#ringGlow)">
              <animateTransform attributeName="transform" type="rotate" from="0 700 50" to="360 700 50" dur="140s" repeatCount="indefinite" />
            </ellipse>

            {/* Ring 9 */}
            <ellipse cx="700" cy="50" rx="600" ry="390" fill="none" stroke="rgba(125, 211, 252, 0.3)" strokeWidth="2.5" opacity="0.5">
              <animateTransform attributeName="transform" type="rotate" from="0 700 50" to="360 700 50" dur="130s" repeatCount="indefinite" />
            </ellipse>

            {/* Ring 10 */}
            <ellipse cx="700" cy="50" rx="660" ry="430" fill="none" stroke="rgba(96, 165, 250, 0.25)" strokeWidth="2" opacity="0.4">
              <animateTransform attributeName="transform" type="rotate" from="0 700 50" to="360 700 50" dur="120s" repeatCount="indefinite" />
            </ellipse>

            {/* Ring 11 */}
            <ellipse cx="700" cy="50" rx="740" ry="480" fill="none" stroke="rgba(100, 116, 139, 0.2)" strokeWidth="1.5" opacity="0.35">
              <animateTransform attributeName="transform" type="rotate" from="0 700 50" to="360 700 50" dur="110s" repeatCount="indefinite" />
            </ellipse>

            {/* Ring 12 */}
            <ellipse cx="700" cy="50" rx="820" ry="530" fill="none" stroke="rgba(96, 165, 250, 0.15)" strokeWidth="1" opacity="0.3">
              <animateTransform attributeName="transform" type="rotate" from="0 700 50" to="360 700 50" dur="100s" repeatCount="indefinite" />
            </ellipse>

            {/* Ring 13 */}
            <ellipse cx="700" cy="50" rx="920" ry="600" fill="none" stroke="rgba(125, 211, 252, 0.1)" strokeWidth="1" opacity="0.25">
              <animateTransform attributeName="transform" type="rotate" from="0 700 50" to="360 700 50" dur="90s" repeatCount="indefinite" />
            </ellipse>

            {/* Ring 14 (Outermost) */}
            <ellipse cx="700" cy="50" rx="1050" ry="680" fill="none" stroke="rgba(96, 165, 250, 0.05)" strokeWidth="0.5" opacity="0.2">
              <animateTransform attributeName="transform" type="rotate" from="0 700 50" to="360 700 50" dur="80s" repeatCount="indefinite" />
            </ellipse>

            {/* Orbiting Particles */}

            {/* Particle on Ring 1 (Inner) */}
            <circle r="2" fill="#93c5fd" filter="url(#signalGlow)">
              <animateMotion dur="200s" repeatCount="indefinite" begin="0s" path="M 940,50 A 240,160 0 1,1 460,50 A 240,160 0 1,1 940,50" />
              <animate attributeName="opacity" values="0.2;0.6;0.2" dur="3s" repeatCount="indefinite" />
            </circle>

            {/* Particle on Ring 2 */}
            <circle r="3" fill="#60a5fa" filter="url(#signalGlow)">
              <animateMotion dur="190s" repeatCount="indefinite" begin="5s" path="M 980,50 A 280,185 0 1,1 420,50 A 280,185 0 1,1 980,50" />
              <animate attributeName="opacity" values="0.3;0.8;0.3" dur="4s" repeatCount="indefinite" />
            </circle>

            {/* Particle on Ring 3 */}
            <circle r="2.5" fill="#3b82f6" filter="url(#signalGlow)">
              <animateMotion dur="180s" repeatCount="indefinite" begin="12s" path="M 1020,50 A 320,210 0 1,1 380,50 A 320,210 0 1,1 1020,50" />
              <animate attributeName="opacity" values="0.2;0.7;0.2" dur="4.5s" repeatCount="indefinite" />
            </circle>

            {/* Particle on Ring 4 */}
            <circle r="4" fill="#60a5fa" filter="url(#signalGlow)">
              <animateMotion dur="170s" repeatCount="indefinite" path="M 1060,50 A 360,235 0 1,1 340,50 A 360,235 0 1,1 1060,50" />
              <animate attributeName="opacity" values="0.4;1;0.4" dur="4s" repeatCount="indefinite" />
              <animate attributeName="r" values="3;5;3" dur="4s" repeatCount="indefinite" />
            </circle>

            {/* Particle on Ring 5 */}
            <circle r="3" fill="#06b6d4" filter="url(#signalGlow)">
              <animateMotion dur="160s" repeatCount="indefinite" begin="25s" path="M 1100,50 A 400,260 0 1,1 300,50 A 400,260 0 1,1 1100,50" />
              <animate attributeName="opacity" values="0.3;0.8;0.3" dur="5s" repeatCount="indefinite" />
            </circle>

            {/* Particle on Ring 6 */}
            <circle r="3.5" fill="#3b82f6" filter="url(#signalGlow)">
              <animateMotion dur="150s" repeatCount="indefinite" begin="15s" path="M 1140,50 A 440,285 0 1,1 260,50 A 440,285 0 1,1 1140,50" />
              <animate attributeName="opacity" values="0.2;0.7;0.2" dur="5s" repeatCount="indefinite" />
            </circle>

            {/* Particle on Ring 7 */}
            <circle r="2" fill="#93c5fd" filter="url(#signalGlow)">
              <animateMotion dur="145s" repeatCount="indefinite" begin="40s" path="M 1180,50 A 480,310 0 1,1 220,50 A 480,310 0 1,1 1180,50" />
              <animate attributeName="opacity" values="0.1;0.5;0.1" dur="3s" repeatCount="indefinite" />
            </circle>

            {/* Particle on Ring 8 */}
            <circle r="5" fill="#3b82f6" filter="url(#signalGlow)">
              <animateMotion dur="140s" repeatCount="indefinite" begin="20s" path="M 1240,50 A 540,350 0 1,1 160,50 A 540,350 0 1,1 1240,50" />
              <animate attributeName="opacity" values="0.3;1;0.3" dur="5s" repeatCount="indefinite" />
              <animate attributeName="r" values="3.5;6;3.5" dur="5s" repeatCount="indefinite" />
            </circle>

            {/* Particle on Ring 9 */}
            <circle r="3" fill="#06b6d4" filter="url(#signalGlow)">
              <animateMotion dur="130s" repeatCount="indefinite" begin="35s" path="M 1300,50 A 600,390 0 1,1 100,50 A 600,390 0 1,1 1300,50" />
              <animate attributeName="opacity" values="0.3;0.8;0.3" dur="4s" repeatCount="indefinite" />
            </circle>

            {/* Particle on Ring 10 */}
            <circle r="3.5" fill="#06b6d4" filter="url(#signalGlow)">
              <animateMotion dur="120s" repeatCount="indefinite" begin="50s" path="M 1360,50 A 660,430 0 1,1 40,50 A 660,430 0 1,1 1360,50" />
              <animate attributeName="opacity" values="0.4;0.9;0.4" dur="4.5s" repeatCount="indefinite" />
            </circle>

            {/* Particle on Ring 11 */}
            <circle r="2.5" fill="#60a5fa" filter="url(#signalGlow)">
              <animateMotion dur="110s" repeatCount="indefinite" begin="8s" path="M 1440,50 A 740,480 0 1,1 -40,50 A 740,480 0 1,1 1440,50" />
              <animate attributeName="opacity" values="0.2;0.6;0.2" dur="5s" repeatCount="indefinite" />
            </circle>

            {/* Particle on Ring 12 */}
            <circle r="4" fill="#60a5fa" filter="url(#signalGlow)">
              <animateMotion dur="100s" repeatCount="indefinite" begin="10s" path="M 1520,50 A 820,530 0 1,1 -120,50 A 820,530 0 1,1 1520,50" />
              <animate attributeName="opacity" values="0.2;0.8;0.2" dur="6s" repeatCount="indefinite" />
            </circle>

            {/* Particle on Ring 13 */}
            <circle r="3" fill="#93c5fd" filter="url(#signalGlow)">
              <animateMotion dur="90s" repeatCount="indefinite" begin="45s" path="M 1620,50 A 920,600 0 1,1 -220,50 A 920,600 0 1,1 1620,50" />
              <animate attributeName="opacity" values="0.1;0.6;0.1" dur="7s" repeatCount="indefinite" />
            </circle>

            {/* Particle on Ring 14 (Outermost) */}
            <circle r="2" fill="#93c5fd" filter="url(#signalGlow)">
              <animateMotion dur="80s" repeatCount="indefinite" begin="30s" path="M 1750,50 A 1050,680 0 1,1 -350,50 A 1050,680 0 1,1 1750,50" />
              <animate attributeName="opacity" values="0.1;0.4;0.1" dur="8s" repeatCount="indefinite" />
            </circle>

          </svg>

          {/* Very subtle tech grid overlay - extremely faint */}
          <div
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage: `linear-gradient(rgba(96, 165, 250, 0.15) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(96, 165, 250, 0.15) 1px, transparent 1px)`,
              backgroundSize: "100px 100px",
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto z-10 -mt-6">
          {/* Centered Content */}
          <div className="text-center max-w-4xl mx-auto">
            {/* Headline */}
            <h1
              className={`${palanquinDark.className} text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-[1.1] tracking-tight transition-all duration-1000 ${mounted
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
                }`}
            >
              <span className="text-white">
                COPY TRADE LIKE A PRO
              </span>
            </h1>

            {/* Subhead */}
            <p
              className={`text-lg sm:text-xl text-slate-400 mb-8 max-w-2xl mx-auto leading-relaxed transition-all duration-1000 delay-200 ${mounted
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
                }`}
            >
              Automatically mirror top traders, trading bots and social strategies
            </p>
            <p
              className={`text-lg sm:text-xl text-slate-400 mb-8 max-w-2xl mx-auto leading-relaxed -mt-8 font-bold transition-all duration-1000 delay-200 ${mounted
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
                }`}
            >
              Secure, Instant and Audited
            </p>

            {/* CTAs */}
            <div
              className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 transition-all duration-1000 delay-300 ${mounted
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
                }`}
            >
              <Link
                href="/leaderboard"
                className={`group flex items-center gap-2 px-8 py-4 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-lg font-semibold transition-all duration-300 shadow-lg shadow-blue-500/20 ${outfit.className}`}
              >
                Start Trading Now
                {/* <ArrowRight
                  size={18}
                  className="group-hover:translate-x-1 transition-transform"
                /> */}
              </Link>
              <Link
                href="/about"
                className={`px-8 py-4 bg-transparent border border-slate-700 hover:border-blue-500/50 text-white rounded-lg text-lg font-semibold transition-all duration-300 hover:bg-slate-900/30 ${outfit.className}`}
              >
                See Demo
              </Link>
            </div>

            {/* Micro-trust line */}
            <p
              className={`text-sm text-slate-500 transition-all duration-1000 delay-400 ${mounted
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
                }`}
            >
              Trusted by 1,200+ traders • Audited • Built on Aptos
            </p>
          </div>
        </div>
      </section>

      {/* Stats Strip - Simplified, no icons */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-y border-slate-800/50 bg-slate-900/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              return (
                <div
                  key={index}
                  className="flex flex-col items-center text-center group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="text-4xl font-bold text-blue-400 mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-slate-400 font-medium">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Grid - Minimal */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`${palanquinDark.className} text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight`}>
              Platform Features
            </h2>
            <p className="text-base text-slate-400 max-w-2xl mx-auto">
              Complete social trading ecosystem
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const isLive = feature.status === "live";
              return (
                <div
                  key={index}
                  className="group relative flex flex-col items-start p-6 rounded-2xl bg-slate-900/20 border border-slate-800/60 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:border-slate-700/60 hover:bg-slate-900/40"
                >
                  <div className="flex items-center justify-between w-full mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-inner ${isLive
                        ? "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20"
                        : "bg-slate-800/40 text-slate-500 ring-1 ring-slate-700/50"
                        }`}
                    >
                      <Icon size={24} />
                    </div>
                    {/* Badges */}
                    {isLive ? (
                      <div className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-sm">
                        Live
                      </div>
                    ) : (
                      <div className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-800/50 text-slate-500 border border-slate-700/50 shadow-sm">
                        Coming Soon
                      </div>
                    )}
                  </div>

                  <h3 className={`${palanquinDark.className} text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors`}>
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Partner/Audit Trust Strip */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 border-y border-slate-800/30 bg-slate-900/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <p className={`${palanquinDark.className} text-xl sm:text-2xl font-bold text-white tracking-tight`}>
              Trusted & Backed By
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-12 sm:gap-24">
            {/* Xyra Labs */}
            <div className="flex flex-col items-center gap-3">
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-2">Incubated by</span>
              <img
                src="/xyralabs.svg"
                alt="Xyra Labs"
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>

            {/* Aptos */}
            <div className="flex flex-col items-center gap-3">
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Powered by</span>
              <div className="flex items-center gap-2">
                <img
                  src="/aptos.png"
                  alt="Aptos"
                  className="h-8 w-8 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <span className="text-lg font-bold text-slate-300">
                  Aptos
                </span>
              </div>
            </div>

            {/* Security */}
            <div className="flex flex-col items-center gap-3">
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Security</span>
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-blue-400" />
                <span className="text-lg font-bold text-slate-300">
                  Audited
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Minimal */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`${palanquinDark.className} text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight`}>
              How It Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-slate-800 via-blue-900/50 to-slate-800 z-0" />

            {[
              {
                title: "Explore",
                description: "Browse top traders and strategies.",
                icon: Globe,
              },
              {
                title: "Choose",
                description: "Select traders or bots to copy.",
                icon: Target,
              },
              {
                title: "Automate",
                description: "Trades execute automatically.",
                icon: Cpu,
              },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="relative z-10 flex flex-col items-center text-center"
                >
                  <div className="w-24 h-24 rounded-full bg-slate-900 border-4 border-slate-900 flex items-center justify-center mb-6 shadow-xl relative group transition-all duration-500 ease-out hover:-translate-y-2 hover:scale-110 hover:rotate-3 hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.6)]">
                    <div className="absolute inset-0 rounded-full bg-slate-800/50 group-hover:bg-blue-500/20 transition-colors duration-500" />
                    <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center group-hover:border-cyan-400/50 transition-colors duration-500">
                      <Icon size={32} className="text-slate-300 group-hover:text-cyan-400 group-hover:rotate-12 transition-all duration-500" />
                    </div>
                  </div>

                  <h3 className={`${palanquinDark.className} text-xl font-bold text-white mb-2`}>
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-400 max-w-[200px] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative bg-slate-900/20">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className={`${palanquinDark.className} text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight`}>
              What Traders Say
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <a
                key={index}
                href={testimonial.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white rounded-2xl p-6 cursor-pointer group relative overflow-hidden hover:shadow-2xl transition-all duration-300"
                style={{
                  border: "1px solid rgba(226, 232, 240, 0.8)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                }}
              >
                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="relative flex-shrink-0">
                        <img
                          src={testimonial.avatar}
                          alt={testimonial.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <div className="font-bold text-gray-900 text-sm leading-tight truncate">
                            {testimonial.name}
                          </div>
                          {testimonial.verified && (
                            <svg
                              viewBox="0 0 22 22"
                              aria-label="Verified account"
                              className="w-4 h-4 text-[#1d9bf0] flex-shrink-0"
                              fill="currentColor"
                            >
                              <g>
                                <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"></path>
                              </g>
                            </svg>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="text-sm text-gray-500 truncate">
                            {testimonial.role}
                          </div>
                          <span className="text-gray-400">·</span>
                          <div className="text-sm text-gray-500">
                            {testimonial.timestamp}
                          </div>
                        </div>
                      </div>
                    </div>
                    <ExternalLink
                      size={14}
                      className="text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0 mt-1"
                    />
                  </div>

                  {/* Content */}
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                    {testimonial.content
                      .split(
                        /(@\w+|https?:\/\/[^\s]+|xyra\.trade|➡️|⚡|💙|👋|•)/g
                      )
                      .map((part, i) => {
                        if (part.startsWith("@")) {
                          return (
                            <span
                              key={i}
                              className="text-[#1d9bf0] font-medium"
                            >
                              {part}
                            </span>
                          );
                        }
                        if (part.startsWith("http") || part === "xyra.trade") {
                          return (
                            <span
                              key={i}
                              className="text-[#1d9bf0]"
                            >
                              {part}
                            </span>
                          );
                        }
                        if (
                          part === "➡️" ||
                          part === "⚡" ||
                          part === "💙" ||
                          part === "👋" ||
                          part === "•"
                        ) {
                          return <span key={i}>{part}</span>;
                        }
                        return <span key={i}>{part}</span>;
                      })}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section >

      {/* Final CTA */}
      < section className="py-32 px-4 sm:px-6 lg:px-8 relative" >
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-slate-900/40 border border-blue-500/20 rounded-2xl p-12 backdrop-blur-sm relative overflow-hidden">
            {/* Subtle accent */}
            <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />

            <div className="relative z-10">
              <h2 className={`${palanquinDark.className} text-4xl sm:text-5xl font-bold text-white mb-6 tracking-tight`}>
                Ready to Start Trading?
              </h2>
              <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
                Join thousands of traders maximizing returns.
              </p>
              <Link
                href="/leaderboard"
                className="inline-flex items-center gap-2 px-10 py-4 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-base font-semibold transition-all duration-300 shadow-lg shadow-blue-500/ 20"
              >
                Start Trading Now
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section >
    </div >
  );
}
