# 🔔 Razorpay Webhook Setup

## Problem

When paying with Razorpay, blocks don't show because webhooks aren't configured.

**Current Status**:
- ✅ Free orders (coupon codes) work - blocks show immediately
- ❌ Paid orders (Razorpay) don't show - webhook secret missing

---

## Solution: Configure Razorpay Webhook

### Step 1: Get Your Webhook Secret

1. **Go to Razorpay Dashboard**: https://dashboard.razorpay.com/app/webhooks

2. **If you already have a webhook**:
   - Click on the existing webhook
   - Find the **"Secret"** section
   - Click **"Show"** or **"Regenerate"** to see the secret
   - Copy it (starts with `whsec_`)

3. **If you don't have a webhook yet**:
   - Click **"Create New Webhook"**
   - **Webhook URL**: `https://yourdomain.com/api/webhooks/razorpay`
     - Replace `yourdomain.com` with your actual domain
     - Example: `https://sayitlpu.vercel.app/api/webhooks/razorpay`
   - **Active Events**: Check these boxes:
     - ✅ `payment.captured`
     - ✅ `payment.failed`
   - **Alert Email**: Your email address
   - Click **"Create Webhook"**
   - **Copy the Secret** that appears

---

### Step 2: Update Local Environment

Open your `.env.local` file and update:

```env
RAZORPAY_WEBHOOK_SECRET="whsec_YOUR_ACTUAL_SECRET_HERE"
```

Replace `YOUR_ACTUAL_SECRET_HERE` with the secret you copied from Razorpay.

---

### Step 3: Update Production Environment

#### On Vercel:
1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Find `RAZORPAY_WEBHOOK_SECRET`
5. Click **Edit** and paste your webhook secret
6. Click **Save**
7. **Redeploy** your application

#### On Netlify:
1. Go to: https://app.netlify.com
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Find `RAZORPAY_WEBHOOK_SECRET`
5. Update the value with your webhook secret
6. Trigger a new deploy

---

### Step 4: Test Webhook

1. **Make a test payment** on your live site
2. **Check Razorpay Dashboard**:
   - Go to **Webhooks** → Click your webhook
   - Go to **Logs** tab
   - You should see the webhook delivery with **200 OK** status

If you see **400 Bad Request**, the secret is wrong.

---

## How to Test Locally

For local testing, you need to expose your localhost to the internet using **ngrok**:

### 1. Install ngrok
```bash
npm install -g ngrok
```

### 2. Start your local server
```bash
npm run dev
```

### 3. Start ngrok in another terminal
```bash
ngrok http 3000
```

### 4. Update Razorpay webhook URL
- Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)
- Go to Razorpay Dashboard → Webhooks
- Update webhook URL to: `https://abc123.ngrok.io/api/webhooks/razorpay`
- Make a test payment

### 5. Check webhook delivery
- Watch your terminal for webhook logs
- Check ngrok web interface: `http://localhost:4040`

---

## Verify Webhook is Working

After setting up:

1. **Make a test payment** (use ₹10 or minimum amount)
2. **Check in Razorpay Dashboard**:
   - Go to **Payments** → Find your payment
   - Go to **Webhooks** → **Logs**
   - Should show **200 OK** response
3. **Check your site** - Block should appear within 10 seconds

---

## Common Issues

### Issue: Webhook shows 400 Bad Request
**Fix**: Webhook secret is wrong. Double-check you copied the correct secret.

### Issue: Webhook shows 404 Not Found
**Fix**: Webhook URL is wrong. Should be `https://yourdomain.com/api/webhooks/razorpay`

### Issue: Webhook shows 500 Internal Server Error
**Fix**: Check your server logs for errors. May be a database connection issue.

### Issue: Block still doesn't show after payment
**Fix**: 
1. Check webhook logs in Razorpay Dashboard
2. Check your application logs
3. Verify `RAZORPAY_WEBHOOK_SECRET` is set in production

---

## Current Configuration Needed

**Environment Variable to Set**:
```env
RAZORPAY_WEBHOOK_SECRET="whsec_xxxxxxxxxxxxx"
```

**Where to Set It**:
- ✅ `.env.local` (for local development)
- ✅ Production environment variables (Vercel/Netlify)

**Webhook URL** (in Razorpay Dashboard):
```
https://yourdomain.com/api/webhooks/razorpay
```

---

## Summary

1. ✅ Go to Razorpay Dashboard → Webhooks
2. ✅ Create webhook or get existing webhook secret
3. ✅ Update `RAZORPAY_WEBHOOK_SECRET` in `.env.local`
4. ✅ Update `RAZORPAY_WEBHOOK_SECRET` in production (Vercel/Netlify)
5. ✅ Redeploy your application
6. ✅ Test with a real payment

After this, paid blocks will show up immediately! 🎉
