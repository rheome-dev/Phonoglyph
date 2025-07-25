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

const app = express()
const PORT = process.env.PORT || 3001

// Security middleware
app.use(helmet())

// Content-Type normalization middleware (before body parsing)
app.use((req: any, res: any, next: any) => {
  if (req.headers['content-type'] && req.headers['content-type'].includes('application/json, application/json')) {
    console.log('🔧 Normalizing duplicate Content-Type header');
    req.headers['content-type'] = 'application/json';
  }
  next();
});

// Raw body logging middleware (before body parsing)
app.use((req: any, res: any, next: any) => {
  if (req.path.startsWith('/api/trpc') && req.method === 'POST') {
    console.log('=== RAW REQUEST BEFORE PARSING ===');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Content-Length:', req.headers['content-length']);
    console.log('Raw body available:', !!req.body);
    console.log('Body before parsing:', req.body);
    console.log('=== END RAW REQUEST BEFORE PARSING ===');
  }
  next();
});

// Debug middleware to log all requests
app.use((req: any, res: any, next: any) => {
  console.log(`🌐 ${req.method} ${req.path} - Origin: ${req.headers.origin} - Auth: ${req.headers.authorization ? 'present' : 'missing'}`);
  
  // Log raw request details for tRPC requests
  if (req.path.startsWith('/api/trpc') && req.method === 'POST') {
    console.log('=== RAW REQUEST DEBUG ===');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Raw body:', req.body);
    console.log('Body type:', typeof req.body);
    console.log('Body keys:', req.body ? Object.keys(req.body) : 'no body');
    console.log('=== END RAW REQUEST DEBUG ===');
  }
  
  next();
});

// CORS configuration
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(origin => origin.trim())
  : [];

const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [
        ...allowedOrigins,
        // Add specific Vercel frontend URLs as fallbacks
        'https://phonoglyph.rheome.tools',
        'https://phonoglyph.vercel.app'
      ]
    : ['http://localhost:3000', 'http://127.0.0.1:3000'], // Allow specific origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-guest-session'],
  exposedHeaders: ['Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}

app.use(cors(corsOptions))

// Handle preflight requests explicitly
app.options('*', cors(corsOptions))

// Body parsing middleware - EXTENDED for large file uploads
app.use(express.json({ limit: '600mb' }))
app.use(express.urlencoded({ extended: true, limit: '600mb' }))

// Debug middleware to log request bodies
app.use('/api/trpc', (req: any, res: any, next: any) => {
  console.log('=== REQUEST BODY DEBUG ===');
  console.log('Method:', req.method);
  console.log('Path:', req.path);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('=== END REQUEST BODY DEBUG ===');
  next();
});

// tRPC API routes with Supabase authentication context
app.use('/api/trpc', trpcExpress.createExpressMiddleware({
  router: appRouter,
  createContext: createTRPCContext,
  onError: ({ error, req }) => {
    console.log('=== tRPC ERROR DEBUG ===');
    console.log('Error code:', error.code);
    console.log('Error message:', error.message);
    console.log('Full error:', JSON.stringify(error, null, 2));
    console.log('Request body:', (req as any).body);
    console.log('Request headers:', (req as any).headers);
    console.log('=== END tRPC ERROR DEBUG ===');
  },
}))

// Health check endpoint
app.get('/health', (req: any, res: any) => {
  console.log('🏥 Health check requested');
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// Test endpoint for debugging
app.post('/test', (req: any, res: any) => {
  console.log('🧪 Test endpoint hit');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
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

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
  
  // Test database connection
  await testConnection()
  
  // Initialize S3 service
  try {
    await initializeS3()
  } catch (error) {
    console.warn('⚠️  S3 initialization failed - file upload features will be disabled')
    console.warn('   Please check AWS credentials and configuration')
  }
})

export default app 