const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');

// Import your Express app
const app = express();

// CORS configuration for Netlify
app.use(cors({
  origin: true,
  credentials: true
}));

// Import your API routes
// Note: You'll need to adapt your existing server/routes.ts to work with this setup
const { router } = require('../../server/routes.js');
app.use('/api', router);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// Export the serverless function
module.exports.handler = serverless(app);