# ElasticMonitor - Vercel Migration Guide

This guide covers migrating ElasticMonitor from Replit to Vercel with production database and Elasticsearch integration.

## Overview

ElasticMonitor will be deployed with:
- **Frontend**: React SPA served as Vercel static assets
- **Backend**: Express API as Vercel serverless functions
- **Database**: Managed PostgreSQL (Neon, Supabase, or AWS RDS)
- **Elasticsearch**: Cloud service (Elastic Cloud, Bonsai, AWS OpenSearch)
- **WebSockets**: Converted to polling or Socket.IO with serverless compatibility

## Prerequisites

- Vercel account with CLI installed
- Git repository with your ElasticMonitor code
- Access to export data from current Replit PostgreSQL

## Step 1: Database Migration

### Option A: Neon (Recommended)
1. **Create Neon Project**: Go to [neon.tech](https://neon.tech)
2. **Create database**: Name it `elasticmonitor`
3. **Get connection string**: Copy the `DATABASE_URL`
4. **Export current data**:
   ```bash
   # On Replit, export your current data
   pg_dump $DATABASE_URL > elasticmonitor_backup.sql
   ```
5. **Import to Neon**:
   ```bash
   psql "your-neon-connection-string" < elasticmonitor_backup.sql
   ```

### Option B: Supabase
1. **Create project** at [supabase.com](https://supabase.com)
2. **Get connection details** from Settings → Database
3. **Export and import** similar to Neon steps above

### Option C: AWS RDS
1. **Create RDS PostgreSQL instance**
2. **Configure security groups** for external access
3. **Export and import** using connection string

## Step 2: Vercel Configuration

### Create `vercel.json`
```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/**/*",
      "use": "@vercel/static"
    },
    {
      "src": "server/index.ts",
      "use": "@vercel/node",
      "config": {
        "includeFiles": ["server/**/*", "shared/**/*"]
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/dist/$1"
    }
  ],
  "functions": {
    "server/index.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Update `package.json` scripts
```json
{
  "scripts": {
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build --outDir dist",
    "build:server": "tsc server/index.ts --outDir api --target es2020 --moduleResolution node",
    "vercel-build": "npm run build"
  }
}
```

## Step 3: Environment Variables

### Required Environment Variables
Set these in Vercel Project Settings → Environment Variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/elasticmonitor

# Elasticsearch (choose one option below)
ELASTICSEARCH_URL=https://your-cluster.es.region.cloud.es.io:9243
ELASTICSEARCH_USERNAME=elastic  
ELASTICSEARCH_PASSWORD=your-password
# OR for API key auth:
ELASTICSEARCH_API_KEY=base64-encoded-id:api-key

# Session & Security
SESSION_SECRET=your-secure-random-string-here
NODE_ENV=production

# Optional: WebSocket configuration
WEBSOCKET_ORIGIN=https://your-domain.vercel.app
```

## Step 4: Elasticsearch Cloud Setup

### Option A: Elastic Cloud (Recommended)
1. **Sign up** at [cloud.elastic.co](https://cloud.elastic.co)
2. **Create deployment**:
   - Choose your region (closest to your users)
   - Select appropriate tier (start with Basic)
   - Note the credentials shown after creation
3. **Configure index template**:
   ```bash
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

### Option B: Bonsai
1. **Sign up** at [bonsai.io](https://bonsai.io)
2. **Create cluster** (choose Elasticsearch 8.x)
3. **Get connection URL** from dashboard
4. **Create index template** similar to above

### Option C: AWS OpenSearch
1. **Create domain** in AWS OpenSearch Service
2. **Configure access policies** for your IP/VPC
3. **Get domain endpoint** and credentials
4. **Update environment variables** accordingly

## Step 5: WebSocket Strategy

### Option A: Convert to Polling (Recommended for Vercel)
Update the frontend to poll `/api/dashboard/stats` every 2-3 seconds instead of WebSocket:

```typescript
// In your React component
useEffect(() => {
  const interval = setInterval(() => {
    // Refetch data using React Query
    queryClient.invalidateQueries(['dashboard-stats']);
  }, 2000);

  return () => clearInterval(interval);
}, []);
```

### Option B: Socket.IO with Serverless Adapter
1. **Install dependencies**:
   ```bash
   npm install socket.io socket.io-adapter-redis
   ```
2. **Configure serverless adapter** in your WebSocket handler

## Step 6: Build Configuration

### Update `vite.config.ts`
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-select']
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared')
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  }
})
```

## Step 7: Deployment

### Deploy to Vercel
1. **Connect repository**:
   ```bash
   vercel --prod
   ```

2. **Set environment variables** in Vercel dashboard

3. **Configure build settings**:
   - Build Command: `npm run vercel-build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Deploy**:
   ```bash
   vercel --prod
   ```

## Step 8: Database Schema Migration

### Run migrations on new database
```bash
# Install dependencies locally
npm install

# Set your new DATABASE_URL
export DATABASE_URL="your-neon-or-supabase-url"

# Push schema to new database
npx drizzle-kit push
```

## Step 9: Testing & Validation

### Test Checklist
- [ ] Frontend loads correctly
- [ ] API endpoints respond (`/api/dashboard/stats`)
- [ ] Database connections work
- [ ] Elasticsearch integration functional
- [ ] Real-time updates working (polling or WebSocket)
- [ ] Environment variables properly set
- [ ] HTTPS redirects working

### Performance Optimization
1. **Enable connection pooling** in database configuration
2. **Configure caching headers** for static assets
3. **Monitor cold starts** and optimize if needed
4. **Set up Vercel Analytics** for monitoring

## Reset/Fresh Setup Procedures

### Complete Reset
If you need to start fresh:

1. **Reset Database**:
   ```sql
   -- Connect to your database and run:
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   GRANT ALL ON SCHEMA public TO public;
   ```

2. **Recreate Schema**:
   ```bash
   npx drizzle-kit push
   ```

3. **Reset Elasticsearch Index**:
   ```bash
   curl -X DELETE "https://your-cluster.es.region.cloud.es.io:9243/logs-network*" \
        -u "elastic:your-password"
   ```

4. **Rotate Secrets**:
   - Generate new `SESSION_SECRET`
   - Update database passwords
   - Regenerate Elasticsearch API keys
   - Update all environment variables in Vercel

### Environment-Specific Setup

#### Development Environment
```bash
# .env.local
DATABASE_URL=postgresql://localhost:5432/elasticmonitor_dev
ELASTICSEARCH_URL=http://localhost:9200
SESSION_SECRET=dev-secret-key
NODE_ENV=development
```

#### Staging Environment
- Use Vercel preview deployments
- Separate database instance
- Limited Elasticsearch resources
- Non-production secrets

#### Production Environment  
- Full resource allocation
- Production-grade database
- Monitoring and alerting enabled
- Secure secret management

## Troubleshooting

### Common Issues

**Build Failures**:
- Check Node.js version compatibility (18.x or 20.x)
- Verify all dependencies are production-ready
- Review build logs for missing environment variables

**Database Connection Errors**:
- Verify connection string format
- Check firewall/security group rules
- Test connection pooling settings

**Elasticsearch Integration Issues**:
- Confirm authentication method (basic auth vs API key)
- Check cluster health and accessibility
- Verify index templates and mappings

**Cold Start Performance**:
- Implement connection reuse
- Consider upgrading Vercel plan for better performance
- Optimize bundle size and dependencies

## Integration Information

### Current Integrations
- **Database**: Drizzle ORM with PostgreSQL
- **Frontend**: React + Vite + TailwindCSS
- **UI Components**: shadcn/ui (Radix UI)
- **Charts**: Chart.js
- **Real-time**: WebSocket (convert to polling)
- **Session Storage**: PostgreSQL-backed sessions

### Optional Integrations
- **Monitoring**: Vercel Analytics, Sentry
- **Caching**: Redis (Upstash) for session storage
- **CDN**: Vercel Edge Network (automatic)
- **Logging**: LogFlare, DataDog

## Security Checklist

- [ ] Environment variables properly secured
- [ ] Database access restricted to application
- [ ] Elasticsearch cluster secured with authentication
- [ ] HTTPS enforced for all connections
- [ ] Session secrets rotated regularly
- [ ] API keys limited to minimum required permissions

## Support & Maintenance

### Monitoring
- Set up Vercel deployment notifications
- Monitor database connection pools
- Track Elasticsearch cluster health
- Watch for cold start performance issues

### Backup Strategy
- Automated database backups (Neon/Supabase feature)
- Export Elasticsearch data periodically
- Version control for configuration changes
- Document all environment variable changes

---

This completes your migration to Vercel. Your ElasticMonitor will be running on production infrastructure with managed services for reliability and scalability.