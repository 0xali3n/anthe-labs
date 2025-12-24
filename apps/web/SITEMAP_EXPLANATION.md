# Sitemap Generation - How It Works

## ✅ Who Generates the Sitemap?

**Next.js 13+ automatically generates the sitemap** from `src/app/sitemap.ts`

### How It Works:

1. **File Location**: `src/app/sitemap.ts`
2. **Auto-Detection**: Next.js detects this file automatically
3. **URL**: When you visit `/sitemap.xml`, Next.js runs the function and generates XML
4. **Generation**: Happens on-demand (when requested) or during build (for static export)

## 📋 Current Setup (Static Pages)

Your current sitemap includes:

- ✅ Homepage (`/`)
- ✅ Leaderboard (`/leaderboard`)
- ✅ Copytrade (`/copytrade`)
- ✅ Creator/Trader (`/trader`)
- ✅ Feedback (`/feedback`)
- ✅ About (`/about`)

**This is CORRECT** for your main static pages.

## 🔄 Should We Add Dynamic Pages?

### Option 1: Keep Static Only (Current - Recommended)

- ✅ Simple and fast
- ✅ No database queries needed
- ✅ Works for main pages
- ❌ Doesn't include user profiles

### Option 2: Add Dynamic User Profiles

If you want user profiles in Google search:

- Fetch all usernames from database
- Add each profile URL to sitemap
- More complex, requires database access
- Better for SEO if profiles are public

## 🎯 Recommendation

**Keep it as-is (static only)** because:

1. Main pages are most important for SEO
2. User profiles are typically found via internal search
3. Too many profile URLs can slow down sitemap generation
4. Google can discover profile pages through internal links

## 📝 How to Verify It's Working

1. **Local**: Visit `http://localhost:4000/sitemap.xml`
2. **Production**: Visit `https://anthe.io/sitemap.xml`
3. **Should see**: XML with all your pages listed

## 🔧 If You Want to Add Dynamic Pages Later

You can make the sitemap async to fetch user profiles:

```typescript
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch usernames from API
  const users = await getAllUsernames();

  const profilePages = users.map((user) => ({
    url: `${baseUrl}/profile/${user.username}`,
    lastModified: new Date(user.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...profilePages];
}
```

But this is **optional** - your current setup is correct! ✅
