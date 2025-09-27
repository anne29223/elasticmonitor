#!/usr/bin/env node
/**
 * Build script dispatcher for ElasticMonitor deployment
 * Usage: node build.js --target=vercel|netlify|client|server|netlify-functions|default
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';

// Parse command line arguments
const args = process.argv.slice(2);
const targetArg = args.find(arg => arg.startsWith('--target='));
const target = targetArg ? targetArg.split('=')[1] : 'default';

console.log(`🏗️  Building ElasticMonitor for: ${target}`);

function runCommand(command, description) {
  console.log(`📦 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    process.exit(1);
  }
}

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
}

// Build targets
switch (target) {
  case 'vercel':
    console.log('🚀 Building for Vercel deployment...');
    ensureDir('dist');
    runCommand('vite build', 'Building client for Vercel');
    runCommand('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', 'Building server for Vercel');
    break;

  case 'netlify':
    console.log('🌐 Building for Netlify deployment...');
    runCommand('vite build', 'Building client for Netlify');
    
    // Ensure netlify/functions directory exists
    ensureDir('netlify/functions');
    
    // Build Netlify functions
    runCommand('esbuild netlify/functions/api.ts --platform=node --bundle --outfile=netlify/functions/api.js --format=esm --external:express --external:@neondatabase/serverless --external:drizzle-orm --external:cors --external:serverless-http', 'Building Netlify functions');
    break;

  case 'client':
    console.log('🎨 Building client only...');
    runCommand('vite build', 'Building React client');
    break;

  case 'server':
    console.log('⚙️  Building server only...');
    ensureDir('dist');
    runCommand('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', 'Building Express server');
    break;

  case 'netlify-functions':
    console.log('🔧 Building Netlify functions only...');
    ensureDir('netlify/functions');
    runCommand('esbuild netlify/functions/api.ts --platform=node --bundle --outfile=netlify/functions/api.js --format=esm --external:express --external:@neondatabase/serverless --external:drizzle-orm --external:cors --external:serverless-http', 'Building Netlify functions');
    break;

  case 'default':
  default:
    console.log('🛠️  Building for development/production...');
    ensureDir('dist');
    runCommand('vite build', 'Building React client');
    runCommand('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', 'Building Express server');
    break;
}

console.log(`🎉 Build completed successfully for: ${target}`);