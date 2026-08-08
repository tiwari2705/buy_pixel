# 🚀 Update Production Environment Variables

## Issue Fixed

Your images are not showing because the `NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL` is pointing to the wrong endpoint.

**Wrong (S3 API endpoint)**:
```
https://trqihvgrbsaodxwjeawt.storage.supabase.co/storage/v1/s3
```

**Correct (Public URL endpoint)**:
```
https://trqihvgrbsaodxwjeawt.supabase.co/storage/v1/object/public/pixel-uploads
```

---

## 📝 Steps to Update on Vercel

### 1. Go to Vercel Dashboard
- Open: https://vercel.com/dashboard
- Select your project: `sayitlpu` (or whatever your project is named)

### 2. Go to Environment Variables
- Click on **Settings** tab
- Click on **Environment Variables** in the left sidebar

### 3. Find and Update the Variable
- Search for: `NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL`
- Click **Edit** button next to it
- Change the value to:
  ```
  https://trqihvgrbsaodxwjeawt.supabase.co/storage/v1/object/public/pixel-uploads
  ```
- Click **Save**

### 4. Redeploy
After saving the environment variable:
- Go to **Deployments** tab
- Click the **⋮** (three dots) on the latest deployment
- Click **Redeploy**
- Or simply push a new commit to trigger a rebuild

---

## 📝 Steps to Update on Other Platforms

### Netlify
1. Go to: https://app.netlify.com
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Find `NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL`
5. Click **Edit** and update the value
6. Trigger a new deploy

### Railway
1. Go to: https://railway.app
2. Select your project
3. Go to **Variables** tab
4. Find `NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL`
5. Update the value
6. Redeploy

### Custom Server
If you're running on your own server:
1. SSH into your server
2. Edit the `.env` or `.env.production` file
3. Update the value
4. Restart your application:
   ```bash
   pm2 restart all
   # or
   systemctl restart your-app-name
   ```

---

## ✅ Verify the Fix

After redeploying, check if images are showing:

1. **Visit your live site**: https://yourdomain.com
2. **Check the wall** - Previously uploaded images should now display
3. **Upload a new test image** - Should upload and display correctly

### Test Image URL Format

After the fix, image URLs should look like:
```
https://trqihvgrbsaodxwjeawt.supabase.co/storage/v1/object/public/pixel-uploads/blocks/2026-08-08/xxxxx.png
```

NOT like this (old/wrong):
```
https://trqihvgrbsaodxwjeawt.storage.supabase.co/storage/v1/s3/blocks/2026-08-08/xxxxx.png
```

---

## 🔧 Additional Changes to Deploy

Along with fixing the image URL, I've also made these improvements:

### 1. **Image Display Fix** (`src/components/PixelGrid.tsx`)
- Changed from stretching to **cover fit**
- Images now maintain aspect ratio
- No more distorted photos

### 2. **Upload Preview Fix** (`src/components/BuyFlow.tsx`)
- Removed the large image preview
- Now shows a small file indicator (like Google Forms)
- Shows: "Image uploaded (WxH px)" with an icon

### 3. **Cache Fix** (`src/app/api/orders/route.ts`)
- Free orders now properly clear the homepage cache
- Blocks show up immediately after purchase

---

## 📋 Summary of What to Do

1. ✅ **Update environment variable in production**:
   - Variable: `NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL`
   - New value: `https://trqihvgrbsaodxwjeawt.supabase.co/storage/v1/object/public/pixel-uploads`

2. ✅ **Push the code changes**:
   ```bash
   git add .
   git commit -m "fix: correct storage URL and improve image display"
   git push origin main
   ```

3. ✅ **Verify images are showing** on your live site

---

## 🆘 If Images Still Don't Show

### Check Supabase Storage Bucket Permissions

1. Go to: https://supabase.com/dashboard
2. Select your project: `trqihvgrbsaodxwjeawt`
3. Go to **Storage** in the left sidebar
4. Click on the `pixel-uploads` bucket
5. Go to **Policies** tab
6. Make sure there's a policy that allows **public read access**

If there's no public policy, create one:
- Click **New Policy**
- Select **For SELECT operations**
- Name: `Public Access`
- Policy definition:
  ```sql
  CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'pixel-uploads' );
  ```
- Click **Review** then **Save**

---

## 🎉 All Done!

After updating the environment variable and redeploying, your images will display correctly! 🚀
