/**
 * AgriLink Ghana - Main Server File
 * 
 * This is the entry point for the AgriLink Ghana e-commerce platform.
 * It sets up the Express server, middleware, routes, and database connection.
 * 
 * Features:
 * - Dual-layer B2B/B2C marketplace
 * - JWT-based authentication
 * - Paystack payment integration
 * - Role-based access control (admin, farmer, consumer, institutional_buyer)
 * - PostgreSQL database with Sequelize ORM
 */

// ============================================================================
// Dependencies & Imports
// ============================================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { connectDB } = require('./config/database');

// ============================================================================
// Express App Initialization
// ============================================================================

const app = express();

// ============================================================================
// Security Middleware
// ============================================================================

/**
 * Helmet.js - Security headers
 * Only enabled in production to avoid blocking Paystack resources in development
 */
if (process.env.NODE_ENV === 'production') {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Allow Paystack scripts and styles for payment processing
        styleSrc: ["'self'", "'unsafe-inline'", "https://paystack.com", "https://*.paystack.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://js.paystack.co", "https://*.paystack.com"],
        imgSrc: ["'self'", "data:", "https:"],
        frameSrc: ["'self'", "https://checkout.paystack.com", "https://*.paystack.com"],
        connectSrc: ["'self'", "https://api.paystack.co", "https://*.paystack.com"],
        fontSrc: ["'self'", "https:", "data:"]
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
}

// ============================================================================
// General Middleware
// ============================================================================

// CORS - Allow cross-origin requests
app.use(cors());

// Morgan - HTTP request logger (development mode)
app.use(morgan('dev'));

// Body parser middleware - Parse JSON and URL-encoded request bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================================
// Static File Serving
// ============================================================================

// Serve uploaded files (product images, etc.)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve static files from client/public (CSS, JS, images)
app.use('/styles', express.static(path.join(__dirname, '../client/public/styles')));
app.use('/js', express.static(path.join(__dirname, '../client/public/js')));
app.use('/images', express.static(path.join(__dirname, '../client/public/images')));

// ============================================================================
// Rate Limiting Configuration
// ============================================================================

/**
 * Authentication Rate Limiter
 * More lenient limits for login/register to prevent blocking legitimate users
 * - 50 attempts per 15 minutes per IP
 * - Only failed attempts count (skipSuccessfulRequests: true)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Allow 50 login attempts per 15 minutes per IP
  message: {
    error: 'Too many login attempts from this IP, please try again after 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skipSuccessfulRequests: true, // Don't count successful requests against the limit
});

/**
 * General API Rate Limiter
 * Applied to all other API endpoints
 * - 200 requests per 15 minutes per IP
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Allow 200 requests per 15 minutes
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting selectively
// Auth endpoints use the more lenient limiter
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
// All other API routes use the general limiter
app.use('/api/', generalLimiter);

// ============================================================================
// API Routes
// ============================================================================

app.use('/api/auth', require('./routes/auth'));      // Authentication (login, register, profile)
app.use('/api/users', require('./routes/users'));    // User management
app.use('/api/products', require('./routes/products')); // Product CRUD operations
app.use('/api/orders', require('./routes/orders'));  // Order management
app.use('/api/categories', require('./routes/categories')); // Category management
app.use('/api/brands', require('./routes/brands'));  // Brand management
app.use('/api/payments', require('./routes/payments')); // Paystack payment processing
app.use('/api/reviews', require('./routes/reviews')); // Product reviews and ratings

// ============================================================================
// Health Check Endpoint
// ============================================================================

/**
 * Health check endpoint
 * Used by deployment platforms to verify server is running
 * Not rate-limited and doesn't require database connection
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'AgriLink Ghana API is running',
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// Frontend Routes
// ============================================================================

/**
 * Serve frontend HTML pages
 * All routes serve their respective HTML files from the client/public directory
 */
const publicPath = path.resolve(__dirname, '../client/public');

app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(publicPath, 'register.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(publicPath, 'login.html'));
});

app.get('/customer', (req, res) => {
  res.sendFile(path.join(publicPath, 'customer.html'));
});

app.get('/farmer', (req, res) => {
  res.sendFile(path.join(publicPath, 'farmer.html'));
});

app.get('/buyer', (req, res) => {
  res.sendFile(path.join(publicPath, 'buyer.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(publicPath, 'admin.html'));
});

// ============================================================================
// Error Handling Middleware
// ============================================================================

/**
 * Global error handler
 * Catches all errors and returns appropriate responses
 */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    // Only show full error details in development
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// ============================================================================
// Database Connection & Server Startup
// ============================================================================

/**
 * Start server with database connection retry logic
 * Attempts to connect to database multiple times before giving up
 * Server will start even if database connection fails (for health checks)
 */
const startServer = async () => {
  const maxRetries = 5;
  const retryDelay = 5000; // 5 seconds
  
  // Try to connect to database with retry logic
  for (let i = 0; i < maxRetries; i++) {
    try {
      await connectDB();
      console.log('✅ Database connected successfully');
      break; // Success, exit retry loop
    } catch (error) {
      console.error(`❌ Database connection attempt ${i + 1}/${maxRetries} failed:`, error.message);
      
      if (i < maxRetries - 1) {
        console.log(`⏳ Retrying in ${retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error('❌ Failed to connect to database after all retries.');
        console.error('⚠️  Starting server anyway - some features may not work without database');
        // Don't exit - let the server start even without database
        // This allows health checks to work and easier debugging
      }
    }
  }
  
  // Start HTTP server after database connection attempt
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ AgriLink Ghana server running on port ${PORT}`);
    console.log(`🌐 Visit http://localhost:${PORT} to view the application`);
  });
};

// ============================================================================
// Initialize Server
// ============================================================================

startServer();
