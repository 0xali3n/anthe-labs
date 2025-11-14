"use client";

import Link from "next/link";
import { Twitter, Github, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800/50 bg-slate-900/40 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4 group">
              <img
                src="/logo.png"
                alt="Anthé Labs"
                className="h-8 w-8 transition-transform duration-200 group-hover:scale-110"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                Anthé Labs
              </span>
            </Link>
            <p className="text-slate-400 text-sm max-w-md mb-6 leading-relaxed">
              The complete social trading ecosystem on Aptos. Start with Copy
              Trading, unlock Grid Bots, AI Bots, and Social Feed as we build.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center hover:bg-slate-800 hover:border-blue-500/40 hover:shadow-[0_0_10px_rgba(59,130,246,0.2)] transition-all duration-200"
              >
                <Twitter
                  size={18}
                  className="text-slate-400 hover:text-blue-400 transition-colors"
                />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center hover:bg-slate-800 hover:border-blue-500/40 hover:shadow-[0_0_10px_rgba(59,130,246,0.2)] transition-all duration-200"
              >
                <Github
                  size={18}
                  className="text-slate-400 hover:text-blue-400 transition-colors"
                />
              </a>
              <a
                href="mailto:contact@anthelabs.com"
                className="w-10 h-10 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center hover:bg-slate-800 hover:border-blue-500/40 hover:shadow-[0_0_10px_rgba(59,130,246,0.2)] transition-all duration-200"
              >
                <Mail
                  size={18}
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
              <li>
                <Link
                  href="/about"
                  className="text-slate-400 hover:text-blue-400 text-sm transition-colors duration-200 inline-block"
                >
                  About
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
                <a
                  href="mailto:support@anthelabs.com"
                  className="text-slate-400 hover:text-blue-400 text-sm transition-colors duration-200 inline-block"
                >
                  support@anthelabs.com
                </a>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-slate-400 hover:text-blue-400 text-sm transition-colors duration-200 inline-block"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <a
                  href="https://docs.anthelabs.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-blue-400 text-sm transition-colors duration-200 inline-block"
                >
                  Documentation
                </a>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-slate-400 hover:text-blue-400 text-sm transition-colors duration-200 inline-block"
                >
                  Privacy Policy
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
