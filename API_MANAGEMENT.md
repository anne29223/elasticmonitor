# ElasticMonitor API Management Guide

## API Updates & Maintenance

### 1. API Versioning Strategy
```javascript
// Current API structure: /api/v1/
const API_VERSION = 'v1';
const BASE_PATH = `/api/${API_VERSION}`;

// Endpoints:
// GET /api/v1/dashboard/stats
// GET /api/v1/network-logs  
// GET /api/v1/alerts
// GET /api/v1/connections
// POST /api/v1/settings/elasticsearch
```

### 2. Environment Management
```env
# Development
NODE_ENV=development
API_BASE_URL=http://localhost:5000/api/v1

# Production  
NODE_ENV=production
API_BASE_URL=https://yourdomain.netlify.app/api/v1

# Staging
NODE_ENV=staging
API_BASE_URL=https://staging--yourdomain.netlify.app/api/v1
```

### 3. API Key Rotation
```bash
# Elasticsearch API Key Rotation
# 1. Generate new key in Elasticsearch dashboard
# 2. Update environment variable
# 3. Test connection
# 4. Revoke old key

# Update via Netlify CLI
netlify env:set ELASTICSEARCH_API_KEY "new_api_key_here"

# Or update in Netlify dashboard
# Site Settings → Environment Variables → Edit
```

### 4. Database Updates
```sql
-- Add new fields to network logs
ALTER TABLE network_logs ADD COLUMN user_agent TEXT;
ALTER TABLE network_logs ADD COLUMN geo_location JSONB;

-- Create indexes for performance
CREATE INDEX idx_network_logs_timestamp ON network_logs(timestamp);
CREATE INDEX idx_alerts_severity ON alerts(severity);
```

### 5. API Monitoring
```javascript
// Add API monitoring middleware
const apiMetrics = {
  totalRequests: 0,
  errors: 0,
  responseTime: [],
  endpoints: {}
};

app.use('/api', (req, res, next) => {
  const start = Date.now();
  apiMetrics.totalRequests++;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    apiMetrics.responseTime.push(duration);
    
    if (res.statusCode >= 400) {
      apiMetrics.errors++;
    }
  });
  
  next();
});
```

## API Security Updates

### 1. Rate Limiting
```javascript
// Add to server/routes.ts
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', apiLimiter);
```

### 2. CORS Configuration
```javascript
// Update CORS for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.netlify.app', 'https://yourdomain.com']
    : ['http://localhost:3000', 'http://localhost:5000'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

### 3. Input Validation
```javascript
// Add request validation middleware
const { body, validationResult } = require('express-validator');

// Elasticsearch settings validation
const validateElasticsearchSettings = [
  body('url').isURL().withMessage('Valid URL required'),
  body('apiKey').isLength({ min: 10 }).withMessage('API key too short'),
  body('indexPattern').matches(/^[a-zA-Z0-9\-\*\_]+$/).withMessage('Invalid index pattern')
];

app.post('/api/settings/elasticsearch', validateElasticsearchSettings, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // Process request...
});
```

## Deployment Pipeline

### 1. CI/CD with GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Netlify
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build application
        run: npm run build:netlify
        
      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        with:
          args: deploy --prod
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

### 2. Database Migrations
```javascript
// migrations/001_add_geo_location.js
exports.up = async function(knex) {
  await knex.schema.alterTable('network_logs', table => {
    table.jsonb('geo_location');
    table.string('user_agent');
    table.index(['timestamp']);
  });
};

exports.down = async function(knex) {
  await knex.schema.alterTable('network_logs', table => {
    table.dropColumn('geo_location');
    table.dropColumn('user_agent');
    table.dropIndex(['timestamp']);
  });
};
```

### 3. Health Checks
```javascript
// Add health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    const dbCheck = await storage.testConnection();
    
    // Check Elasticsearch connection  
    const esCheck = await elasticsearchService.testConnection();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbCheck ? 'up' : 'down',
        elasticsearch: esCheck.success ? 'up' : 'down'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

## Performance Optimization

### 1. Database Query Optimization
```sql
-- Optimize common queries
CREATE INDEX CONCURRENTLY idx_network_logs_source_ip ON network_logs(source_ip);
CREATE INDEX CONCURRENTLY idx_alerts_unresolved ON alerts(is_resolved) WHERE is_resolved = false;

-- Partitioning for large datasets
CREATE TABLE network_logs_2025_01 PARTITION OF network_logs
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### 2. Caching Strategy
```javascript
// Add Redis caching
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

// Cache dashboard stats for 5 minutes
app.get('/api/dashboard/stats', async (req, res) => {
  const cacheKey = 'dashboard:stats';
  const cached = await client.get(cacheKey);
  
  if (cached) {
    return res.json(JSON.parse(cached));
  }
  
  const stats = await getDashboardStats();
  await client.setex(cacheKey, 300, JSON.stringify(stats));
  res.json(stats);
});
```

### 3. API Response Compression
```javascript
// Enable gzip compression
const compression = require('compression');
app.use(compression());

// Optimize JSON responses
app.set('json spaces', 0); // Remove formatting in production
```

## Monitoring & Alerts

### 1. Error Tracking
```javascript
// Add error tracking with Sentry
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});

app.use(Sentry.Handlers.errorHandler());
```

### 2. Performance Monitoring
```javascript
// Custom metrics collection
const metrics = {
  apiCalls: new Map(),
  errors: new Map(),
  responseTime: []
};

// Log slow queries
const logSlowQuery = (query, duration) => {
  if (duration > 1000) { // Log queries > 1 second
    console.warn(`Slow query detected: ${query} (${duration}ms)`);
  }
};
```

### 3. Uptime Monitoring
```bash
# Use external monitoring services
# Pingdom, StatusCake, or UptimeRobot
# Monitor these endpoints:
# - https://yourdomain.netlify.app/api/health
# - https://yourdomain.netlify.app/
```

## Backup & Recovery

### 1. Database Backups
```bash
# Automated daily backups
pg_dump $DATABASE_URL > backups/elasticmonitor_$(date +%Y%m%d).sql

# Restore from backup
psql $DATABASE_URL < backups/elasticmonitor_20250103.sql
```

### 2. Configuration Backups
```bash
# Export environment variables
netlify env:list > config_backup.env

# Export Elasticsearch mapping
curl -X GET "https://your-cluster/_mapping" > elasticsearch_mapping.json
```

Your ElasticMonitor API is now production-ready with proper management procedures! 🚀