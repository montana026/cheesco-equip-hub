# Cheesco Equip Hub - Setup Guide

## Prerequisites

Before you begin, make sure you have:

- Node.js 18+ installed
- npm or yarn package manager
- A Supabase account (free tier is fine)
- A Paystack account (for payment processing in Nigeria)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase Database

#### Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose your organization
4. Set a database password (save this!)
5. Choose a region (closest to Nigeria for best performance)
6. Wait for the project to be created

#### Get Your Supabase Credentials

1. Go to Project Settings > API
2. Copy your:
   - Project URL
   - `anon` public key
   - `service_role` secret key (keep this secure!)

#### Apply Database Schema

1. In your Supabase dashboard, go to SQL Editor
2. Click "New Query"
3. Copy the entire contents of `supabase/schema.sql`
4. Paste into the SQL Editor
5. Click "Run" (this will take a minute)
6. Verify: Go to Table Editor - you should see all tables

### 3. Configure Environment Variables

Copy the example env file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# JWT Secret (generate a secure random string)
# Run: openssl rand -base64 32
JWT_SECRET=your_generated_jwt_secret_here

# Paystack (get from paystack.com dashboard)
PAYSTACK_SECRET_KEY=sk_test_your_secret_key
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_public_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 4. Generate JWT Secret

On Mac/Linux:
```bash
openssl rand -base64 32
```

On Windows (PowerShell):
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Copy the output and paste it as `JWT_SECRET` in `.env.local`

### 5. Set Up Paystack

1. Go to [paystack.com](https://paystack.com)
2. Create an account (Nigerian business required for live mode)
3. Go to Settings > API Keys & Webhooks
4. Copy your **Test** keys to start
5. Add them to `.env.local`

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

You should see the Cheesco Equip Hub homepage with the crane hero image.

## Initial Test

### Create a Test Account

1. Go to http://localhost:3000/register
2. Choose "I want to rent/buy" (Customer role)
3. Fill in:
   - Full Name: Test Customer
   - Email: test@example.com
   - Password: password123
4. Click "Create Account"

You should be redirected to the customer dashboard.

### Or Create a Merchant Account

1. Go to http://localhost:3000/register
2. Choose "I own equipment" (Merchant role)
3. Fill in:
   - Full Name: Test Merchant
   - Business Name: Test Equipment Rentals
   - Email: merchant@example.com
   - Password: password123
4. Click "Create Account"

You should be redirected to the merchant dashboard.

**Note**: Newly created merchants need verification before they can publish equipment.

## Verify Everything Works

### Check Database

1. Go to Supabase Dashboard > Table Editor
2. Click on `users` table
3. You should see your test account

### Check Authentication

1. Log out (if logged in)
2. Go to http://localhost:3000/login
3. Sign in with your test account
4. You should be redirected to the appropriate dashboard

### Test Equipment Browse

1. Go to http://localhost:3000/browse
2. Currently no equipment will show (database is empty)
3. This is expected - equipment needs to be added by verified merchants

## Troubleshooting

### "Missing Supabase environment variables"

- Make sure `.env.local` exists in the project root
- Verify all Supabase variables are set
- Restart the dev server after changing env variables

### "Failed to create account" / Authentication errors

- Check Supabase auth is enabled: Dashboard > Authentication
- Verify your API keys are correct
- Check the browser console for detailed errors

### Database connection errors

- Verify your Supabase project is running
- Check your database password is correct
- Ensure Row Level Security policies are applied (they're in the schema)

### Next.js build errors

- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Run `npm run dev` again

### Port 3000 already in use

Kill the process:

Mac/Linux:
```bash
lsof -ti:3000 | xargs kill
```

Windows:
```powershell
taskkill /F /PID (Get-NetTCPConnection -LocalPort 3000).OwningProcess
```

Or use a different port:
```bash
npm run dev -- -p 3001
```

## Next Steps

### Add Test Equipment (as Admin)

Since you need verified merchants to add equipment, you can:

1. Manually insert test equipment via Supabase SQL Editor
2. Create an admin account and build the operations center
3. Or modify a merchant's verification status directly in the database

Example SQL to create a verified merchant:

```sql
-- First, get your user_id from the users table
SELECT id, email FROM users WHERE email = 'merchant@example.com';

-- Update merchant verification status
UPDATE merchant_profiles
SET verification_status = 'VERIFIED',
    verified_at = NOW()
WHERE user_id = 'your-user-id-here';
```

### Configure Paystack Webhook (for production)

1. In Paystack Dashboard > Settings > Webhooks
2. Add webhook URL: `https://your-domain.com/api/webhooks/paystack`
3. Copy the webhook secret
4. Add to production environment variables

### Enable Email Notifications

To send emails, integrate a service like:
- Resend
- SendGrid
- AWS SES

Add the API key to `.env.local` and implement email service.

## Development Workflow

### Git Workflow

```bash
git checkout -b feature/your-feature-name
# Make changes
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature-name
```

### Database Changes

1. Update `supabase/schema.sql`
2. Run the new SQL in Supabase SQL Editor
3. Test locally
4. Commit the schema file

### Adding New Features

1. Create service in `lib/services/`
2. Create API route in `app/api/`
3. Create components in `components/`
4. Create page in `app/`
5. Test thoroughly
6. Commit

## Production Deployment

### Deploy to Vercel

```bash
npm run build
vercel deploy --prod
```

### Environment Variables in Vercel

1. Go to Vercel Dashboard > Your Project > Settings > Environment Variables
2. Add all variables from `.env.local`
3. Make sure to use **Production** Paystack keys
4. Set `NODE_ENV=production`

### Database Setup for Production

Use the same Supabase project or create a production-specific one.

**Important**: Apply the schema to production database before deploying the app.

### Post-Deployment

1. Test all critical flows:
   - Registration
   - Login
   - Equipment browsing
   - Rental request submission
   - Payment flow (use Paystack test mode first)

2. Monitor errors with a service like:
   - Sentry
   - LogRocket
   - Vercel Analytics

3. Set up automated backups for your Supabase database

## Support

For development questions:
- Check `DEVELOPMENT.md` for architecture details
- Check `CLAUDE.md` for AI assistant guidelines
- Review the master build prompt in project documentation

---

**You're all set!** The platform is now ready for development.
