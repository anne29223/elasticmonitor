# ElasticMonitor - Netlify Migration Guide

Complete guide for migrating ElasticMonitor from Replit to Netlify with production database and Elasticsearch integration.

## Overview

ElasticMonitor on Netlify will use:
- **Frontend**: React SPA served as static files
- **Backend**: Express API converted to Netlify Functions (AWS Lambda)
- **Database**: Managed PostgreSQL (Neon, Supabase, or AWS RDS)
- **Elasticsearch**: Cloud service (Elastic Cloud, Bonsai, AWS OpenSearch)
- **Real-time**: Server-Sent Events (SSE) or polling (WebSockets not supported)

## Key Netlify Limitations
- **Function Timeout**: 10s default, 26s maximum
- **No Persistent Connections**: WebSockets require alternative approach
- **AWS Lambda Runtime**: Node.js 18.x environment
- **Memory Limits**: 128MB-3008MB (configurable)

## Step 1: Project Structure Reorganization

### Create Netlify Functions Directory
```bash
mkdir -p netlify/functions
mkdir -p scripts
```

### Updated Project Structure
```
├── client/              # React frontend
├── server/             # Express server (to be converted)
├── netlify/
│   └── functions/      # Netlify Functions
├── shared/             # Shared schemas
├── scripts/            # Build and migration scripts
├── netlify.toml        # Netlify configuration
└── package.json
```

## Step 2: Convert Express API to Netlify Functions

### Create API Function Handler
Create `netlify/functions/api.js`:

```javascript
const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const connectPgSimple = require('connect-pg-simple');

// Import your existing route handlers
const { setupDatabase } = require('../../server/db');
const { createDashboardRoutes } = require('../../server/routes/dashboard');
const { createNetworkLogRoutes } = require('../../server/routes/networkLogs');
const { createAlertsRoutes } = require('../../server/routes/alerts');
const { createConnectionsRoutes } = require('../../server/routes/connections');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// Session configuration
const PgSession = connectPgSimple(session);
app.use(session({
  store: new PgSession({
    conString: process.env.DATABASE_URL,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));

// Setup database
setupDatabase();

// Routes
app.use('/api/dashboard', createDashboardRoutes());
app.use('/api/network-logs', createNetworkLogRoutes());
app.use('/api/alerts', createAlertsRoutes());
app.use('/api/connections', createConnectionsRoutes());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Export handler
module.exports.handler = serverless(app);
```

### Create Server-Sent Events Function
Create `netlify/functions/events.js`:

```javascript
exports.handler = async (event, context) => {
  // Set up SSE headers
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Import your stats service
    const { getDashboardStats } = require('../../server/services/statsService');
    
    const stats = await getDashboardStats();
    
    // Send SSE formatted data
    const data = `data: ${JSON.stringify(stats)}\n\n`;
    
    return {
      statusCode: 200,
      headers,
      body: data
    };
  } catch (error) {
    console.error('SSE Error:', error);
    return {
      statusCode: 500,
      headers,
      body: `data: ${JSON.stringify({ error: 'Internal server error' })}\n\n`
    };
  }
};
```

### Create Background Sync Function
Create `netlify/functions/sync-elasticsearch.js`:

```javascript
exports.handler = async (event, context) => {
  const { ElasticsearchService } = require('../../server/services/elasticsearchService');
  
  try {
    const esService = new ElasticsearchService();
    await esService.syncRecentLogs();
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Elasticsearch sync completed',
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Elasticsearch sync error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
```

## Step 3: Netlify Configuration

### Create `netlify.toml`
```toml
[build]
  base = ""
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"
  NPM_FLAGS = "--production=false"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200

[[redirects]]
  from = "/events"
  to = "/.netlify/functions/events"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, immutable, max-age=31536000"

# Environment-specific builds
[context.production]
  command = "npm run build:prod"

[context.deploy-preview]
  command = "npm run build:preview"

[context.branch-deploy]
  command = "npm run build"

# Scheduled function for Elasticsearch sync
[[plugins]]
  package = "@netlify/plugin-nextjs"

# For background functions (if using Netlify Background Functions)
[functions."sync-elasticsearch"]
  schedule = "*/5 * * * *"  # Every 5 minutes
```

## Step 4: Update Package.json Scripts

```json
{
  "scripts": {
    "build": "npm run build:client && npm run build:functions",
    "build:client": "vite build --outDir dist",
    "build:functions": "npm run build:api-function",
    "build:api-function": "esbuild netlify/functions/api.js --bundle --platform=node --target=node18 --outfile=netlify/functions/api.js --external:aws-sdk",
    "build:prod": "NODE_ENV=production npm run build",
    "build:preview": "NODE_ENV=preview npm run build",
    "dev": "netlify dev",
    "dev:client": "vite",
    "dev:functions": "netlify functions:serve",
    "deploy": "netlify deploy",
    "deploy:prod": "netlify deploy --prod",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

## Step 5: Update Frontend for Netlify

### Replace WebSocket with Server-Sent Events
Update your React components:

```typescript
// hooks/useRealTimeStats.ts
import { useEffect, useState } from 'react';

interface DashboardStats {
  totalTraffic: string;
  activeConnections: number;
  // ... other stats
}

export function useRealTimeStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource('/events');
    
    eventSource.onopen = () => {
      setIsConnected(true);
      console.log('SSE connected');
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setStats(data);
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return { stats, isConnected };
}
```

### Alternative: Use Polling with React Query
```typescript
// hooks/usePollingStats.ts
import { useQuery } from '@tanstack/react-query';

export function usePollingStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/stats');
      return response.json();
    },
    refetchInterval: 3000, // Poll every 3 seconds
    refetchIntervalInBackground: true,
    staleTime: 1000, // Consider data stale after 1 second
  });
}
```

## Step 6: Database Migration

### Same as Vercel - Choose Your Database

#### Option A: Neon (Recommended for Netlify)
```bash
# Setup Neon
1. Create account at neon.tech
2. Create database: elasticmonitor
3. Get connection string
4. Export from Replit: pg_dump $DATABASE_URL > backup.sql
5. Import to Neon: psql "neon-connection-string" < backup.sql
```

#### Option B: Supabase
```bash
# Setup Supabase
1. Create project at supabase.com
2. Get connection details from Settings → Database
3. Export and import similar to Neon
```

## Step 7: Environment Variables

### Set in Netlify Dashboard
Go to Site Settings → Environment Variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/elasticmonitor

# Elasticsearch (choose one option)
ELASTICSEARCH_URL=https://your-cluster.es.region.cloud.es.io:9243
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your-password

# App Configuration  
NODE_ENV=production
SESSION_SECRET=your-secure-random-string
FRONTEND_URL=https://your-site.netlify.app

# Optional: For scheduled functions
ELASTICSEARCH_SYNC_ENABLED=true
```

### Environment Context Configuration
```bash
# Production
netlify env:set DATABASE_URL "your-prod-db-url" --context production

# Deploy Preview  
netlify env:set DATABASE_URL "your-staging-db-url" --context deploy-preview

# Development
netlify env:set DATABASE_URL "your-dev-db-url" --context dev
```

## Step 8: Elasticsearch Cloud Setup

### Same options as Vercel, with Netlify considerations:

#### Elastic Cloud (Recommended)
```bash
# Setup steps same as Vercel guide
1. Sign up at cloud.elastic.co
2. Create deployment
3. Configure index template:

curl -X PUT "https://your-cluster.es.region.cloud.es.io:9243/_index_template/logs-network" \
     -u "elastic:your-password" \
     -H "Content-Type: application/json" \
     -d '{
       "index_patterns": ["logs-network*"],
       "template": {
         "mappings": {
           "properties": {
             "timestamp": {"type": "date"},
             "source_ip": {"type": "ip"},
             "dest_ip": {"type": "ip"},
             "source_port": {"type": "integer"},
             "dest_port": {"type": "integer"},
             "protocol": {"type": "keyword"},
             "bytes_sent": {"type": "long"},
             "bytes_received": {"type": "long"}
           }
         }
       }
     }'
```

## Step 9: Deployment

### Install Netlify CLI
```bash
npm install -g netlify-cli
netlify login
```

### Initialize and Deploy
```bash
# Initialize site
netlify init

# Deploy to preview
netlify deploy

# Deploy to production
netlify deploy --prod
```

### Set up Continuous Deployment
1. **Connect Git Repository** in Netlify dashboard
2. **Configure Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
3. **Set Environment Variables** in dashboard
4. **Deploy automatically** on git push

## Step 10: Database Schema Migration

```bash
# Set your new DATABASE_URL environment variable
export DATABASE_URL="your-netlify-database-url"

# Push schema to new database
npx drizzle-kit push

# Optional: Run custom migration script
npx tsx scripts/migrate.ts
```

## Step 11: Real-time Strategy Selection

### Option A: Server-Sent Events (Recommended)
- Uses the SSE function created above
- Works well with Netlify Functions
- Browser automatically reconnects
- Lower resource usage than polling

### Option B: Short Polling
- Simple implementation with React Query
- More predictable resource usage
- Works with any serverless platform
- Slightly higher latency

### Option C: Third-party Service (Pusher/Ably)
```bash
# Install Pusher
npm install pusher pusher-js

# Add to environment variables
PUSHER_APP_ID=your-app-id
PUSHER_KEY=your-key
PUSHER_SECRET=your-secret
PUSHER_CLUSTER=your-cluster

# Monthly cost: $49+ for production
```

## Step 12: Testing & Validation

### Local Development
```bash
# Install Netlify CLI if not already done
npm install -g netlify-cli

# Start local development
netlify dev

# This will start:
# - Frontend at http://localhost:8888
# - Functions at http://localhost:8888/.netlify/functions/
```

### Test Checklist
- [ ] Frontend loads correctly
- [ ] API endpoints respond (`/.netlify/functions/api/dashboard/stats`)
- [ ] Real-time updates working (SSE or polling)
- [ ] Database connections functional
- [ ] Elasticsearch integration working
- [ ] Environment variables properly set
- [ ] Functions deploy successfully
- [ ] Domain and SSL configured

## Step 13: Fresh Setup & Reset Procedures

### Complete Reset
```bash
# 1. Reset Database
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 2. Recreate Schema
npx drizzle-kit push

# 3. Reset Elasticsearch
curl -X DELETE "$ELASTICSEARCH_URL/logs-network*" \
     -u "$ELASTICSEARCH_USERNAME:$ELASTICSEARCH_PASSWORD"

# 4. Clear Netlify environment variables
netlify env:unset DATABASE_URL
netlify env:unset ELASTICSEARCH_URL
# ... unset other variables

# 5. Redeploy
netlify deploy --prod
```

### Fresh Development Setup
```bash
# 1. Clone and install
git clone your-repo
cd elasticmonitor
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with local values

# 3. Setup database locally or use managed service
npx drizzle-kit push

# 4. Start development
netlify dev
```

### Fresh Production Deployment
```bash
# 1. Setup managed database (Neon/Supabase)
# 2. Setup Elasticsearch cloud service
# 3. Configure Netlify environment variables
# 4. Deploy: netlify deploy --prod
# 5. Run database migrations: npx drizzle-kit push
```

## Netlify-Specific Optimizations

### Function Performance
```javascript
// Optimize cold starts by reusing connections
let dbPool;
let esClient;

exports.handler = async (event, context) => {
  // Reuse connections across invocations
  if (!dbPool) {
    dbPool = createDatabasePool();
  }
  
  if (!esClient) {
    esClient = createElasticsearchClient();
  }
  
  // Your function logic here
};
```

### Background Functions
For long-running tasks, use Netlify Background Functions:

```javascript
// netlify/functions/background-sync.js
exports.handler = async (event, context) => {
  // This can run for up to 15 minutes
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    await performLongRunningSync();
    return { statusCode: 200, body: 'Sync completed' };
  } catch (error) {
    return { statusCode: 500, body: error.message };
  }
};
```

## Cost Estimates

### Free Tier Setup
- **Hosting**: Netlify Free (100GB bandwidth) - **FREE**
- **Database**: Neon Free (0.5GB) - **FREE**  
- **Elasticsearch**: Bonsai Free (35MB) - **FREE**
- **Total**: **$0/month**

### Production Setup
- **Hosting**: Netlify Pro ($19/month)
- **Database**: Neon Pro ($24/month)
- **Elasticsearch**: Elastic Cloud ($25/month)
- **Functions**: Included in Pro plan
- **Total**: **$68/month**

## Troubleshooting

### Common Issues

**Function Timeouts**:
- Break large operations into smaller chunks
- Use background functions for long tasks
- Implement proper error handling and retries

**Cold Start Performance**:
- Implement connection reuse patterns
- Use Netlify's function warming
- Consider upgrading to Pro plan for better performance

**Real-time Updates Not Working**:
- Check SSE implementation
- Verify CORS headers
- Test with polling as fallback

## Monitoring & Maintenance

### Netlify Analytics
- Enable Web Analytics in dashboard
- Monitor function performance
- Track deployment success rates

### Function Logs
```bash
# View function logs
netlify logs:function api

# Stream live logs
netlify logs:function api --live
```

### Database Monitoring
- Set up connection pool monitoring
- Monitor query performance
- Configure automated backups

This completes your Netlify migration guide. ElasticMonitor will run efficiently on Netlify's serverless platform with proper real-time capabilities and production-grade infrastructure.