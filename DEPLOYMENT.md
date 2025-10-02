# 🚀 Production Deployment Guide

This guide will help you deploy your Vector Similarity Tool to production using Vercel's ecosystem.

## 📋 Prerequisites

- Vercel account
- Google Cloud Console account (for OAuth)
- Email provider (Gmail recommended)

## 🗄️ Step 1: Set up Vercel Postgres

1. Go to your Vercel dashboard
2. Navigate to Storage → Create Database → Postgres
3. Choose a name like `vector-similarity-db`
4. Copy the connection strings

## 🔑 Step 2: Set up Vercel KV (Redis)

1. In Vercel dashboard, go to Storage → Create Database → KV
2. Choose a name like `vector-similarity-kv`
3. Copy the connection details

## 🔐 Step 3: Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Set authorized redirect URIs:
   - `https://your-domain.vercel.app/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (for development)

## 📧 Step 4: Email Provider Setup (Optional)

### Using Gmail:
1. Enable 2-factor authentication
2. Generate an App Password
3. Use your Gmail and App Password in environment variables

## 🌍 Step 5: Environment Variables

In your Vercel project settings, add these environment variables:

### Database
```
POSTGRES_PRISMA_URL=your_vercel_postgres_url
POSTGRES_URL_NON_POOLING=your_vercel_postgres_direct_url
```

### Authentication
```
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-random-secret-32-chars-min
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
```

### Email (Optional)
```
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
```

### Security
```
ENCRYPTION_KEY=your-32-character-secret-key-here!
```

### Redis (Auto-configured by Vercel KV)
```
KV_REST_API_URL=auto-configured-by-vercel
KV_REST_API_TOKEN=auto-configured-by-vercel
```

## 🛠️ Step 6: Database Migration

1. Install Vercel CLI: `npm i -g vercel`
2. Link your project: `vercel link`
3. Pull environment variables: `vercel env pull .env.local`
4. Run migration: `npx prisma migrate deploy`
5. Generate Prisma client: `npx prisma generate`

## 🚀 Step 7: Deploy

```bash
# Deploy to production
vercel --prod

# Or push to main branch (if auto-deploy is enabled)
git push origin main
```

## 🔧 Step 8: Post-Deployment Setup

1. **Test Authentication**: Visit your deployed app and try signing in
2. **Add API Keys**: Users can now add their own API keys securely
3. **Monitor Usage**: Check Vercel Analytics and your database

## 📊 Monitoring & Maintenance

### Vercel Dashboard
- Monitor function execution times
- Check error rates
- Review usage analytics

### Database Monitoring
```sql
-- Check user activity
SELECT COUNT(*) as active_users 
FROM users 
WHERE "lastRequestAt" > NOW() - INTERVAL '7 days';

-- Monitor API usage
SELECT provider, COUNT(*) as requests, SUM(cost) as total_cost
FROM "ApiUsage" 
WHERE "createdAt" > NOW() - INTERVAL '1 day'
GROUP BY provider;
```

### Rate Limiting
- Default: 60 requests/minute per user
- Adjust in `lib/rate-limit.ts` if needed

## 💰 Cost Estimation

### Vercel (Pro Plan - Recommended)
- **Hosting**: $20/month
- **Postgres**: $20/month (starts free)
- **KV**: $10/month (starts free)

### User API Costs
- **OpenAI**: $0.00002-$0.00013 per 1K tokens
- **Google AI**: Currently free

### Total Monthly Cost
- **Minimum**: $0 (free tiers)
- **Production**: ~$50/month + user API usage

## 🔒 Security Features

✅ **API Keys Encrypted**: AES-256-GCM encryption  
✅ **Rate Limited**: 60 requests/minute per user  
✅ **Authenticated**: OAuth + JWT sessions  
✅ **HTTPS Only**: Enforced in production  
✅ **No Client Exposure**: API keys never sent to frontend  

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check POSTGRES_PRISMA_URL format
   - Ensure database is accessible from Vercel

2. **OAuth Redirect Error**
   - Verify redirect URIs in Google Console
   - Check NEXTAUTH_URL matches your domain

3. **Rate Limiting Issues**
   - Check KV connection
   - Fallback to database rate limiting

4. **API Key Decryption Error**
   - Ensure ENCRYPTION_KEY is exactly 32 characters
   - Check if key was encrypted with different secret

### Support
- Check Vercel logs: `vercel logs`
- Monitor database: Vercel dashboard → Storage
- Debug locally: Copy production env vars to `.env.local`

## 🎯 Next Steps

1. **Custom Domain**: Add your domain in Vercel settings
2. **Analytics**: Set up Vercel Analytics
3. **Monitoring**: Add error tracking (Sentry)
4. **Backup**: Set up database backups
5. **CDN**: Configure edge caching for static assets

Your Vector Similarity Tool is now production-ready! 🎉
