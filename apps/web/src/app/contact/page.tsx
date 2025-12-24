"use client";

import { Twitter, Linkedin, Send, Mail } from "lucide-react";
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
      color: "hover:text-blue-400",
      borderColor: "hover:border-blue-500/50",
      bgGradient: "from-blue-500/10",
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      href: "https://www.linkedin.com/company/anthe-labs/",
      description: "Connect with us on our professional network",
      color: "hover:text-blue-600",
      borderColor: "hover:border-blue-600/50",
      bgGradient: "from-blue-600/10",
    },
    {
      name: "Telegram",
      icon: Send,
      href: "https://t.me/AntheLabs",
      description: "Join our community and chat with the team",
      color: "hover:text-sky-400",
      borderColor: "hover:border-sky-500/50",
      bgGradient: "from-sky-500/10",
    },
    {
      name: "Email",
      icon: Mail,
      href: "mailto:anthefinance@gmail.com",
      description: "Send us a direct message for inquiries",
      color: "hover:text-purple-400",
      borderColor: "hover:border-purple-500/50",
      bgGradient: "from-purple-500/10",
    },
  ];

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-slate-950">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className={`${palanquinDark.className} text-4xl md:text-5xl font-bold text-white tracking-tight`}>
            Get in <span className="text-blue-500">Touch</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Have a question about our platform, pricing, or services? Our team is
            ready to assist and ensure you get the information you need.
          </p>
        </div>

        {/* Contact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {contactMethods.map((method) => (
            <a
              key={method.name}
              href={method.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`group relative p-8 rounded-2xl bg-slate-900/50 border border-slate-800 transition-all duration-300 ${method.borderColor} hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-1 overflow-hidden`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${method.bgGradient} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
              />
              <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                <div
                  className={`p-4 rounded-xl bg-slate-800/50 group-hover:bg-slate-800 transition-colors duration-300 ${method.color}`}
                >
                  <method.icon size={32} />
                </div>
                <h3 className="text-xl font-semibold text-white group-hover:text-white/90">
                  {method.name}
                </h3>
                <p className="text-slate-400 group-hover:text-slate-300 transition-colors">
                  {method.description}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
