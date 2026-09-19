/**
 * Raahi Unified Local Backend Server
 * 
 * Standalone Express server running the complete Cloud Functions API handler
 * on port 5001 with zero external cloud dependencies required.
 * 
 * Automatically initializes in-memory database with canonical demo data if
 * Firestore emulator or GCP credentials are not active.
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { api, healthCheck } from './index';
import { setDb } from './services/firebase';
import { MockFirestore } from './data/mockFirestore';
import { seedAllDemoData } from './data/seedData';

// Automatically load .env if present
const envFiles = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), '.env'),
];
for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    try {
      if (typeof (process as any).loadEnvFile === 'function') {
        (process as any).loadEnvFile(envFile);
        break;
      }
    } catch {
      // fallback manual parse
    }
    try {
      const raw = fs.readFileSync(envFile, 'utf8');
      raw.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...rest] = trimmed.split('=');
          const val = rest.join('=').trim();
          if (key && !(key.trim() in process.env)) {
            process.env[key.trim()] = val.replace(/^["'](.*)["']$/, '$1');
          }
        }
      });
      break;
    } catch {
      // ignore
    }
  }
}

const app = express();
const PORT = process.env.PORT || 5001;

// Determine if we should run in-memory mock or connect to Firestore
const isEmulatorActive = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const isGcpActive = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_CONFIG);
const isMockMode = !isEmulatorActive && !isGcpActive;

let isReady = false;

async function bootstrap() {
  if (isMockMode) {
    console.log('⚡ [Raahi Backend] Starting in Standalone Local Mode (In-Memory Database)...');
    const mockDb = new MockFirestore();
    setDb(mockDb as any);
    await seedAllDemoData();
    console.log('✅ [Raahi Backend] Seeded canonical dataset: 12 hospitals, emergency fleet, and demo cases.');
  } else {
    console.log(`⚡ [Raahi Backend] Connected to Firestore (${isEmulatorActive ? 'Emulator' : 'Cloud'})...`);
  }
  isReady = true;
}

// Global CORS & parsing
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/health' && req.path !== '/healthCheck') {
      console.log(`[API] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check endpoints
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    system: 'Raahi Coordination Engine',
    database: isMockMode ? 'in-memory-mock' : 'firestore',
    timestamp: new Date().toISOString(),
    ready: isReady,
  });
});

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    system: 'Raahi Coordination Engine',
    database: isMockMode ? 'in-memory-mock' : 'firestore',
    api_base: '/rahi-healthtech/us-central1/api',
    ready: isReady,
  });
});

app.get('/healthCheck', (req, res) => {
  healthCheck(req as any, res as any);
});

// Mount Cloud Functions API router across all standard endpoints
// 1. Firebase emulator format: /rahi-healthtech/us-central1/api and /rahi-healthtech/us-central1/api/*
app.all(['/rahi-healthtech/us-central1/api', '/rahi-healthtech/us-central1/api/*'], async (req, res) => {
  try {
    await api(req as any, res as any);
  } catch (err: any) {
    console.error('API Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
});

// 2. Direct API path format: /api and /api/*
app.all(['/api', '/api/*'], async (req, res) => {
  try {
    await api(req as any, res as any);
  } catch (err: any) {
    console.error('API Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
});

// 3. Root fallback for direct routes (e.g. /cases, /hospitals)
app.all('*', async (req, res, next) => {
  if (req.path === '/' || req.path === '/health' || req.path === '/healthCheck') {
    return next();
  }
  try {
    await api(req as any, res as any);
  } catch (err: any) {
    console.error('API Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
});

bootstrap().then(() => {
  app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`🚑 Raahi Backend API Server Running on Port ${PORT}`);
    console.log(`📡 URL: http://localhost:${PORT}/rahi-healthtech/us-central1/api`);
    console.log(`🩺 Healthcheck: http://localhost:${PORT}/healthCheck`);
    console.log('====================================================');
  });
}).catch((err) => {
  console.error('Failed to bootstrap Raahi Backend:', err);
  process.exit(1);
});

export default app;
