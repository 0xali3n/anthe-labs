"use client";

import Link from "next/link";
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
} from "lucide-react";
import { useEffect, useState } from "react";

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
    { value: `$${counters.volume}K+`, label: "Total Volume", icon: TrendingUp },
    { value: `${counters.traders}+`, label: "Active Traders", icon: Users },
    { value: `${counters.roi.toFixed(1)}%`, label: "Avg ROI", icon: BarChart3 },
    { value: `${counters.uptime.toFixed(1)}%`, label: "Uptime", icon: Zap },
  ];

  const testimonials = [
    {
      name: "Alex Chen",
      role: "Professional Trader",
      content: "Copy trading works flawlessly. Excited for what's next!",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
    },
    {
      name: "Sarah Martinez",
      role: "Crypto Investor",
      content: "Finally, a platform that combines all trading tools.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    },
    {
      name: "Michael Park",
      role: "Day Trader",
      content: "The vision of this platform is incredible.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael",
    },
  ];

  return (
    <div className="min-h-screen bg-[#060913] relative">
      {/* Background Patterns */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
        {/* Gradient Circles */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-32 px-4 sm:px-6 lg:px-8">
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/30 via-indigo-950/20 to-[#060913] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(47,107,255,0.15),transparent_60%)] pointer-events-none animate-gradient-shift" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(122,75,255,0.1),transparent_60%)] pointer-events-none animate-gradient-shift-delayed" />

        {/* Animated orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float-delayed pointer-events-none" />

        {/* Subtle noise texture */}
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Floating Icons */}
        <div className="absolute top-20 left-10 w-16 h-16 opacity-10 animate-float pointer-events-none z-0">
          <div className="w-full h-full bg-blue-500 rounded-full blur-2xl" />
        </div>
        <div className="absolute top-40 right-20 w-20 h-20 opacity-10 animate-float-delayed pointer-events-none z-0">
          <div className="w-full h-full bg-indigo-500 rounded-full blur-2xl" />
        </div>

        <div className="relative max-w-7xl mx-auto z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div className="text-center lg:text-left">
              {/* Headline */}
              <h1
                className={`text-5xl sm:text-6xl lg:text-7xl font-extrabold mb-6 leading-[1.1] tracking-tight transition-all duration-1000 ${
                  mounted
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-10"
                }`}
              >
                <span className="bg-gradient-to-r from-[#2F6BFF] via-[#7A4BFF] to-[#4BD1FF] bg-clip-text text-transparent">
                  Copy Trade Like a Pro
                </span>
              </h1>

              {/* Subhead - One sentence */}
              <p
                className={`text-lg sm:text-xl text-[#B0B7D0] mb-8 max-w-xl mx-auto lg:mx-0 transition-all duration-1000 delay-200 ${
                  mounted
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-10"
                }`}
              >
                Automatically mirror top traders, trading bots and social
                strategies — secure, instant, and audited.
              </p>

              {/* CTAs */}
              <div
                className={`flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-6 transition-all duration-1000 delay-300 ${
                  mounted
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-10"
                }`}
              >
                <Link
                  href="/leaderboard"
                  className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#2F6BFF] to-[#7A4BFF] hover:from-[#2560E6] hover:to-[#6A40E6] text-white rounded-xl text-base font-bold transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-[0_0_20px_rgba(0,136,255,0.4)] hover:-translate-y-0.5 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  Start Trading Now
                  <ArrowRight
                    size={18}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </Link>
                <Link
                  href="/about"
                  className="px-8 py-4 bg-transparent border-2 border-slate-700 hover:border-slate-600 text-white rounded-xl text-base font-semibold transition-all duration-200 hover:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-slate-600"
                >
                  See Demo
                </Link>
              </div>

              {/* Micro-trust line */}
              <p
                className={`text-sm text-slate-400 transition-all duration-1000 delay-400 ${
                  mounted
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-10"
                }`}
              >
                Trusted by 1,200+ traders • Audited • Built on Aptos
              </p>
            </div>

            {/* Right: Product Mockup */}
            <div
              className={`relative transition-all duration-1000 delay-500 ${
                mounted
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
              }`}
            >
              <div className="relative bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-6 shadow-2xl">
                {/* Mockup Content */}
                <div className="bg-slate-950/80 rounded-xl p-6 border border-slate-800/50">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30" />
                      <div>
                        <div className="h-3 w-24 bg-slate-800 rounded mb-2" />
                        <div className="h-2 w-16 bg-slate-800/50 rounded" />
                      </div>
                    </div>
                    <div className="h-8 w-20 bg-blue-600/20 rounded-lg border border-blue-500/30" />
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-3"
                      >
                        <div className="h-2 w-10 bg-slate-800 rounded mb-2" />
                        <div className="h-5 w-16 bg-green-500/20 rounded mb-1" />
                        <div className="h-1.5 w-12 bg-slate-800/50 rounded" />
                      </div>
                    ))}
                  </div>

                  {/* Mini Chart - Animated */}
                  <div className="relative h-24 bg-slate-900/50 border border-slate-800/50 rounded-lg overflow-hidden group/chart">
                    <svg
                      className="w-full h-full"
                      viewBox="0 0 200 80"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient
                          id="chartGradient"
                          x1="0%"
                          y1="0%"
                          x2="0%"
                          y2="100%"
                        >
                          <stop
                            offset="0%"
                            stopColor="#2F6BFF"
                            stopOpacity="0.3"
                          />
                          <stop
                            offset="100%"
                            stopColor="#2F6BFF"
                            stopOpacity="0"
                          />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 0,60 Q 25,50 50,45 T 100,35 T 150,30 T 200,25"
                        fill="url(#chartGradient)"
                        className="animate-chart-line"
                      />
                      <path
                        d="M 0,60 Q 25,50 50,45 T 100,35 T 150,30 T 200,25"
                        stroke="#2F6BFF"
                        strokeWidth="2"
                        fill="none"
                        className="animate-chart-wave group-hover/chart:stroke-[#4BD1FF] transition-colors duration-500"
                      />
                      {/* Animated dots */}
                      <circle
                        cx="50"
                        cy="45"
                        r="2"
                        fill="#2F6BFF"
                        className="animate-pulse"
                      />
                      <circle
                        cx="100"
                        cy="35"
                        r="2"
                        fill="#2F6BFF"
                        className="animate-pulse"
                        style={{ animationDelay: "0.5s" }}
                      />
                      <circle
                        cx="150"
                        cy="30"
                        r="2"
                        fill="#2F6BFF"
                        className="animate-pulse"
                        style={{ animationDelay: "1s" }}
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900/30 border-y border-slate-800/50 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="flex flex-col items-center text-center animate-fade-up group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-3 group-hover:bg-blue-600/30 group-hover:shadow-[0_0_15px_rgba(47,107,255,0.3)] transition-all duration-300">
                    <Icon size={20} className="text-blue-400" />
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {stat.value}
                  </div>
                  <div className="text-xs text-slate-400 font-medium">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-center text-xs text-slate-500 mt-6">
            Total volume • Active traders • Avg ROI • Uptime
          </p>
        </div>
      </section>

      {/* Features Grid - 6 Tiles */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 bg-[#060913] relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 animate-fade-up">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
              Platform Features
            </h2>
            <p className="text-base text-[#B0B7D0] max-w-2xl mx-auto">
              Complete social trading ecosystem
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const isLive = feature.status === "live";
              return (
                <div
                  key={index}
                  className={`group relative bg-[#0b1220] border rounded-xl p-5 transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 animate-fade-up cursor-pointer ${
                    isLive
                      ? "border-blue-500/40 hover:border-blue-500/60 hover:shadow-xl hover:shadow-blue-500/20"
                      : "border-slate-800 hover:border-slate-700"
                  }`}
                  style={{
                    animationDelay: `${index * 80}ms`,
                    boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.05)",
                  }}
                >
                  {/* Gradient border on hover */}
                  <div
                    className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                      isLive
                        ? "bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20"
                        : ""
                    }`}
                    style={{
                      background: isLive
                        ? "linear-gradient(135deg, rgba(47,107,255,0.1), rgba(122,75,255,0.1))"
                        : "transparent",
                    }}
                  />

                  {/* Badge */}
                  {isLive && (
                    <div className="absolute top-4 right-4 px-2 py-1 rounded-full text-xs font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30 z-10">
                      Live
                    </div>
                  )}

                  <div className="relative z-10">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all ${
                        isLive
                          ? "bg-blue-600/20 border border-blue-500/40 group-hover:bg-blue-600/30 group-hover:shadow-[0_0_20px_rgba(47,107,255,0.4)]"
                          : "bg-slate-800/50 border border-slate-700/50"
                      }`}
                    >
                      <Icon
                        size={24}
                        className={isLive ? "text-blue-400" : "text-slate-500"}
                      />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-[#B0B7D0] leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Partner/Audit Trust Strip */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-900/30 border-y border-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-8">
              Trusted & Backed By
            </p>
            <div className="flex flex-wrap items-center justify-center gap-12 opacity-70 hover:opacity-100 transition-opacity">
              <div className="flex flex-col items-center gap-3">
                <span className="text-xs text-slate-400">Incubated by</span>
                <img
                  src="/xyralabs.svg"
                  alt="Xyra Labs"
                  className="h-10 sm:h-12 grayscale hover:grayscale-0 transition-all"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
              <div className="flex flex-col items-center gap-3">
                <span className="text-xs text-slate-400">Powered by</span>
                <div className="flex items-center gap-2">
                  <img
                    src="/aptos.png"
                    alt="Aptos"
                    className="h-8 w-8 grayscale hover:grayscale-0 transition-all"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <span className="text-sm font-semibold text-slate-300">
                    Aptos
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-3">
                <span className="text-xs text-slate-400">Security</span>
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-green-500/30">
                  <Shield size={16} className="text-green-400" />
                  <span className="text-sm font-semibold text-slate-300">
                    Secure
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - 3 Steps */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#060913] relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fade-up">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
              How It Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Explore",
                description: "Browse top traders and strategies.",
                icon: Users,
              },
              {
                step: "02",
                title: "Choose",
                description: "Select traders or bots to copy.",
                icon: TrendingUp,
              },
              {
                step: "03",
                title: "Automate",
                description: "Trades execute automatically.",
                icon: Zap,
              },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="text-center animate-fade-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border-2 border-blue-500/40 flex items-center justify-center mx-auto mb-4">
                    <Icon size={32} className="text-blue-400" />
                  </div>
                  <div className="text-4xl font-bold text-blue-600/30 mb-2">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-[#B0B7D0]">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-900/30 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 animate-fade-up">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
              What Traders Say
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-[#0b1220] border border-slate-800 rounded-xl p-5 animate-fade-up hover:border-slate-700 hover:shadow-lg transition-all duration-300 cursor-pointer"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full border-2 border-blue-500/30"
                    />
                    <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-md -z-10" />
                  </div>
                  <div>
                    <div className="font-bold text-white">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-slate-500">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
                <p className="text-[#B0B7D0] leading-relaxed">
                  "{testimonial.content}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 bg-[#060913] relative">
        <div className="max-w-4xl mx-auto text-center">
          <div
            className="bg-gradient-to-r from-[#2F6BFF]/20 via-[#7A4BFF]/20 to-[#4BD1FF]/20 border-2 border-blue-500/40 rounded-2xl p-12 backdrop-blur-xl shadow-2xl animate-fade-up relative overflow-hidden"
            style={{
              boxShadow:
                "0 20px 60px rgba(47,107,255,0.2), 0 0 0 1px rgba(47,107,255,0.1), inset 0 1px 0 0 rgba(255,255,255,0.1)",
            }}
          >
            {/* Gradient glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-blue-500/10 opacity-50 blur-2xl" />
            <div className="relative z-10">
              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6 tracking-tight">
                Ready to Start Trading?
              </h2>
              <p className="text-base text-[#B0B7D0] mb-8 max-w-2xl mx-auto">
                Join thousands of traders maximizing returns.
              </p>
              <Link
                href="/leaderboard"
                className="inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-[#2F6BFF] to-[#7A4BFF] hover:from-[#2560E6] hover:to-[#6A40E6] text-white rounded-xl text-base font-bold transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-[0_0_20px_rgba(0,136,255,0.4)] hover:-translate-y-0.5 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                Start Trading Now
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
