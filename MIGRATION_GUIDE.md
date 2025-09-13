# ElasticMonitor Migration Guide

## Platform Recommendations

### 🚀 **Replit Deployment** (Recommended)
- **Pros**: Zero config, works with existing setup, automatic scaling, built-in secrets
- **Cons**: Higher cost for sustained traffic
- **Best for**: Quick deployment, development, testing
- **⚠️ Note**: Uses PostgreSQL database for data persistence

### ⚡ **Frontend-Only Netlify + Backend Elsewhere**
- **Pros**: Excellent frontend performance, free tier, custom domains
- **Cons**: Backend needs separate hosting, requires WebSocket server for real-time features
- **Best for**: Static frontend with API hosted on Replit/Render/Railway
- **⚠️ Limitation**: Frontend can connect to WebSocket servers, but real-time features need backend WebSocket support

---

## 🚀 Replit Deployment (Recommended Path)

### Step 1: Set Up Database
1. **In your Replit workspace**, go to Tools → Database
2. **Select PostgreSQL** (required for ElasticMonitor)
3. **DATABASE_URL** will be automatically added to your environment

### Step 2: Configure Environment Variables
In your Replit workspace, go to **Tools → Secrets** and add:

```env
# Database (automatically set by Replit when you add PostgreSQL)
DATABASE_URL=<automatically_set>

# Elasticsearch Configuration
ELASTICSEARCH_URL=http://your-server:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your_password
# OR use API key instead
ELASTICSEARCH_API_KEY=your_api_key

# Security
SESSION_SECRET=your_very_long_random_secret_here
```

### Step 3: Build and Deploy
Create/update `.replit` file:
```toml
run = "npm run build && npm start"
entrypoint = "server/index.ts"

[deployment]
run = ["npm", "run", "build", "&&", "npm", "start"]
deploymentTarget = "autoscale"

[env]
NODE_ENV = "production"
```

Update `package.json` scripts (if not already present):
```json
{
  "scripts": {
    "build": "vite build",
    "start": "NODE_ENV=production tsx server/index.ts"
  }
}
```

### Step 4: Deploy to Replit
1. **Click "Publish"** in your Replit workspace
2. **Choose "Autoscale Deployment"**
3. **Configure settings**:
   - CPU: 0.5 vCPU (start small)
   - RAM: 1GB
   - Max machines: 2-3
4. **Click "Publish"**

### Step 5: Run Database Migrations
After deployment:
```bash
# In Replit shell
npm run db:push
```

### Step 6: Verify Deployment
- Your app will be live at `https://your-app-name.your-username.replit.app`
- Test: Dashboard loads, database connection, Elasticsearch sync
- Verify real-time features work

---

## ⚡ Alternative: Frontend on Netlify + Backend Elsewhere

### Step 1: Split Architecture
- **Frontend**: Deploy to Netlify (static)
- **Backend**: Keep on Replit or move to Render/Railway
- **Database**: Neon, Supabase, or PlanetScale

### Step 2: Frontend-Only Netlify Setup
```bash
# Build client only
cd client
npm run build

# Deploy dist/ folder to Netlify
```

**Important**: For frontend-only deployment, create a simple `netlify.toml` in your client directory:
```toml
[build]
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

### Step 3: Configure API Base URL
Update frontend to point to external backend:
```javascript
// client/src/lib/queryClient.ts
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
  const fullUrl = API_BASE_URL + url;
  
  const res = await fetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

// Update the queryFn
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
    const fullUrl = API_BASE_URL + queryKey.join("/");
    
    const res = await fetch(fullUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };
```

Create a `.env` file in your client directory:
```env
VITE_API_BASE_URL=https://your-backend.replit.app
VITE_WS_URL=wss://your-backend.replit.app/ws
```

**Note**: The existing `netlify.toml` in the root directory is for full-stack deployment with Netlify Functions. For frontend-only deployment, use the simpler configuration above.

### Step 4: Add CORS Package and Update Settings
First, install the CORS package on your backend:
```bash
npm install cors
npm install --save-dev @types/cors
```

Then update your backend server (server/index.ts):
```javascript
import cors from 'cors';

app.use(cors({
  origin: ['https://your-frontend.netlify.app'],
  credentials: true
}));
```

### Step 5: Handle Real-time Features
Netlify static sites CAN connect to external WebSocket servers:

**Option A**: Connect to your backend WebSocket server
```javascript
// client/src/hooks/useWebSocket.tsx
// Update WebSocket URL to point to your backend
const wsUrl = import.meta.env.VITE_WS_URL || 'wss://your-backend.replit.app/ws';
const ws = new WebSocket(wsUrl);
```

**Option B**: Use polling for simpler setup
```javascript
// Remove WebSocket code, use polling instead
setInterval(() => fetchLatestData(), 30000);
```

**Option C**: Use external real-time service
- Ably, Pusher, or Supabase Realtime
- Replace WebSocket with their SDK

---

## Current Codebase Limitations

### ⚠️ **Important Notes**

1. **Database Required**: 
   - Uses PostgreSQL via Drizzle ORM (not in-memory)
   - DATABASE_URL environment variable required
   - Must run migrations after database setup

2. **WebSocket Dependency**:
   - Real-time features require WebSocket support
   - Works on Replit, not on Netlify Functions
   - Consider polling or external real-time service

3. **Build System**:
   - Uses Vite + Express architecture
   - Production mode serves static files from client/dist
   - Not optimized for serverless functions

---

## Migration Paths

### Path 1: Quick Deploy (Replit)
```bash
# 5 minutes
1. Add secrets in Replit
2. Click Publish → Autoscale
3. Done!
```

### Path 2: Performance Setup (Netlify + External Backend)
```bash
# 30 minutes
1. Deploy frontend to Netlify
2. Keep backend on Replit/Render
3. Update API URLs and CORS
4. Test cross-origin setup
```

### Path 3: Full Serverless (Advanced)
```bash
# 2+ hours - requires code changes
1. Convert to serverless functions
2. Replace WebSocket with external service
3. Add persistent database
4. Deploy to Netlify/Vercel
```

---

## Platform Comparison

| Feature | Replit | Netlify (Frontend) + Replit (API) |
|---------|--------|-----------------------------------|
| **Setup Time** | 5 minutes | 30 minutes |
| **WebSocket** | ✅ Native | ⚠️ Frontend connects to external WS |
| **Database** | Built-in PostgreSQL | External required |
| **Custom Domain** | ✅ | ✅ |
| **Cost (low traffic)** | $7-20/month | Free + $7/month backend |
| **Performance** | Good | Excellent frontend, Good API |
| **Maintenance** | Zero | Low |
| **Data Persistence** | ✅ PostgreSQL | ✅ With external DB |

---

## Post-Deployment Checklist

### ✅ **Essential Verification**
- [ ] Application loads without errors
- [ ] Elasticsearch connection working  
- [ ] Environment variables set correctly
- [ ] Dashboard showing data
- [ ] Real-time updates functioning (if supported)

### ✅ **Production Readiness**
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] Error monitoring setup
- [ ] Backup procedures planned
- [ ] Performance monitoring active

---

## Troubleshooting

### Common Issues

**App Won't Start on Replit**
- Check secrets are set correctly
- Verify run command in .replit file
- Review logs in Replit console

**Elasticsearch Connection Failed**
- Test connection: `curl -u user:pass http://your-server:9200/_cluster/health`
- Verify credentials in secrets
- Check network accessibility

**WebSocket Not Working**
- Replit: Should work automatically
- Netlify Frontend: Can connect to external WebSocket servers (update VITE_WS_URL)
- Netlify Functions: Cannot upgrade HTTP to WebSocket (use polling or external service)

**Database Connection Issues**
- Check DATABASE_URL environment variable is set correctly
- Verify PostgreSQL database is accessible
- Run `npm run db:push` to apply schema migrations

---

## Next Steps for Production

1. **Configure Elasticsearch**: Set up Elasticsearch cluster for log ingestion (optional)
2. **Implement Backups**: Regular PostgreSQL database exports
3. **Add Monitoring**: Error tracking and performance metrics
4. **Scale Planning**: Monitor usage and upgrade resources as needed

Your ElasticMonitor is ready for deployment! Start with Replit for simplicity. 🚀

---

## Database Migration

### Export Data from Current Setup
```bash
# Export from current PostgreSQL
pg_dump $DATABASE_URL > elasticmonitor_backup.sql

# Export Elasticsearch data
curl -X GET "your-es-cluster/_search" \
  -H "Authorization: ApiKey your-key" \
  -d '{"size": 10000, "query": {"match_all": {}}}' > elasticsearch_backup.json
```

### Import to New Database
```bash
# Import to new PostgreSQL
psql $NEW_DATABASE_URL < elasticmonitor_backup.sql

# Verify data
psql $NEW_DATABASE_URL -c "SELECT COUNT(*) FROM network_logs;"
```

### Support Resources

- **Replit**: Community forums, documentation
- **Netlify**: Support tickets, community Discord
- **Database Issues**: Provider-specific support

---

## Cost Estimates

### Replit (All-inclusive)
- **Starter**: $7/month (0.5 vCPU, always-on)
- **Growth**: $20/month (1 vCPU, scaling)
- **Pro**: $50+/month (high traffic)

### Netlify + External Database
- **Netlify**: Free (100GB) → $19/month (Pro)
- **Neon Database**: Free (0.5GB) → $19/month (3GB)
- **Total**: $0-38/month

**Recommendation**: Start with Replit for simplicity, migrate to Netlify for scale.

Your ElasticMonitor is ready for production deployment! 🚀