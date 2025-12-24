# Favicon & Social Media Metadata Setup Guide

## Current Status
✅ Metadata is configured in `layout.tsx`
✅ Open Graph tags are set up
✅ Twitter Card metadata is configured
✅ Manifest.json is configured

## Issues to Fix

### 1. Favicon Setup
Next.js 13+ automatically uses `icon.png` from `src/app/` directory. Make sure:
- `src/app/icon.png` exists and is a proper PNG (32x32 or larger, square)
- The file should be your logo/favicon

### 2. Additional Favicon Files (Optional but Recommended)
For better browser compatibility, add these to `public/`:
- `favicon.ico` - 16x16 or 32x32 ICO file (for older browsers)
- `favicon-16x16.png` - 16x16 PNG
- `favicon-32x32.png` - 32x32 PNG
- `apple-touch-icon.png` - 180x180 PNG (for iOS)

### 3. Social Media Preview Image
Ensure `/home.png` exists in `public/` and is:
- 1200x630 pixels (recommended for Open Graph)
- High quality
- Represents your brand/website

### 4. Testing Your Setup

#### Test Favicon:
1. Clear browser cache
2. Visit `http://localhost:4000/favicon.ico` (should show your favicon)
3. Check browser tab - should show your logo

#### Test Social Media Preview:
1. **Twitter Card Validator**: https://cards-dev.twitter.com/validator
2. **Facebook Debugger**: https://developers.facebook.com/tools/debug/
3. **LinkedIn Post Inspector**: https://www.linkedin.com/post-inspector/

Enter your URL (e.g., `https://anthe.io`) to see how it appears when shared.

### 5. Quick Fixes Applied

✅ Updated icon paths to use `/anthe-logo.png` instead of `/logo.png`
✅ Added absolute URLs for Open Graph images (using `siteUrl`)
✅ Updated manifest.json to use correct icon paths
✅ Added multiple icon sizes in metadata

### 6. Next Steps

1. **Ensure icon.png exists**: Copy `anthe-logo.png` to `src/app/icon.png` if needed
2. **Create favicon.ico**: Convert your logo to ICO format and place in `public/`
3. **Verify home.png**: Make sure it's 1200x630px and looks good
4. **Test on social platforms**: Use the validators above
5. **Clear cache**: Hard refresh (Ctrl+Shift+R) to see changes

### 7. Environment Variable
Make sure `NEXT_PUBLIC_SITE_URL` is set in production:
```env
NEXT_PUBLIC_SITE_URL=https://anthe.io
```

This ensures social media previews use the correct absolute URLs.

