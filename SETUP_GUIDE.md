# sayitlpu.online - step by step setup guide

This is the do-this-then-that guide. Follow it top to bottom and you will have the
site running locally, then live on your domain with real payments.

Assume nothing is installed yet. Total time: about 90 minutes, plus Razorpay KYC
approval which can take a day or two.

---

## Step 0 - What you need before you start

1. A computer with **Node.js 18.17 or newer** (`node -v` to check). Get it from nodejs.org.
2. A **GitHub** account (free).
3. A **Vercel** account (free) - hosting.
4. A **Supabase** or **Neon** account (free tier) - PostgreSQL database and image storage.
5. A **Razorpay** account with KYC completed - payments.
6. A **Resend** account (free tier) - receipt emails.
7. Your **sayitlpu.online** domain.

---

## Step 1 - Unzip and install

```bash
unzip sayitlpu.zip
cd sayitlpu
npm install
```

`npm install` needs internet and takes a few minutes. It downloads Next.js,
Prisma, Razorpay and Resend.

---

## Step 2 - Create the database (Supabase)

1. Go to supabase.com, sign in, click **New project**.
2. Name it `sayitlpu`, pick a strong database password (save it), choose the region
   closest to you (Mumbai / ap-south-1 is ideal for India).
3. Wait for the project to finish provisioning.
4. Open **Project Settings > Database > Connection string > URI**.
   - Copy the **pooled** connection string (port 6543) - this is your `DATABASE_URL`.
   - Copy the **direct** connection string (port 5432) - this is your `DIRECT_URL`.
   - Replace `[YOUR-PASSWORD]` in both with the password from step 2.

Using Neon instead? Create a project, copy the pooled connection string into
`DATABASE_URL` and the direct one into `DIRECT_URL`. Everything else is identical.

---

## Step 3 - Create the image bucket (Supabase Storage)

1. In Supabase, open **Storage > New bucket**.
2. Name it exactly `pixel-uploads`.
3. Turn **Public bucket ON** (block images must be publicly viewable).
4. Click **Create bucket**.
5. Open **Project Settings > API** and copy:
   - **Project URL** -> `SUPABASE_URL`
   - **service_role** secret key -> `SUPABASE_SERVICE_ROLE_KEY`

The service_role key is a server-only secret. Never put it in client code, never
commit it, never share it.

---

## Step 4 - Create your Razorpay keys

1. Sign up at razorpay.com and complete **KYC** (PAN, bank account, address).
   Until KYC is approved you can only use Test Mode.
2. Go to **Settings > API Keys > Generate Key**.
   - **Key ID** -> `RAZORPAY_KEY_ID` and `NEXT_PUBLIC_RAZORPAY_KEY_ID` (same value)
   - **Key Secret** -> `RAZORPAY_KEY_SECRET` (shown once - save it now)
3. Do **not** create the webhook yet. That is Step 9, after the site is deployed.

Start in **Test Mode** while you build. Switch to Live keys only when you are ready
to take real money.

---

## Step 5 - Create your email sender (Resend)

1. Sign up at resend.com.
2. Add and verify your domain (`sayitlpu.online`) under **Domains** - it gives you
   DNS records to paste into your domain registrar.
3. Go to **API Keys > Create API Key** -> `RESEND_API_KEY`.
4. Set `EMAIL_FROM` to something like `sayitlpu.online <no-reply@sayitlpu.online>`.
5. Set `CONTACT_INBOX_EMAIL` to the inbox where you want contact-form messages.

Skipping this for now is fine. Without `RESEND_API_KEY` the app logs emails to the
console instead of sending them, and nothing breaks.

---

## Step 6 - Fill in your environment file

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in every value. The ones you must set to run locally:

```
DATABASE_URL=...            # from Step 2
DIRECT_URL=...              # from Step 2
SUPABASE_URL=...            # from Step 3
SUPABASE_SERVICE_ROLE_KEY=...
RAZORPAY_KEY_ID=...         # from Step 4
NEXT_PUBLIC_RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=<a long password you choose>
ADMIN_SESSION_SECRET=<random 32+ chars>
CRON_SECRET=<random 32+ chars>
```

Generate the random secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Also fill in your public business details, which appear on the site and in emails:
`NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_CONTACT_PHONE`,
`NEXT_PUBLIC_CONTACT_ADDRESS`, `NEXT_PUBLIC_LEGAL_ENTITY_NAME`, `NEXT_PUBLIC_GSTIN`.

Leave the price and grid variables alone unless you truly want different numbers:

```
NEXT_PUBLIC_PRICE_PER_BLOCK_INR=10
NEXT_PUBLIC_GRID_COLUMNS=100
NEXT_PUBLIC_GRID_ROWS=100
NEXT_PUBLIC_BLOCK_PIXEL_SIZE=10
```

---

## Step 7 - Create the tables and seed the wall

```bash
npx prisma migrate dev --name init
npm run seed
```

The first command creates `users`, `blocks`, `block_cells`, `payments`, `clicks`,
`contact_messages` and `webhook_events`, including the critical
`UNIQUE (x, y)` constraint on `block_cells` that makes double-selling impossible.

The second inserts 20 sample blocks - 18 live, 2 waiting for review so you can try
the admin panel immediately.

---

## Step 8 - Run it locally

```bash
npm run dev
```

Open these and check each one:

| URL | What you should see |
| --- | --- |
| http://localhost:3000 | Slim header, one stats line, the wall, slim footer. Nothing else. |
| http://localhost:3000/buy | Drag a rectangle, watch the live block count and total |
| http://localhost:3000/about | Real copy, non-affiliation statement |
| http://localhost:3000/contact | Email, phone, address, working form |
| http://localhost:3000/terms | Full terms |
| http://localhost:3000/privacy | Full privacy policy |
| http://localhost:3000/refund | Refund rules |
| http://localhost:3000/shipping | Digital delivery only |
| http://localhost:3000/admin | Login, then the 2 pending seeded blocks |

Test a payment in Razorpay Test Mode. Card `4111 1111 1111 1111`, any future
expiry, any CVV, OTP `1234`. Note: locally the webhook cannot reach you, so the
block will not flip to *awaiting review* until you do Step 8b or deploy.

### Step 8b - Optional: test the webhook locally

```bash
npx localtunnel --port 3000
```

Copy the public URL it prints, then in Razorpay add a webhook pointing at
`https://<that-url>/api/webhooks/razorpay` and paste its secret into
`RAZORPAY_WEBHOOK_SECRET` in `.env.local`. Restart `npm run dev`.

---

## Step 9 - Deploy to Vercel

1. Push to GitHub:

   ```bash
   git init
   git add .
   git commit -m "sayitlpu.online"
   git branch -M main
   git remote add origin https://github.com/<you>/sayitlpu.git
   git push -u origin main
   ```

   `.env.local` is already in `.gitignore`, so your secrets stay out of GitHub.

2. On vercel.com click **Add New > Project**, import the repo, and before deploying
   open **Environment Variables**. Paste in **every** variable from `.env.local`,
   plus `NEXT_PUBLIC_SITE_URL=https://sayitlpu.online`.

3. Set the **Build Command** to:

   ```
   prisma generate && prisma migrate deploy && next build
   ```

4. Click **Deploy**.

5. Add your domain: **Project Settings > Domains > Add** `sayitlpu.online`, then
   point your registrar's DNS at the records Vercel shows you.

---

## Step 10 - Point Razorpay at the live webhook

1. Razorpay dashboard > **Settings > Webhooks > Add New Webhook**.
2. URL: `https://sayitlpu.online/api/webhooks/razorpay`
3. Secret: generate a long random string, save it, and add it to Vercel as
   `RAZORPAY_WEBHOOK_SECRET`.
4. Active events: tick **payment.captured** and **payment.failed**.
5. Save, then redeploy in Vercel so the new variable is picked up.

This webhook is the only thing that confirms a payment. If you skip it, buyers pay
and nothing appears in your admin panel.

---

## Step 11 - Razorpay merchant activation checklist

Razorpay reviews your site before allowing live payments. All of it is ready:

- Contact page with a working **email, phone and postal address**
- Terms & Conditions, Privacy Policy, Refund & Cancellation, Shipping Policy
- Clear pricing (Rs 10 per block) shown before payment
- Description of exactly what the customer receives

You only need to replace the placeholders (Step 13) with your real details.

---

## Step 12 - Day-to-day running

**Approving a block**

1. Go to `https://sayitlpu.online/admin` and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
2. Each pending card shows the image, name, email, link, description, coordinates
   and amount paid.
3. **Approve** puts it on the wall and emails the buyer.
4. **Reject & refund** needs a reason (sent to the buyer), refunds the payment in
   full through Razorpay, and frees the blocks for someone else.

**What to reject:** adult or sexual content, hate speech or harassment, violence or
gore, illegal goods or services, malware or phishing links, anything implying
official LPU endorsement, and images the buyer does not own.

**Expired reservations** are cleared automatically every 10 minutes by the cron in
`vercel.json`. To run it by hand: `npm run release`.

---

## Step 13 - Placeholders you MUST replace before going live

Search the project for `[YOUR ` and replace each one.

| Placeholder | Where | What to put |
| --- | --- | --- |
| `[YOUR EMAIL]` | `.env` (`NEXT_PUBLIC_CONTACT_EMAIL`), contact/policy pages | A working email you check daily |
| `[YOUR PHONE]` | `.env` (`NEXT_PUBLIC_CONTACT_PHONE`) | A reachable phone number with country code |
| `[YOUR ADDRESS]` | `.env` (`NEXT_PUBLIC_CONTACT_ADDRESS`) | Full postal address - Razorpay requires this |
| `[YOUR LEGAL NAME / PROPRIETORSHIP]` | `.env` (`NEXT_PUBLIC_LEGAL_ENTITY_NAME`) | Your name or registered business name |
| `[YOUR GSTIN]` | `.env` (`NEXT_PUBLIC_GSTIN`) | Your GSTIN, or write "Not registered" |
| `[YOUR CITY]` | `src/app/terms/page.tsx` (governing law) | The city whose courts have jurisdiction |
| `[13 August 2026]` | `terms`, `privacy`, `refund`, `shipping` pages | The date you publish, e.g. 1 August 2026 |
| `[YOUR ADMIN EMAIL]` | `.env` (`ADMIN_EMAIL`) | The email you log into `/admin` with |
| Razorpay Key ID | `.env` | From Razorpay > API Keys |
| Razorpay Key Secret | `.env` | From Razorpay > API Keys |
| Razorpay Webhook Secret | `.env` | The secret you set in Step 10 |
| `ADMIN_PASSWORD` | `.env` | A long password only you know |
| `ADMIN_SESSION_SECRET` | `.env` | 32+ random characters |
| `CRON_SECRET` | `.env` | 32+ random characters |
| Supabase / database values | `.env` | From Steps 2 and 3 |
| Resend key and from-address | `.env` | From Step 5 |

Two decisions already made for you in the copy, change them if you disagree:

- **Blocks are permanent.** They do not expire or renew. This is stated in the Terms.
- **Refunds:** full refund if a submission is rejected in review, no refund once a
  block is live. Also in the Terms and on the Refund page.

---

## Step 14 - Final checks before you announce it

- [ ] Homepage is only header, one stats line, the wall, footer
- [ ] Hovering a sold block shows the name and description; clicking opens the link in a new tab
- [ ] `/buy` drag selection shows the live block count and Rs 10 per block total
- [ ] Sold blocks cannot be selected
- [ ] Uploading shows a preview cropped to your selected area
- [ ] A real (or test) payment ends with the block in `/admin`, not on the wall
- [ ] Approving publishes it and the buyer gets an email
- [ ] Rejecting refunds the money and frees the blocks
- [ ] Every placeholder from Step 13 is replaced
- [ ] The non-affiliation disclaimer is in the footer of every page
- [ ] It looks right at 1440px and at 390px width, with no sideways scrolling
- [ ] No errors in the browser console

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `Can't reach database server` | Password not substituted in `DATABASE_URL`, or the Supabase project is paused |
| `PrismaClient is unable to run in the browser` | Run `npx prisma generate`, then restart the dev server |
| Payment succeeds but nothing in `/admin` | The webhook is missing or `RAZORPAY_WEBHOOK_SECRET` is wrong. Check Razorpay > Webhooks > delivery logs |
| `Invalid signature` on the webhook | The secret in Razorpay does not match `RAZORPAY_WEBHOOK_SECRET` |
| Upload fails | The bucket is not named `pixel-uploads`, is not public, or the service_role key is wrong |
| Blocks stuck as reserved | Run `npm run release`, and confirm the Vercel cron is enabled |
| No emails arriving | `RESEND_API_KEY` missing or the domain is not verified in Resend |
| Cannot sign in to `/admin` | `ADMIN_EMAIL` / `ADMIN_PASSWORD` mismatch, or `ADMIN_SESSION_SECRET` is shorter than 16 characters |

---

## A note on the domain name

Because the domain contains "LPU", keep the non-affiliation disclaimer visible on
every page (it is already in the footer and repeated on the policy pages), and never
add university logos, official colours, crests or anything that could read as an
official university site. If the university asks you to change something, do it
quickly - it is far cheaper than a dispute.
