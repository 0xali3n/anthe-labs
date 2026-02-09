import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WalletProvider from "@/components/WalletProvider";
import type { Metadata } from "next";
import Script from "next/script";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://anthe.io";

export const metadata: Metadata = {
  title: {
    default: "Anthe Labs",
    template: "%s | Anthe Labs",
  },
  description:
    "Automatically mirror top traders on Aptos with real-time copy trading. Non-custodial, secure, and audited. Smart position sizing, live analytics, and instant execution. Start copy trading in minutes.",
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
  // Canonical URLs are automatically set by Next.js for each page
  // based on metadataBase and the page URL
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    title: "Anthe Labs",
    description:
      "Automatically mirror top traders on Aptos with real-time copy trading. Non-custodial, secure, and audited. Smart position sizing, live analytics, and instant execution.",
    siteName: "Anthe Labs",
    images: [
      {
        url: `${siteUrl}/home.png`,
        width: 1200,
        height: 630,
        alt: "Anthe Labs - Automated Copy Trading Platform on Aptos Blockchain",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Anthe Labs - Automated Copy Trading Platform on Aptos",
    description:
      "Automatically mirror top traders on Aptos with real-time copy trading. Non-custodial, secure, and audited. Start copy trading in minutes.",
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
    // Favicon: Multiple sizes for better Google compatibility
    icon: [
      { url: "/logo.png", sizes: "16x16", type: "image/png" },
      { url: "/logo.png", sizes: "32x32", type: "image/png" },
      { url: "/logo.png", sizes: "48x48", type: "image/png" },
      { url: "/logo.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [{ url: "/logo.png", sizes: "180x180", type: "image/png" }],
    shortcut: [{ url: "/logo.png", sizes: "32x32", type: "image/png" }],
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
              logo: `${siteUrl}/logo.png`,
              description:
                "Automated copy trading platform on Aptos blockchain. Automatically mirror top traders with real-time execution, smart position sizing, and comprehensive analytics. Non-custodial, secure, and audited.",
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

        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-189XLPG1XZ"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-189XLPG1XZ');
          `}
        </Script>

        {/* Microsoft Clarity */}
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "uqorc6dezx");
          `}
        </Script>

        <WalletProvider>
          <Navbar />
          <main className="flex-1 relative z-10">{children}</main>
          <Footer />
        </WalletProvider>
      </body>
    </html>
  );
}
