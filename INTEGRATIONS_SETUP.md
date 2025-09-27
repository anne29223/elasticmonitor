# ElasticMonitor - Integrations & Quick Setup Guide

Quick reference for all integrations and fresh setup procedures.

## Current Stack Overview

```
Frontend (React) → Vercel Static
     ↓
API Routes → Vercel Functions 
     ↓
PostgreSQL ← → Elasticsearch
     ↓
Session Store (PostgreSQL)
```

## Database Integrations

### Neon PostgreSQL (Recommended)
```bash
# Connection String Format
DATABASE_URL=postgresql://username:password@ep-xyz.us-east-1.aws.neon.tech/neondb?sslmode=require

# Features
✅ Serverless (auto-scaling)
✅ Built-in connection pooling  
✅ Free tier available
✅ Automatic backups
```

### Supabase PostgreSQL
```bash
# Connection String Format  
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

# Features
✅ Full PostgreSQL features
✅ Built-in Auth (optional)
✅ Real-time subscriptions
✅ Dashboard & SQL editor
```

### AWS RDS PostgreSQL
```bash
# Connection String Format
DATABASE_URL=postgresql://username:password@mydb.123456789012.us-east-1.rds.amazonaws.com:5432/elasticmonitor

# Features
✅ Enterprise-grade
✅ Multi-AZ availability
✅ Point-in-time recovery
✅ Performance insights
```

## Elasticsearch Integrations

### Elastic Cloud (Recommended)
```bash
# Setup Steps
1. Sign up at cloud.elastic.co
2. Create deployment (select region)
3. Save credentials shown after creation
4. Set environment variables:

ELASTICSEARCH_URL=https://[deployment-id].es.[region].aws.found.io:9243
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=[generated-password]

# Free tier: 14-day trial, then $25/month minimum
```

### Bonsai Elasticsearch
```bash
# Setup Steps  
1. Sign up at bonsai.io
2. Create cluster (Elasticsearch 8.x)
3. Get connection URL from dashboard
4. Set environment variables:

ELASTICSEARCH_URL=https://[cluster-name]-[id].bonsai.io
ELASTICSEARCH_USERNAME=[provided]  
ELASTICSEARCH_PASSWORD=[provided]

# Free tier: 35MB storage, 1 index
```

### AWS OpenSearch Service
```bash
# Setup Steps
1. Create domain in AWS OpenSearch
2. Configure access policies  
3. Get domain endpoint
4. Set environment variables:

ELASTICSEARCH_URL=https://search-[domain].es.amazonaws.com
ELASTICSEARCH_USERNAME=master-user
ELASTICSEARCH_PASSWORD=[set-during-creation]

# Pricing: Pay per hour + storage
```

### SearchBox (Heroku-style)
```bash
# Setup Steps
1. Sign up at searchbox.io  
2. Create deployment
3. Get connection details
4. Set environment variables:

ELASTICSEARCH_URL=https://[subdomain].searchbox.io
ELASTICSEARCH_USERNAME=[provided]
ELASTICSEARCH_PASSWORD=[provided]  

# Free tier: 200MB storage
```

## WebSocket Alternatives for Serverless

### Option 1: Server-Sent Events (SSE)
```typescript
// Backend - Add SSE endpoint
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  // Send data periodically
  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({stats: getStats()})}\n\n`);
  }, 2000);
  
  req.on('close', () => clearInterval(interval));
});

// Frontend - Connect to SSE
const eventSource = new EventSource('/api/events');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateStats(data.stats);
};
```

### Option 2: Polling with React Query
```typescript
// Frontend - Auto-refetch every 2 seconds
const { data: stats } = useQuery({
  queryKey: ['dashboard-stats'],
  queryFn: () => fetch('/api/dashboard/stats').then(res => res.json()),
  refetchInterval: 2000,
  refetchIntervalInBackground: true
});
```

### Option 3: Pusher (External Service)
```bash
# Install Pusher
npm install pusher pusher-js

# Environment Variables
PUSHER_APP_ID=your-app-id
PUSHER_KEY=your-key  
PUSHER_SECRET=your-secret
PUSHER_CLUSTER=your-cluster

# Monthly cost: $49+ for production features
```

## Session Storage Options

### Option 1: PostgreSQL Sessions (Current)
```typescript
// Already configured in server/index.ts
app.use(session({
  store: new (require('connect-pg-simple')(session))({
    conString: process.env.DATABASE_URL
  })
}));
```

### Option 2: Upstash Redis (Serverless)
```bash
# Setup
1. Create account at upstash.com
2. Create Redis database
3. Install: npm install @upstash/redis connect-redis

# Environment Variables  
UPSTASH_REDIS_REST_URL=https://[name].upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Free tier: 10,000 commands/day
```

### Option 3: Vercel KV (Built-in Redis)
```bash
# Setup - Automatic with Vercel account
# Install: npm install @vercel/kv

# Environment Variables (auto-configured)
KV_REST_API_URL=https://[project].kv.vercel-storage.com
KV_REST_API_TOKEN=[auto-generated]

# Pricing: $1/100k operations
```

## Fresh Setup Commands

### Complete Reset (Nuclear Option)
```bash
# 1. Reset Database
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 2. Recreate Tables
npx drizzle-kit push

# 3. Reset Elasticsearch
curl -X DELETE "$ELASTICSEARCH_URL/logs-network*" -u "$ELASTICSEARCH_USERNAME:$ELASTICSEARCH_PASSWORD"

# 4. Clear Vercel env vars (manually in dashboard)

# 5. Redeploy
vercel --prod
```

### Fresh Development Setup
```bash
# 1. Clone repository
git clone your-repo
cd elasticmonitor

# 2. Install dependencies  
npm install

# 3. Setup environment
cp .env.example .env.local
# Edit .env.local with your values

# 4. Setup database
npx drizzle-kit push

# 5. Start development
npm run dev
```

### Fresh Production Deployment
```bash
# 1. Setup database (choose one)
# → Neon, Supabase, or AWS RDS

# 2. Setup Elasticsearch (choose one)  
# → Elastic Cloud, Bonsai, or AWS OpenSearch

# 3. Deploy to Vercel
vercel --prod

# 4. Configure environment variables in Vercel dashboard

# 5. Migrate schema
npx drizzle-kit push

# 6. Test deployment
curl https://your-app.vercel.app/api/dashboard/stats
```

## Environment Variable Templates

### Development (.env.local)
```bash
# Database
DATABASE_URL=postgresql://localhost:5432/elasticmonitor

# Elasticsearch  
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=

# App
NODE_ENV=development
SESSION_SECRET=dev-secret-123
```

### Production (Vercel Dashboard)
```bash
# Database (example: Neon)
DATABASE_URL=postgresql://user:pass@ep-xyz.us-east-1.aws.neon.tech/neondb

# Elasticsearch (example: Elastic Cloud)
ELASTICSEARCH_URL=https://deployment.es.region.aws.found.io:9243  
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=generated-password

# App
NODE_ENV=production
SESSION_SECRET=secure-random-string-256-chars
```

## Cost Estimates

### Minimal Setup (Development/Testing)
- **Database**: Neon Free Tier (0.5GB) - **FREE**
- **Elasticsearch**: Bonsai Free Tier (35MB) - **FREE** 
- **Hosting**: Vercel Hobby Plan - **FREE**
- **Total**: **$0/month**

### Production Setup (Small)
- **Database**: Neon Pro (10GB) - **$24/month**
- **Elasticsearch**: Elastic Cloud Basic - **$25/month**  
- **Hosting**: Vercel Pro Plan - **$20/month**
- **Total**: **$69/month**

### Production Setup (Medium)
- **Database**: Supabase Pro (50GB) - **$25/month**
- **Elasticsearch**: Elastic Cloud Standard - **$95/month**
- **Hosting**: Vercel Pro - **$20/month**  
- **Sessions**: Upstash Redis - **$10/month**
- **Total**: **$150/month**

## Integration Decision Matrix

| Factor | Neon | Supabase | RDS | Elastic Cloud | Bonsai | OpenSearch |
|--------|------|----------|-----|---------------|---------|------------|
| **Free Tier** | ✅ 0.5GB | ✅ 500MB | ❌ | ❌ 14-day trial | ✅ 35MB | ❌ |
| **Serverless** | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| **Easy Setup** | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| **Enterprise** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Cost (Small)** | $24 | $25 | $15+ | $25 | $10 | $20+ |

## Quick Commands Reference

```bash
# Database
npx drizzle-kit push          # Apply schema changes
npx drizzle-kit studio        # Visual database editor
pg_dump $DATABASE_URL         # Backup database

# Development  
npm run dev                   # Start dev server
npm run build                 # Build for production
npm run type-check            # Check TypeScript

# Deployment
vercel                        # Deploy to preview
vercel --prod                 # Deploy to production
vercel env ls                 # List environment variables

# Elasticsearch
curl $ELASTICSEARCH_URL/_cluster/health    # Check cluster health
curl $ELASTICSEARCH_URL/_cat/indices       # List indices
```

This covers all the integrations and setup procedures you'll need for ElasticMonitor deployment!