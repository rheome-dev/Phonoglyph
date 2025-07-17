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

// Debug middleware to log all requests
app.use((req: any, res: any, next: any) => {
  // console.log(`🌐 ${req.method} ${req.path} - Origin: ${req.headers.origin} - Auth: ${req.headers.authorization ? 'present' : 'missing'}`);
  next();
});

// CORS configuration
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(origin => origin.trim())
  : [];

const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? allowedOrigins
    : ['http://localhost:3000', 'http://127.0.0.1:3000'], // Allow specific origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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

// tRPC API routes with Supabase authentication context
app.use('/api/trpc', trpcExpress.createExpressMiddleware({
  router: appRouter,
  createContext: createTRPCContext,
}))

// Health check endpoint
app.get('/health', (req: any, res: any) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
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