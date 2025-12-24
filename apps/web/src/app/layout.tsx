import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://anthe.io";

export const metadata: Metadata = {
  title: {
    default: "Anthe Labs - Copy Trading Platform on Aptos",
    template: "%s | Anthé Labs",
  },
  description:
    "Mirror top traders & automated bots automatically. Secure copy trading on Aptos blockchain — start in minutes. Real-time copy trading, social trading feed, smart grid bots, and analytics.",
  keywords: [
    "copy trading",
    "Aptos",
    "crypto trading",
    "social trading",
    "automated trading",
    "trading bots",
    "DeFi",
    "cryptocurrency",
    "trading platform",
    "copy trade",
    "grid trading",
    "DCA bots",
    "trading analytics",
    "blockchain trading",
  ],
  authors: [{ name: "Anthe Labs" }],
  creator: "Anthe Labs",
  publisher: "Anthe Labs",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    title: "Anthe Labs - Copy Trading Platform on Aptos",
    description:
      "Mirror top traders & automated bots automatically. Secure copy trading on Aptos blockchain — start in minutes. Real-time copy trading, social trading feed, smart grid bots, and analytics.",
    siteName: "Anthe Labs",
    images: [
      {
        url: `${siteUrl}/home.png`,
        width: 1200,
        height: 630,
        alt: "Anthe Labs - Copy Trading Platform on Aptos",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Anthe Labs - Copy Trading Platform on Aptos",
    description:
      "Mirror top traders & automated bots automatically. Secure copy trading on Aptos blockchain — start in minutes.",
    images: [`${siteUrl}/home.png`],
    creator: "@AntheLabs",
    site: "@AntheLabs",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // Note: Next.js 13+ automatically uses src/app/icon.png for favicon
  // Only specify if you need to override or add additional icons
  icons: {
    // Favicon is automatically handled by src/app/icon.png
    // These are additional icons for PWA and older browsers
    apple: [{ url: "/anthe-logo.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.json",
  verification: {
    // Add your verification codes here when available
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#060913",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-[#0a0c12]" data-scroll-behavior="smooth">
      <body
        className="min-h-screen flex flex-col text-slate-100 antialiased"
        style={{ background: "#0a0c12" }}
      >
        {/* Professional clean background */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {/* Solid dark background */}
          <div className="absolute inset-0 bg-[#0a0c12]" />

          {/* Subtle radial gradient for depth */}
          <div
            className="absolute inset-0 bg-gradient-radial from-slate-900/20 via-transparent to-transparent"
            style={{
              backgroundImage:
                "radial-gradient(circle at 50% 0%, rgba(15, 23, 42, 0.4), transparent 50%)",
            }}
          />

          {/* Very subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `linear-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px)`,
              backgroundSize: "64px 64px",
            }}
          />
        </div>

        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Anthe Labs",
              url: siteUrl,
              logo: `${siteUrl}/anthe-logo.png`,
              description:
                "Copy Trading Platform on Aptos - Mirror top traders & automated bots automatically. Secure copy trading on Aptos blockchain.",
              sameAs: [
                "https://twitter.com/AntheLabs",
                "https://www.linkedin.com/company/anthe-labs/",
                "https://t.me/AntheLabs",
              ],
              contactPoint: {
                "@type": "ContactPoint",
                email: "anthefinance@gmail.com",
                contactType: "Customer Service",
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Anthe Labs",
              url: siteUrl,
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: `${siteUrl}/leaderboard?search={search_term_string}`,
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />

        <Navbar />
        <main className="flex-1 relative z-10">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
