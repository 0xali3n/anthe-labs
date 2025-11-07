# Avatar Setup Guide

## Step 1: Create Supabase Storage Bucket

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"**
4. Configure the bucket:
   - **Name**: `avatars` (must match exactly)
   - **Public bucket**: ✅ **Enable** (so avatars are publicly accessible)
   - **File size limit**: 2MB (or your preference)
   - **Allowed MIME types**: `image/png, image/jpeg, image/jpg, image/gif, image/webp, image/svg+xml`
5. Click **"Create bucket"**

## Step 2: Upload Avatar Images

1. In the **Storage** section, click on the `avatars` bucket
2. Click **"Upload file"** or drag and drop images
3. Upload your 6 avatar images (or however many you want)
4. **File naming**: Use descriptive names like:
   - `avatar1.png`
   - `avatar2.png`
   - `avatar3.png`
   - etc.

### Recommended Image Specs:
- **Format**: PNG, JPG, or WebP
- **Size**: 200x200px to 400x400px (square images work best)
- **File size**: Keep under 500KB each for faster loading

## Step 3: Set Bucket Policies (Optional but Recommended)

1. Go to **Storage** → **Policies** → Select `avatars` bucket
2. Add a policy for public read access:
   - **Policy name**: `Public Avatar Access`
   - **Allowed operation**: `SELECT` (read)
   - **Policy definition**: 
     ```sql
     true
     ```
   - This allows anyone to view avatars (they're public anyway)

## Step 4: Environment Variables

Make sure your backend `.env` file has:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
AVATARS_BUCKET_NAME=avatars  # Optional, defaults to 'avatars'
```

## Step 5: Test the Setup

1. Start your backend: `pnpm --filter api start:dev`
2. Test the endpoint: `GET http://localhost:3001/api/avatars`
3. You should see a JSON response with all your uploaded avatars

## How It Works

- **Backend**: Lists all files from the `avatars` bucket
- **Frontend**: Displays avatars in a grid for user selection
- **User selects**: Avatar URL is saved to their profile
- **Future avatars**: Just upload more images to the bucket - they'll appear automatically!

## Adding More Avatars Later

Simply upload new images to the `avatars` bucket in Supabase Storage. They will automatically appear in the avatar picker without any code changes!

## Troubleshooting

### Avatars not showing?
- Check bucket name matches `avatars` (or `AVATARS_BUCKET_NAME` env var)
- Verify bucket is **public**
- Check `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Check browser console for errors

### Images not loading?
- Verify bucket policies allow public read
- Check image file extensions are supported (png, jpg, jpeg, gif, webp, svg)
- Verify image URLs are accessible

