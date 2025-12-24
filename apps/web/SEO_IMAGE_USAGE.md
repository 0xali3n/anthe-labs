# SEO Image Usage Guide

## Current Setup ✅

### 1. **Favicon (Browser Tab Icon)**
- **File**: `src/app/icon.png`
- **Usage**: Automatically used by Next.js 13+ for browser tab favicon
- **Status**: ✅ Correct - Next.js handles this automatically

### 2. **Main Website Logo (Header/Footer)**
- **File**: `public/anthe-logo.png`
- **Usage**: 
  - Navbar component (`/anthe-logo.png`)
  - Footer component (`/anthe-logo.png`)
- **Status**: ✅ Correct - Used in UI components

### 3. **Social Media Preview Images (SEO)**
- **File**: `public/home.png`
- **Usage**: 
  - Open Graph images (Facebook, LinkedIn, etc.)
  - Twitter Card images
  - Should be 1200x630px for optimal display
- **Status**: ✅ Correct - Used in metadata for social sharing

### 4. **PWA Icons (Manifest)**
- **File**: `public/anthe-logo.png`
- **Usage**: Progressive Web App icons (192x192, 512x512)
- **Status**: ✅ Correct - Used in manifest.json

## Summary

| Purpose | File | Location | Status |
|---------|------|----------|--------|
| **Favicon** | `icon.png` | `src/app/` | ✅ Auto-handled by Next.js |
| **Header Logo** | `anthe-logo.png` | `public/` | ✅ Used in Navbar/Footer |
| **Social Preview** | `home.png` | `public/` | ✅ Used in Open Graph/Twitter |
| **PWA Icons** | `anthe-logo.png` | `public/` | ✅ Used in manifest.json |

## Important Notes

1. **Favicon**: Next.js 13+ automatically detects and uses `src/app/icon.png`. No need to manually configure in metadata unless you need additional sizes.

2. **Social Media**: The `/home.png` image is used for social media previews when links are shared. Make sure it's:
   - 1200x630 pixels (recommended)
   - High quality
   - Represents your brand well

3. **Logo**: The `anthe-logo.png` is used throughout the UI (navbar, footer) and for PWA icons.

4. **Testing**: Use these tools to verify social media previews:
   - Twitter: https://cards-dev.twitter.com/validator
   - Facebook: https://developers.facebook.com/tools/debug/
   - LinkedIn: https://www.linkedin.com/post-inspector/

