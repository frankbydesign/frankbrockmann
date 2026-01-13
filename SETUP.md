# MPS Kids Ride Hotline - Setup Guide

Complete setup guide for deploying your SMS hotline with automatic translation.

**Estimated Time:** 30-45 minutes

---

## 🎯 What You're Building

A shared SMS inbox where:
- Parents text ONE phone number for rides
- Volunteers see all messages in a web app
- Messages auto-translate between any language and English
- Volunteers reply in English → auto-translates back to parent's language
- Works perfectly on mobile (add to home screen!)

---

## 💰 Cost Estimate

- **Twilio**: ~$1.15/month (phone number) + ~$0.0079/text
- **Supabase**: Free tier (plenty for this use case)
- **Claude API**: ~$0.001 per translation
- **Vercel**: Free tier

**Total: $5-15/month** depending on text volume

---

## ⚙️ Setup Steps

### Step 1: Create Your Accounts

You'll need accounts at these services:

1. **Twilio** (twilio.com) → SMS phone number
2. **Supabase** (supabase.com) → Database + authentication
3. **Anthropic** (console.anthropic.com) → Translation API
4. **Vercel** (vercel.com) → Hosting (sign in with GitHub)

---

### Step 2: Set Up Supabase (Database)

1. Go to supabase.com and create a new project
2. Wait for it to initialize (~2 minutes)
3. Go to **SQL Editor** (left sidebar)
4. Copy the entire contents of `supabase-schema.sql` from this repo
5. Paste it into the SQL Editor and click **Run**
6. ✅ You should see "Success. No rows returned"

**Get your API keys:**

7. Go to **Settings → API** (left sidebar)
8. Copy these three values (you'll need them later):
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")
   - **service_role** secret key (⚠️ keep this secret!)

---

### Step 3: Set Up Twilio (SMS)

1. Sign up at twilio.com (they give $15 trial credit)
2. Go to **Console Dashboard**
3. Copy your **Account SID** and **Auth Token** (you'll need these later)
4. Go to **Phone Numbers → Manage → Buy a number**
5. Search for a number with **SMS** capability
6. Buy it (~$1.15/month)
7. Copy the phone number (format: +1XXXXXXXXXX)

**Note:** We'll configure the webhook URL after deploying to Vercel

---

### Step 4: Get Claude API Key

1. Go to console.anthropic.com
2. Create an account and log in
3. Go to **API Keys**
4. Click **Create Key**
5. Copy the API key (starts with `sk-ant-...`)
6. Add credits: Go to **Settings → Billing** and add at least $5

---

### Step 5: Deploy to Vercel

1. **Push this code to GitHub:**
   ```bash
   # If you haven't already committed:
   git add .
   git commit -m "Initial MPS Kids Ride Hotline setup"
   git push origin claude/plan-sms-inbox-qSmX3
   ```

2. **Go to vercel.com** and sign in with GitHub

3. **Import the repository:**
   - Click "Add New..." → "Project"
   - Find your GitHub repository
   - Click "Import"

4. **Add Environment Variables:**

   Before deploying, click "Environment Variables" and add these:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-from-supabase
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-supabase
   TWILIO_ACCOUNT_SID=your-twilio-account-sid
   TWILIO_AUTH_TOKEN=your-twilio-auth-token
   TWILIO_PHONE_NUMBER=+1612XXXXXXX
   ANTHROPIC_API_KEY=sk-ant-your-claude-api-key
   ```

5. **Click "Deploy"**

6. **Wait for deployment** (~2-3 minutes)

7. **Copy your deployment URL** (looks like `https://your-app.vercel.app`)

---

### Step 6: Connect Twilio Webhook

Now we connect Twilio to your deployed app:

1. Go back to **Twilio Console**
2. Go to **Phone Numbers → Manage → Active Numbers**
3. Click on your phone number
4. Scroll down to **Messaging Configuration**
5. Under "A message comes in":
   - Set webhook to: `https://your-app.vercel.app/api/webhook`
   - Method: **HTTP POST**
6. Click **Save**

✅ Your SMS hotline is now live!

---

### Step 7: Add Volunteers

**Option A: Let volunteers sign up themselves**

1. Share your app URL with volunteers
2. They click "Sign Up" and create an account

**Option B: Manually create accounts in Supabase**

1. Go to Supabase Dashboard → **Authentication → Users**
2. Click **Add User**
3. Enter email and password
4. Send credentials to volunteer

---

### Step 8: Test Everything!

1. **Log in to the web app** with a volunteer account
2. **Text your Twilio number** from your phone
3. **Check the web app** - you should see the message appear!
4. **Reply in the web app** - you should receive it on your phone

**Try testing translation:**
- Ask a friend to text in Spanish/Somali/etc
- The app should show both original and English translation
- Your reply should auto-translate back

---

## 📱 For Volunteers: Using the App

### First Time Setup

1. Go to the app URL (you'll receive this from admin)
2. Sign up with your email and password
3. On your phone, open the app in Safari/Chrome
4. Tap the "Share" button → "Add to Home Screen"
5. Now it works like a native app!

### Daily Use

- **New messages** show up automatically (no refresh needed)
- **Green dots** show which volunteers are online
- **Click any conversation** to view and reply
- **Type in English** - translation happens automatically
- **Edit contact names** by clicking the phone number at the top
- **Archive conversations** when resolved
- **View archives** by clicking the "Archive" tab

---

## 🔧 Troubleshooting

### Can't log in?

- Make sure you signed up first
- Password must be at least 6 characters
- Check email spelling

### Messages not appearing from Twilio?

1. Check Twilio webhook URL is correct: `https://your-app.vercel.app/api/webhook`
2. Check Vercel logs: Go to Vercel Dashboard → Your project → Deployments → Latest → Functions
3. Make sure all environment variables are set in Vercel
4. Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly (webhook needs it to bypass RLS)

### Translation not working?

- Verify `ANTHROPIC_API_KEY` is set in Vercel
- Check you have credits in Anthropic account
- Check Vercel function logs for errors

### Can't send replies?

- Verify `TWILIO_AUTH_TOKEN` is correct in Vercel
- Check Twilio account has credits
- Check Vercel function logs for detailed error

### RLS / Permission errors?

- Make sure you ran the complete SQL schema in Supabase
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel
- Verify all three RLS policy sections were created

### Realtime updates not working?

- Go to Supabase Dashboard → Database → Replication
- Make sure `conversations`, `messages`, and `volunteers` tables are enabled
- Check browser console for errors

---

## 🎨 PWA / Add to Home Screen

The app works great as a Progressive Web App:

**iPhone (Safari):**
1. Open the app in Safari
2. Tap the Share button (box with arrow)
3. Scroll and tap "Add to Home Screen"
4. Tap "Add"

**Android (Chrome):**
1. Open the app in Chrome
2. Tap the menu (three dots)
3. Tap "Add to Home screen"
4. Tap "Add"

**Note:** You'll need icon files (`icon-192.png` and `icon-512.png`) in the `/public` folder. You can create simple icons using any online icon generator or design tool.

---

## 🔒 Security Features Included

✅ **Twilio signature verification** - Rejects fake webhook requests
✅ **Row Level Security (RLS)** - Volunteers can only access their data
✅ **Service role bypass** - Webhooks can write without auth
✅ **Supabase Auth** - Email/password authentication
✅ **Environment variables** - Secrets never in code

---

## 🚀 Future Enhancements

Ideas for v2:

- [ ] Admin role with user management
- [ ] Invite codes for volunteer signup
- [ ] Export conversation history
- [ ] Search messages
- [ ] Shift scheduling
- [ ] Ride assignment tracking
- [ ] Push notifications
- [ ] Calendar integration
- [ ] Analytics dashboard

---

## 📊 Monitoring Usage & Costs

**Twilio (check monthly costs):**
- Go to Twilio Console → Usage
- View message counts and costs

**Anthropic (check API usage):**
- Go to console.anthropic.com → Usage
- Monitor translation costs

**Supabase (check database usage):**
- Go to Supabase Dashboard → Settings → Usage
- Free tier includes 500MB database, 2GB bandwidth

**Vercel (check function invocations):**
- Go to Vercel Dashboard → Analytics
- Free tier includes 100GB bandwidth, 100GB-hours compute

---

## 🆘 Getting Help

If you run into issues:

1. Check Vercel function logs (most common issues show here)
2. Check browser console for frontend errors
3. Review this troubleshooting guide
4. Check Supabase logs: Dashboard → Logs

---

## ✅ Launch Checklist

Before going live:

- [ ] Supabase database schema deployed
- [ ] All environment variables set in Vercel
- [ ] Twilio webhook URL configured
- [ ] Test message sent and received successfully
- [ ] Test translation working (both directions)
- [ ] Test volunteer signup/login
- [ ] Test archive functionality
- [ ] All volunteers have accounts
- [ ] Volunteers know how to use the app
- [ ] Phone number shared with parents
- [ ] Monitoring costs set up

---

**You're all set! 🎉**

Parents can now text your Twilio number, and volunteers will see messages in the web app with automatic translation!
