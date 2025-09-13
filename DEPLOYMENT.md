# ElasticMonitor Deployment Guide

## Deploy to Vercel

### Prerequisites
- Vercel account
- PostgreSQL database (Neon, Supabase, or similar)
- Elasticsearch cluster with API access

### Step 1: Prepare Your Environment

1. **Clone/Download** your project files
2. **Install dependencies**:
   ```bash
   npm install
   ```

### Step 2: Database Setup

1. **Create a PostgreSQL database** (recommended: Neon, Supabase)
2. **Get your DATABASE_URL** connection string
3. **Run database migrations**:
   ```bash
   npm run db:push
   ```

### Step 3: Environment Variables

Create a `.env.local` file with these variables:

```env
# Database
DATABASE_URL=postgresql://username:password@host:port/database
PGDATABASE=your_database_name
PGHOST=your_host
PGPASSWORD=your_password
PGPORT=5432
PGUSER=your_username

# Elasticsearch
ELASTICSEARCH_URL=https://your-cluster.es.region.azure.elastic.cloud
ELASTICSEARCH_API_KEY=your_api_key_here

# Session (generate a random secret)
SESSION_SECRET=your_very_long_random_secret_string
```

### Step 4: Build Configuration

Update `package.json` with build scripts:

```json
{
  "scripts": {
    "build": "npm run build:client && npm run build:server",
    "build:client": "cd client && npm run build",
    "build:server": "cd server && tsc",
    "start": "node server/dist/index.js",
    "vercel-build": "npm run build:client"
  }
}
```

### Step 5: Deploy to Vercel

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Add Environment Variables** in Vercel dashboard:
   - Go to your project settings
   - Add all environment variables from Step 3
   - Redeploy if needed

### Step 6: Configure Domains (Optional)

1. **Add custom domain** in Vercel dashboard
2. **Update Elasticsearch CORS** if needed
3. **Test all functionality**

## Migration Checklist

- [ ] Database created and migrated
- [ ] Environment variables configured
- [ ] Elasticsearch connection tested
- [ ] Build process works locally
- [ ] Vercel deployment successful
- [ ] All API endpoints working
- [ ] WebSocket connections active
- [ ] Data syncing from Elasticsearch

## Troubleshooting

### Common Issues:

1. **Database Connection Fails**
   - Check DATABASE_URL format
   - Verify database is accessible from Vercel

2. **Elasticsearch Not Connecting**
   - Verify API key is correct
   - Check CORS settings on Elasticsearch
   - Ensure cluster is accessible publicly

3. **Build Failures**
   - Check all dependencies are installed
   - Verify TypeScript compilation
   - Check file paths in vercel.json

4. **WebSocket Issues**
   - Vercel has limitations on WebSocket
   - Consider using Vercel's Edge Runtime
   - May need to disable WebSocket for serverless

## Performance Optimizations

1. **Database Pooling**: Already configured with Neon
2. **Caching**: Add Redis for session storage
3. **CDN**: Vercel automatically handles static files
4. **Monitoring**: Add Vercel Analytics

## Security Notes

- All secrets are environment variables
- API endpoints use authentication
- Database uses SSL connections
- Elasticsearch uses API key authentication

Your ElasticMonitor is now ready for production deployment! 🚀