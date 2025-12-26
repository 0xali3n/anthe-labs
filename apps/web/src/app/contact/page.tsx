"use client";

import { Twitter, Linkedin, Send, Mail, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Palanquin_Dark } from "next/font/google";

const palanquinDark = Palanquin_Dark({
  weight: ["400", "700"],
  subsets: ["latin"],
});

export default function ContactPage() {
  const contactMethods = [
    {
      name: "Twitter",
      icon: Twitter,
      href: "https://twitter.com/intent/follow?screen_name=AntheLabs",
      description: "Follow us for the latest updates and announcements",
      color: "text-blue-400",
      hoverColor: "hover:text-blue-300",
      borderColor: "border-blue-500/20",
      hoverBorderColor: "hover:border-blue-500/40",
      bgGradient: "from-blue-500/5 to-transparent",
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      href: "https://www.linkedin.com/company/anthe-labs/",
      description: "Connect with us on our professional network",
      color: "text-blue-500",
      hoverColor: "hover:text-blue-400",
      borderColor: "border-blue-600/20",
      hoverBorderColor: "hover:border-blue-600/40",
      bgGradient: "from-blue-600/5 to-transparent",
    },
    {
      name: "Telegram",
      icon: Send,
      href: "https://t.me/AntheLabs",
      description: "Join our community and chat with the team",
      color: "text-sky-400",
      hoverColor: "hover:text-sky-300",
      borderColor: "border-sky-500/20",
      hoverBorderColor: "hover:border-sky-500/40",
      bgGradient: "from-sky-500/5 to-transparent",
    },
    {
      name: "Email",
      icon: Mail,
      href: "mailto:anthefinance@gmail.com",
      email: "anthefinance@gmail.com",
      description: "Send us a direct message for inquiries",
      color: "text-purple-400",
      hoverColor: "hover:text-purple-300",
      borderColor: "border-purple-500/20",
      hoverBorderColor: "hover:border-purple-500/40",
      bgGradient: "from-purple-500/5 to-transparent",
    },
  ];

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
        <div className="text-center mb-16">
          <h1
            className={`${palanquinDark.className} text-3xl sm:text-4xl md:text-5xl font-semibold text-white mb-4 tracking-tight`}
          >
            Get in <span className="text-blue-400">Touch</span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Have a question about our platform, pricing, or services? Our team
            is ready to assist and ensure you get the information you need.
          </p>
        </div>

        {/* Contact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {contactMethods.map((method) => (
            <a
              key={method.name}
              href={method.href}
              target={method.name === "Email" ? undefined : "_blank"}
              rel={method.name === "Email" ? undefined : "noopener noreferrer"}
              className="group relative rounded-2xl p-8 transition-all duration-300 border border-slate-800/50 bg-slate-900/30 hover:bg-slate-900/50 hover:border-slate-700/50 overflow-hidden"
              style={{
                background:
                  "linear-gradient(180deg, rgba(28, 31, 46, 0.8) 0%, rgba(22, 24, 33, 0.8) 100%)",
                boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.25)",
              }}
            >
              {/* Hover Gradient Overlay */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${method.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
              />

              <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                {/* Icon */}
                <div
                  className={`p-4 rounded-xl bg-slate-800/50 group-hover:bg-slate-800/70 border ${method.borderColor} ${method.hoverBorderColor} transition-all duration-300 ${method.color} ${method.hoverColor}`}
                >
                  <method.icon size={28} />
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold text-white">
                  {method.name}
                </h3>

                {/* Description */}
                <p className="text-slate-400 text-sm leading-relaxed">
                  {method.description}
                </p>

                {/* Email Address (only for Email method) */}
                {method.email && (
                  <div className="mt-2 px-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50 group-hover:border-purple-500/30 transition-colors">
                    <p className="text-purple-300 font-mono text-sm font-medium">
                      {method.email}
                    </p>
                  </div>
                )}

                {/* External Link Indicator */}
                {method.name !== "Email" && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
                    <span>Visit</span>
                    <ExternalLink size={12} />
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>

        {/* Additional Info Section */}
        <div className="mt-16 text-center p-8 rounded-2xl bg-slate-900/50 border border-slate-800/50">
          <h2
            className={`${palanquinDark.className} text-xl font-semibold text-white mb-3`}
          >
            Response Time
          </h2>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto">
            We typically respond to all inquiries within 24-48 hours. For urgent
            matters, please reach out via Telegram for faster assistance.
          </p>
        </div>
      </div>
    </div>
  );
}
