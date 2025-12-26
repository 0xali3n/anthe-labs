import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://anthe.io";

export const metadata: Metadata = {
  title: "Media Kit - Anthe Labs Logos and Brand Assets",
  description:
    "Download official Anthe Labs logos, favicons, and brand assets. High-resolution PNG files available for download. Use Anthe Labs brand assets for media, press, and marketing purposes.",
  keywords: [
    "Anthe Labs logo",
    "Anthe Labs brand assets",
    "Anthe Labs media kit",
    "Anthe Labs favicon",
    "Anthe Labs download",
    "Aptos trading platform logo",
    "copy trading logo",
    "crypto trading brand assets",
  ],
  openGraph: {
    title: "Media Kit - Anthe Labs Logos and Brand Assets",
    description:
      "Download official Anthe Labs logos, favicons, and brand assets. High-resolution PNG files available for download.",
    url: `${siteUrl}/mediakit`,
    siteName: "Anthe Labs",
    images: [
      {
        url: `${siteUrl}/mediakit/Full Logo.png`,
        width: 1200,
        height: 630,
        alt: "Anthe Labs Full Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Media Kit - Anthe Labs Logos and Brand Assets",
    description:
      "Download official Anthe Labs logos, favicons, and brand assets.",
    images: [`${siteUrl}/mediakit/Full Logo.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: `${siteUrl}/mediakit`,
  },
};

