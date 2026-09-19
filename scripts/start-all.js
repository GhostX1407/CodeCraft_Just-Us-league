#!/usr/bin/env node

/**
 * Raahi Platform — Unified Local Startup Runner
 * 
 * Boots the Backend Cloud Functions API Engine (port 5001) and Frontend Vite Dev Server (port 5173)
 * concurrently in a single command with unified process lifecycle management.
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '..');
const envPath = path.resolve(ROOT_DIR, '.env');
if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(envPath);
  } catch {}
}

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

console.log('================================================================');
console.log('🚑  RAAHI — Unified Healthcare Capability Coordination Platform');
console.log('================================================================');
console.log('🚀 Initializing Backend API Engine (Port 5001)...');

// 1. First ensure backend is built
const buildProcess = spawn(npmCmd, ['run', 'build', '--workspace=functions'], {
  cwd: ROOT_DIR,
  stdio: 'inherit',
  shell: true,
});

buildProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Failed to compile backend TypeScript.');
    process.exit(code || 1);
  }

  // 2. Spawn backend server
  const backend = spawn('node', ['functions/lib/server.js'], {
    cwd: ROOT_DIR,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
  });

  backend.stdout.on('data', (data) => {
    process.stdout.write(`\x1b[36m[BACKEND]\x1b[0m ${data.toString()}`);
  });

  backend.stderr.on('data', (data) => {
    process.stderr.write(`\x1b[31m[BACKEND ERROR]\x1b[0m ${data.toString()}`);
  });

  // 3. Wait for backend to be healthy before launching frontend
  let attempts = 0;
  const maxAttempts = 30;

  function checkBackendHealth() {
    attempts++;
    const req = http.get('http://localhost:5001/health', (res) => {
      if (res.statusCode === 200) {
        console.log('\n✅ Backend is healthy & canonical dataset is seeded.');
        startFrontend();
      } else if (attempts < maxAttempts) {
        setTimeout(checkBackendHealth, 500);
      } else {
        console.warn('⚠️ Backend health check timed out, launching frontend anyway...');
        startFrontend();
      }
    });

    req.on('error', () => {
      if (attempts < maxAttempts) {
        setTimeout(checkBackendHealth, 500);
      } else {
        console.warn('⚠️ Could not connect to backend health check, launching frontend anyway...');
        startFrontend();
      }
    });
  }

  setTimeout(checkBackendHealth, 800);

  let frontend = null;
  function startFrontend() {
    console.log('⚡ Launching Frontend Vite Server (Port 5173)...');
    frontend = spawn(npmCmd, ['run', 'dev', '--workspace=frontend'], {
      cwd: ROOT_DIR,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    frontend.stdout.on('data', (data) => {
      process.stdout.write(`\x1b[32m[FRONTEND]\x1b[0m ${data.toString()}`);
    });

    frontend.stderr.on('data', (data) => {
      process.stderr.write(`\x1b[33m[FRONTEND]\x1b[0m ${data.toString()}`);
    });

    frontend.on('close', (code) => {
      console.log(`Frontend exited with code ${code}`);
      cleanup();
    });
  }

  function cleanup() {
    console.log('\n🛑 Shutting down Raahi platform...');
    try {
      if (backend && !backend.killed) {
        backend.kill('SIGTERM');
      }
      if (frontend && !frontend.killed) {
        frontend.kill('SIGTERM');
      }
    } catch {
      // ignore
    }
    process.exit(0);
  }

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
});
