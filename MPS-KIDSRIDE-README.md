# MPS Kids Ride Hotline 🚗📱

A simple, shared SMS inbox with automatic translation for volunteer ride coordinators.

## What This Does

Parents text **one phone number** to request rides. Volunteers access a shared web inbox where:
- ✅ Messages auto-translate to English (from any language)
- ✅ Volunteers reply in English → auto-translates back to parent's language
- ✅ Real-time updates (no refresh needed)
- ✅ Works great on mobile (add to home screen)
- ✅ Track who's online and who replied
- ✅ Archive resolved conversations

## Tech Stack

- **Frontend:** Next.js 14 + React + TypeScript + Tailwind CSS
- **Database:** Supabase (PostgreSQL + Realtime + Auth)
- **SMS:** Twilio
- **Translation:** Anthropic Claude API
- **Hosting:** Vercel

## Features Implemented

### Core Functionality
- ✅ Twilio webhook with signature verification
- ✅ Automatic language detection per message
- ✅ Translation only for non-English messages
- ✅ Display both original + translated text
- ✅ Retry logic for failed sends (max 3 attempts)
- ✅ Failed message indicators with manual retry

### User Experience
- ✅ Real-time message updates via Supabase
- ✅ Volunteer presence (online/offline indicators)
- ✅ Soft conversation assignment (shows last replier)
- ✅ Editable contact names
- ✅ Archive/unarchive conversations
- ✅ Mobile-responsive design
- ✅ PWA support (add to home screen)

### Security
- ✅ Twilio signature verification on webhooks
- ✅ Supabase Row Level Security (RLS)
- ✅ Email/password authentication
- ✅ Service role key for webhook bypass

## Project Structure

```
├── app/
│   ├── page.tsx              # Main inbox UI
│   ├── layout.tsx            # App shell + metadata
│   ├── globals.css           # Global styles
│   └── api/
│       ├── webhook/route.ts  # Twilio SMS webhook (inbound)
│       └── send/route.ts     # Send SMS API (outbound)
├── components/
│   ├── AuthForm.tsx          # Login/signup UI
│   ├── ConversationList.tsx  # Conversation sidebar
│   ├── MessageView.tsx       # Message thread + compose
│   └── VolunteerList.tsx     # Online volunteer indicators
├── lib/
│   ├── supabase.ts           # Supabase client + types
│   └── translate.ts          # Claude translation service
├── public/
│   └── manifest.json         # PWA manifest
├── supabase-schema.sql       # Database schema
├── SETUP.md                  # Complete setup guide
└── package.json              # Dependencies
```

## Quick Start

See **[SETUP.md](./SETUP.md)** for complete deployment instructions.

### Prerequisites

1. Node.js 18+ installed
2. Accounts at: Twilio, Supabase, Anthropic, Vercel

### Local Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Fill in your API keys in .env

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Cost Estimate

- **Twilio:** ~$1.15/month (phone number) + ~$0.0079/text
- **Supabase:** Free tier (sufficient for most use cases)
- **Claude API:** ~$0.001 per translation
- **Vercel:** Free tier

**Total: ~$5-15/month** depending on text volume

## How It Works

### Inbound Flow (Parent → Volunteers)

1. Parent texts Twilio number
2. Twilio sends webhook to `/api/webhook`
3. Webhook verifies Twilio signature
4. Claude API detects language + translates (if not English)
5. Message saved to database
6. Supabase realtime pushes to all connected volunteers

### Outbound Flow (Volunteer → Parent)

1. Volunteer types message in English
2. Frontend calls `/api/send`
3. Claude translates to parent's detected language
4. Twilio sends SMS (with 3 retry attempts)
5. Message status updated in database
6. Supabase realtime updates UI

## Environment Variables

Required environment variables (see `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
ANTHROPIC_API_KEY=sk-ant-your-key
```

## Database Schema

Key tables:

- **volunteers** - User profiles (links to auth.users)
- **conversations** - One per phone number
- **messages** - SMS messages (inbound/outbound)

See `supabase-schema.sql` for complete schema with RLS policies.

## Deployment

Deploy to Vercel:

```bash
# Push to GitHub
git push origin main

# Import repo in Vercel
# Add environment variables
# Deploy!
```

See [SETUP.md](./SETUP.md) for detailed deployment steps.

## Troubleshooting

See the **Troubleshooting** section in [SETUP.md](./SETUP.md).

Common issues:
- Messages not appearing → Check Twilio webhook URL
- Translation errors → Check Anthropic API key + credits
- Can't send → Check Twilio credentials
- RLS errors → Verify service role key is set

## Future Enhancements

Potential v2 features:

- Admin role with user management
- Invite codes for volunteer signup
- Message search
- Export conversation history
- Shift scheduling
- Ride assignment tracking
- Push notifications
- Analytics dashboard

## License

MIT

## Support

For setup help, see [SETUP.md](./SETUP.md).

---

Built with ❤️ for volunteer ride coordinators
