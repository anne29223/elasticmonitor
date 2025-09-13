# ElasticMonitor Netlify Deployment Guide

## Prerequisites
- Netlify account
- PostgreSQL database (Neon, Supabase, PlanetScale)
- Elasticsearch cluster with API access
- GitHub repository (recommended)

## Step 1: Repository Setup

1. **Push code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial ElasticMonitor setup"
   git remote add origin https://github.com/yourusername/elasticmonitor.git
   git push -u origin main
   ```

## Step 2: Netlify Configuration

### Create `netlify.toml`:
```toml
[build]
  command = "npm run build:netlify"
  functions = "netlify/functions"
  publish = "client/dist"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200

[build.environment]
  NODE_ENV = "production"
  NODE_VERSION = "18"

[context.production]
  command = "npm run build:netlify"
  
[context.branch-deploy]
  command = "npm run build:netlify"
```

### Create Netlify Functions Structure:
```bash
mkdir -p netlify/functions
```

## Step 3: Serverless Function Setup

### Create `netlify/functions/api.js`:
```javascript
const { createServer } = require('http');
const { parse } = require('url');
const express = require('express');
const app = require('../../server/index.js');

// Netlify serverless function handler
exports.handler = async (event, context) => {
  const { path, httpMethod, headers, body, queryStringParameters } = event;
  
  return new Promise((resolve, reject) => {
    const req = {
      method: httpMethod,
      url: path + (queryStringParameters ? '?' + new URLSearchParams(queryStringParameters).toString() : ''),
      headers,
      body: body ? JSON.parse(body) : undefined
    };
    
    const res = {
      statusCode: 200,
      headers: {},
      body: '',
      setHeader: (name, value) => { res.headers[name] = value; },
      writeHead: (statusCode, headers) => { 
        res.statusCode = statusCode; 
        Object.assign(res.headers, headers);
      },
      end: (data) => {
        res.body = data || '';
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: res.body
        });
      }
    };
    
    app(req, res);
  });
};
```

## Step 4: Build Configuration

### Update `package.json` scripts:
```json
{
  "scripts": {
    "build:netlify": "npm run build:client && npm run build:server:netlify",
    "build:client": "cd client && npm run build",
    "build:server:netlify": "echo 'Server built for Netlify functions'",
    "dev": "NODE_ENV=development tsx server/index.ts",
    "start": "NODE_ENV=production node server/index.js"
  }
}
```

## Step 5: Environment Variables

### In Netlify Dashboard → Site Settings → Environment Variables:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database
PGDATABASE=your_database_name
PGHOST=your_database_host
PGPASSWORD=your_database_password
PGPORT=5432
PGUSER=your_database_user

# Elasticsearch Configuration
ELASTICSEARCH_URL=https://your-cluster.es.region.cloud
ELASTICSEARCH_API_KEY=your_api_key_here

# Security
SESSION_SECRET=your_very_long_random_secret_string
NODE_ENV=production

# Netlify Specific
NETLIFY_FUNCTIONS_PORT=8888
```

## Step 6: Deploy to Netlify

### Option 1: GitHub Integration (Recommended)
1. Connect Netlify to your GitHub repository
2. Set build command: `npm run build:netlify`
3. Set publish directory: `client/dist`
4. Deploy automatically on git push

### Option 2: Manual Deploy
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

## Step 7: Database Migration

1. **Run database migrations**:
   ```bash
   # Connect to your production database
   DATABASE_URL="your_production_db_url" npm run db:push
   ```

2. **Verify database connection** in Netlify Functions logs

## Step 8: Custom Domain (Optional)

1. **Add custom domain** in Netlify dashboard
2. **Configure DNS** with your domain provider
3. **Enable HTTPS** (automatic with Netlify)
4. **Update CORS settings** in Elasticsearch if needed

## Step 9: Performance Optimization

### Enable Netlify Features:
- **Asset Optimization**: Automatic image/CSS/JS compression
- **CDN**: Global content delivery network
- **Branch Deploys**: Preview deployments for testing
- **Form Handling**: For contact forms (if needed)

### Caching Strategy:
```toml
# Add to netlify.toml
[[headers]]
  for = "/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/api/*"
  [headers.values]
    Cache-Control = "no-cache, no-store, must-revalidate"
```

## Troubleshooting

### Common Issues:

1. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies in package.json
   - Review build logs in Netlify dashboard

2. **Function Timeouts**
   - Netlify functions have 10-second timeout
   - Optimize database queries
   - Consider using background tasks for long operations

3. **Environment Variables**
   - Ensure all required variables are set
   - Check variable names match exactly
   - Redeploy after adding new variables

4. **Database Connection Issues**
   - Verify DATABASE_URL format
   - Check database allows connections from Netlify IPs
   - Ensure SSL is properly configured

## Migration Checklist

- [ ] Repository pushed to GitHub
- [ ] netlify.toml configured
- [ ] Environment variables set in Netlify
- [ ] Database migrated and accessible
- [ ] Elasticsearch connection tested
- [ ] Custom domain configured (if applicable)
- [ ] SSL/HTTPS enabled
- [ ] Performance optimizations applied
- [ ] Monitoring and alerts configured

## Cost Optimization

- **Netlify Free Tier**: 100GB bandwidth, 300 build minutes
- **Pro Plan**: $19/month for more bandwidth and features
- **Function Execution**: Free tier includes 125K requests/month
- **Database**: Use efficient connection pooling
- **Elasticsearch**: Monitor usage and optimize queries

Your ElasticMonitor is now ready for production on Netlify! 🚀