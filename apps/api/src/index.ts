import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import * as trpcExpress from '@trpc/server/adapters/express'
import { createTRPCContext } from './trpc'
import { appRouter } from './routers'
import { testConnection } from './db/connection'
import { initializeS3 } from './services/r2-storage'
import { logger } from '../lib/logger';

const app = express()
const PORT = process.env.PORT || 3001

// Security middleware
app.use(helmet())

// Content-Type normalization middleware (before body parsing)
app.use((req: any, res: any, next: any) => {
  if (req.headers['content-type'] && req.headers['content-type'].includes('application/json, application/json')) {
    logger.log('🔧 Normalizing duplicate Content-Type header');
    req.headers['content-type'] = 'application/json';
  }
  next();
});

// Raw body logging middleware (before body parsing)
app.use((req: any, res: any, next: any) => {
  if (req.path.startsWith('/api/trpc') && req.method === 'POST') {
    logger.log('=== RAW REQUEST BEFORE PARSING ===');
    logger.log('Content-Type:', req.headers['content-type']);
    logger.log('Content-Length:', req.headers['content-length']);
    logger.log('Raw body available:', !!req.body);
    logger.log('Body before parsing:', req.body);
    logger.log('=== END RAW REQUEST BEFORE PARSING ===');
  }
  next();
});

// Debug middleware to log all requests
app.use((req: any, res: any, next: any) => {
  logger.log(`🌐 ${req.method} ${req.path} - Origin: ${req.headers.origin} - Auth: ${req.headers.authorization ? 'present' : 'missing'}`);
  
  // Log raw request details for tRPC requests
  if (req.path.startsWith('/api/trpc') && req.method === 'POST') {
    logger.log('=== RAW REQUEST DEBUG ===');
    logger.log('Content-Type:', req.headers['content-type']);
    logger.log('Raw body:', req.body);
    logger.log('Body type:', typeof req.body);
    logger.log('Body keys:', req.body ? Object.keys(req.body) : 'no body');
    logger.log('=== END RAW REQUEST DEBUG ===');
  }
  
  next();
});

// CORS configuration
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(origin => origin.trim())
  : [];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    const allowed = process.env.NODE_ENV === 'production'
      ? [
          ...allowedOrigins,
          'https://phonoglyph.rheome.tools',
          'https://www.phonoglyph.rheome.tools',
          'https://phonoglyph.vercel.app',
        ]
      : ['http://localhost:3000', 'http://127.0.0.1:3000'];

    // Check exact matches
    if (allowed.includes(origin)) {
      return callback(null, true);
    }

    // Check Vercel preview URLs pattern
    if (origin.match(/^https:\/\/phonoglyph-.*\.vercel\.app$/)) {
      return callback(null, true);
    }

    // Block but don't throw error - just reject with false
    console.error(`CORS blocked origin: ${origin}`);
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-guest-session', 'Accept'],
  exposedHeaders: ['Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400, // 24 hours
}

// Apply CORS middleware
app.use(cors(corsOptions))

// Handle preflight requests explicitly for all routes
app.options('*', cors(corsOptions))

// Body parsing middleware - EXTENDED for large file uploads
app.use(express.json({ limit: '600mb' }))
app.use(express.urlencoded({ extended: true, limit: '600mb' }))

// Debug middleware to log request bodies
app.use('/api/trpc', (req: any, res: any, next: any) => {
  logger.log('=== REQUEST BODY DEBUG ===');
  logger.log('Method:', req.method);
  logger.log('Path:', req.path);
  logger.log('Content-Type:', req.headers['content-type']);
  logger.log('Body:', JSON.stringify(req.body, null, 2));
  logger.log('=== END REQUEST BODY DEBUG ===');
  next();
});

// tRPC API routes with Supabase authentication context
app.use('/api/trpc', trpcExpress.createExpressMiddleware({
  router: appRouter,
  createContext: createTRPCContext,
  onError: ({ error, req }) => {
    logger.log('=== tRPC ERROR DEBUG ===');
    logger.log('Error code:', error.code);
    logger.log('Error message:', error.message);
    logger.log('Full error:', JSON.stringify(error, null, 2));
    logger.log('Request body:', (req as any).body);
    logger.log('Request headers:', (req as any).headers);
    logger.log('=== END tRPC ERROR DEBUG ===');
  },
}))

// Health check endpoint
app.get('/health', (req: any, res: any) => {
  logger.log('🏥 Health check requested');
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// Test endpoint for debugging
app.post('/test', (req: any, res: any) => {
  logger.log('🧪 Test endpoint hit');
  logger.log('Request body:', JSON.stringify(req.body, null, 2));
  res.status(200).json({ 
    message: 'Test endpoint working',
    receivedBody: req.body,
    timestamp: new Date().toISOString()
  })
})

// Basic route
app.get('/', (req: any, res: any) => {
  res.json({ message: 'Phonoglyph API Server is running! 🎵' })
})

// Initialize services (for serverless, this runs on cold start)
const initializeServices = async () => {
  try {
    await testConnection()
    await initializeS3()
  } catch (error) {
    console.error('Service initialization warning:', error)
  }
}

// For serverless deployment (Vercel), initialize on cold start
if (process.env.VERCEL) {
  initializeServices().catch(console.error)
}

// For local development - start the server
if (!process.env.VERCEL) {
  app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
    await initializeServices()
  })
}

// Export the app for both Vercel serverless and potential imports
export default app 