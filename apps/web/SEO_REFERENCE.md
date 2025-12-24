# SEO Reference Guide

## 📋 Important SEO Files

### Core Implementation Files
- **`src/app/layout.tsx`** - Main metadata, Open Graph, Twitter Cards, structured data
- **`src/app/sitemap.ts`** - Dynamic sitemap generation
- **`public/robots.txt`** - Search engine crawl directives
- **`public/manifest.json`** - PWA manifest with app metadata

### Image Files
- **`src/app/icon.png`** - Favicon (auto-detected by Next.js)
- **`public/anthe-logo.png`** - Logo for Apple touch icon and structured data
- **`public/home.png`** - Social media preview image (1200x630px)

---

## ✅ Current SEO Configuration

### 1. **Metadata (layout.tsx)**
- **Title**: "Anthe Labs - Automated Copy Trading Platform on Aptos"
- **Description**: Professional, keyword-optimized description
- **Keywords**: Copy trading, Aptos, crypto trading, DeFi, etc.
- **Canonical URL**: Set to homepage

### 2. **Open Graph (Social Media)**
- **Type**: Website
- **Image**: `${siteUrl}/home.png` (1200x630)
- **Locale**: en_US
- **Site Name**: Anthe Labs

### 3. **Twitter Cards**
- **Card Type**: summary_large_image
- **Image**: `${siteUrl}/home.png`
- **Creator**: @AntheLabs
- **Site**: @AntheLabs

### 4. **Sitemap**
- **URL**: `https://anthe.io/sitemap.xml`
- **Auto-generated** by Next.js from `src/app/sitemap.ts`
- **Pages Included**:
  - `/` (Homepage) - Priority: 1.0, Daily
  - `/leaderboard` - Priority: 0.9, Hourly
  - `/copytrade` - Priority: 0.9, Daily
  - `/trader` - Priority: 0.8, Weekly
  - `/feedback` - Priority: 0.7, Weekly
  - `/about` - Priority: 0.6, Monthly

### 5. **Robots.txt**
- **Allows**: All public pages
- **Disallows**: `/auth/`, `/settings/`, `/dashboard/`, `/twitter-callback/`
- **Sitemap**: `https://anthe.io/sitemap.xml`

### 6. **Structured Data (JSON-LD)**
- **Organization Schema**: Name, URL, logo, social links, contact
- **WebSite Schema**: Search action for leaderboard

### 7. **Favicon & Icons**
- **Favicon**: `src/app/icon.png` (auto-detected)
- **Apple Touch Icon**: `/anthe-logo.png` (180x180)
- **PWA Icons**: `/anthe-logo.png` (192x192, 512x512)

---

## 🔧 Environment Variables

Make sure `NEXT_PUBLIC_SITE_URL` is set in production:
```env
NEXT_PUBLIC_SITE_URL=https://anthe.io
```

---

## 📝 Verification Checklist

- ✅ All metadata is consistent
- ✅ Open Graph images use absolute URLs
- ✅ Twitter Card configured
- ✅ Sitemap includes all public pages
- ✅ Robots.txt blocks private pages
- ✅ Structured data is valid JSON-LD
- ✅ Favicon configured correctly
- ✅ All image files exist

---

## 🔍 Testing

1. **Local**: Visit `http://localhost:4000/sitemap.xml`
2. **Production**: Visit `https://anthe.io/sitemap.xml`
3. **Social Media**: Test with [Facebook Debugger](https://developers.facebook.com/tools/debug/) or [Twitter Card Validator](https://cards-dev.twitter.com/validator)
4. **Structured Data**: Test with [Google Rich Results Test](https://search.google.com/test/rich-results)

---

## 📚 Resources

- [Next.js Metadata Documentation](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [Schema.org](https://schema.org/)

