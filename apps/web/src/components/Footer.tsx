"use client";

import Link from "next/link";
import { Twitter, Linkedin, Send, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800/50 bg-slate-900/40 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4 group">
              <img
                src="/anthe-logo.png"
                alt="Anthé Labs"
                className="h-8 w-auto object-contain transition-transform duration-200 group-hover:scale-110"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              {/* <span className="text-xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                Anthé Labs
              </span> */}
            </Link>
            <p className="text-slate-400 text-sm max-w-md mb-6 leading-relaxed">
              The complete social trading ecosystem on Aptos. Start with Copy
              Trading, unlock Grid Bots, AI Bots, and Social Feed as we build.
            </p>
            <div className="flex items-center gap-2">
              <a
                href="https://twitter.com/intent/follow?screen_name=AntheLabs"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center hover:bg-slate-800 hover:border-blue-500/40 hover:shadow-[0_0_10px_rgba(59,130,246,0.2)] transition-all duration-200"
                aria-label="Follow Anthé Labs on Twitter"
              >
                <Twitter
                  size={16}
                  className="text-slate-400 hover:text-blue-400 transition-colors"
                />
              </a>
              <a
                href="https://www.linkedin.com/company/anthe-labs/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center hover:bg-slate-800 hover:border-blue-500/40 hover:shadow-[0_0_10px_rgba(59,130,246,0.2)] transition-all duration-200"
                aria-label="Follow Anthé Labs on LinkedIn"
              >
                <Linkedin
                  size={16}
                  className="text-slate-400 hover:text-blue-400 transition-colors"
                />
              </a>
              <a
                href="https://t.me/AntheLabs"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center hover:bg-slate-800 hover:border-blue-500/40 hover:shadow-[0_0_10px_rgba(59,130,246,0.2)] transition-all duration-200"
                aria-label="Join Anthé Labs on Telegram"
              >
                <Send
                  size={16}
                  className="text-slate-400 hover:text-blue-400 transition-colors"
                />
              </a>
              <a
                href="mailto:anthefinance@gmail.com"
                className="w-9 h-9 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center hover:bg-slate-800 hover:border-blue-500/40 hover:shadow-[0_0_10px_rgba(59,130,246,0.2)] transition-all duration-200"
                aria-label="Email Anthé Labs"
              >
                <Mail
                  size={16}
                  className="text-slate-400 hover:text-blue-400 transition-colors"
                />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
              Product
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/leaderboard"
                  className="text-slate-400 hover:text-blue-400 text-sm transition-colors duration-200 inline-block"
                >
                  Leaderboard
                </Link>
              </li>
              <li>
                <Link
                  href="/copytrade"
                  className="text-slate-400 hover:text-blue-400 text-sm transition-colors duration-200 inline-block"
                >
                  Copy Trading
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
              Support
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/contact"
                  className="text-slate-400 hover:text-blue-400 text-sm transition-colors duration-200 inline-block"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="/feedback"
                  className="text-slate-400 hover:text-blue-400 text-sm transition-colors duration-200 inline-block"
                >
                  Feedback
                </Link>
              </li>

              <li>
                <Link
                  href="/terms"
                  className="text-slate-400 hover:text-blue-400 text-sm transition-colors duration-200 inline-block"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800/50 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} Anthé Labs. All rights reserved.
          </p>
          <p className="text-slate-500 text-sm">
            Built on{" "}
            <span className="text-blue-400 font-medium">Aptos Blockchain</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
