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
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Security middleware
app.use((0, helmet_1.default)());
// Content-Type normalization middleware (before body parsing)
app.use((req, res, next) => {
    if (req.headers['content-type'] && req.headers['content-type'].includes('application/json, application/json')) {
        console.log('🔧 Normalizing duplicate Content-Type header');
        req.headers['content-type'] = 'application/json';
    }
    next();
});
// Raw body logging middleware (before body parsing)
app.use((req, res, next) => {
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
app.use((req, res, next) => {
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
};
app.use((0, cors_1.default)(corsOptions));
// Handle preflight requests explicitly
app.options('*', (0, cors_1.default)(corsOptions));
// Body parsing middleware - EXTENDED for large file uploads
app.use(express_1.default.json({ limit: '600mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '600mb' }));
// Debug middleware to log request bodies
app.use('/api/trpc', (req, res, next) => {
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
    router: routers_1.appRouter,
    createContext: trpc_1.createTRPCContext,
    onError: ({ error, req }) => {
        console.log('=== tRPC ERROR DEBUG ===');
        console.log('Error code:', error.code);
        console.log('Error message:', error.message);
        console.log('Full error:', JSON.stringify(error, null, 2));
        console.log('Request body:', req.body);
        console.log('Request headers:', req.headers);
        console.log('=== END tRPC ERROR DEBUG ===');
    },
}));
// Health check endpoint
app.get('/health', (req, res) => {
    console.log('🏥 Health check requested');
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});
// Test endpoint for debugging
app.post('/test', (req, res) => {
    console.log('🧪 Test endpoint hit');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
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
// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    // Test database connection
    await (0, connection_1.testConnection)();
    // Initialize S3 service
    try {
        await (0, r2_storage_1.initializeS3)();
    }
    catch (error) {
        console.warn('⚠️  S3 initialization failed - file upload features will be disabled');
        console.warn('   Please check AWS credentials and configuration');
    }
});
exports.default = app;
//# sourceMappingURL=index.js.map