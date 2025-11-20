"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables from the root .env file
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../.env') });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const trpcExpress = __importStar(require("@trpc/server/adapters/express"));
const trpc_1 = require("./trpc");
const routers_1 = require("./routers");
const connection_1 = require("./db/connection");
const r2_storage_1 = require("./services/r2-storage");
const logger_1 = require("./lib/logger");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Security middleware
app.use((0, helmet_1.default)());
// Content-Type normalization middleware (before body parsing)
app.use((req, res, next) => {
    if (req.headers['content-type'] && req.headers['content-type'].includes('application/json, application/json')) {
        logger_1.logger.log('🔧 Normalizing duplicate Content-Type header');
        req.headers['content-type'] = 'application/json';
    }
    next();
});
// Raw body logging middleware (before body parsing)
app.use((req, res, next) => {
    if (req.path.startsWith('/api/trpc') && req.method === 'POST') {
        logger_1.logger.log('=== RAW REQUEST BEFORE PARSING ===');
        logger_1.logger.log('Content-Type:', req.headers['content-type']);
        logger_1.logger.log('Content-Length:', req.headers['content-length']);
        logger_1.logger.log('Raw body available:', !!req.body);
        logger_1.logger.log('Body before parsing:', req.body);
        logger_1.logger.log('=== END RAW REQUEST BEFORE PARSING ===');
    }
    next();
});
// Debug middleware to log all requests
app.use((req, res, next) => {
    logger_1.logger.log(`🌐 ${req.method} ${req.path} - Origin: ${req.headers.origin} - Auth: ${req.headers.authorization ? 'present' : 'missing'}`);
    // Log raw request details for tRPC requests
    if (req.path.startsWith('/api/trpc') && req.method === 'POST') {
        logger_1.logger.log('=== RAW REQUEST DEBUG ===');
        logger_1.logger.log('Content-Type:', req.headers['content-type']);
        logger_1.logger.log('Raw body:', req.body);
        logger_1.logger.log('Body type:', typeof req.body);
        logger_1.logger.log('Body keys:', req.body ? Object.keys(req.body) : 'no body');
        logger_1.logger.log('=== END RAW REQUEST DEBUG ===');
    }
    next();
});
// CORS configuration
const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(origin => origin.trim())
    : [];
const corsOptions = {
    origin: (origin, callback) => {
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
};
// Apply CORS middleware
app.use((0, cors_1.default)(corsOptions));
// Handle preflight requests explicitly for all routes
app.options('*', (0, cors_1.default)(corsOptions));
// Body parsing middleware - EXTENDED for large file uploads
app.use(express_1.default.json({ limit: '600mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '600mb' }));
// Debug middleware to log request bodies
app.use('/api/trpc', (req, res, next) => {
    logger_1.logger.log('=== REQUEST BODY DEBUG ===');
    logger_1.logger.log('Method:', req.method);
    logger_1.logger.log('Path:', req.path);
    logger_1.logger.log('Content-Type:', req.headers['content-type']);
    logger_1.logger.log('Body:', JSON.stringify(req.body, null, 2));
    logger_1.logger.log('=== END REQUEST BODY DEBUG ===');
    next();
});
// tRPC API routes with Supabase authentication context
app.use('/api/trpc', trpcExpress.createExpressMiddleware({
    router: routers_1.appRouter,
    createContext: trpc_1.createTRPCContext,
    onError: ({ error, req }) => {
        logger_1.logger.log('=== tRPC ERROR DEBUG ===');
        logger_1.logger.log('Error code:', error.code);
        logger_1.logger.log('Error message:', error.message);
        logger_1.logger.log('Full error:', JSON.stringify(error, null, 2));
        logger_1.logger.log('Request body:', req.body);
        logger_1.logger.log('Request headers:', req.headers);
        logger_1.logger.log('=== END tRPC ERROR DEBUG ===');
    },
}));
// Health check endpoint
app.get('/health', (req, res) => {
    logger_1.logger.log('🏥 Health check requested');
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});
// Test endpoint for debugging
app.post('/test', (req, res) => {
    logger_1.logger.log('🧪 Test endpoint hit');
    logger_1.logger.log('Request body:', JSON.stringify(req.body, null, 2));
    res.status(200).json({
        message: 'Test endpoint working',
        receivedBody: req.body,
        timestamp: new Date().toISOString()
    });
});
// Basic route
app.get('/', (req, res) => {
    res.json({ message: 'Phonoglyph API Server is running! 🎵' });
});
// Initialize services (for serverless, this runs on cold start)
const initializeServices = async () => {
    try {
        await (0, connection_1.testConnection)();
        await (0, r2_storage_1.initializeS3)();
    }
    catch (error) {
        console.error('Service initialization warning:', error);
    }
};
// For serverless deployment (Vercel), initialize on cold start
if (process.env.VERCEL) {
    initializeServices().catch(console.error);
}
// For local development - start the server
if (!process.env.VERCEL) {
    app.listen(PORT, async () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        await initializeServices();
    });
}
// Export the app for both Vercel serverless and potential imports
exports.default = app;
//# sourceMappingURL=index.js.map