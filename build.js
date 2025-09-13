#!/usr/bin/env node
/**
 * Build script for ElasticMonitor deployment
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';

console.log('🚀 Building ElasticMonitor for deployment...');

try {
  // Ensure dist directory exists
  if (!existsSync('dist')) {
    mkdirSync('dist', { recursive: true });
  }

  // Build client (frontend)
  console.log('📦 Building client...');
  execSync('vite build', { stdio: 'inherit' });

  // Build server (backend)
  console.log('🔧 Building server...');
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit' });

  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}