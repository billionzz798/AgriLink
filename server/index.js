const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { connectDB } = require('./config/database');

const app = express();

// Only use Helmet in production, disable in development
if (process.env.NODE_ENV === 'production') {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
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

app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve static files from client/public (CSS, JS, images)
app.use('/styles', express.static(path.join(__dirname, '../client/public/styles')));
app.use('/js', express.static(path.join(__dirname, '../client/public/js')));
app.use('/images', express.static(path.join(__dirname, '../client/public/images')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/brands', require('./routes/brands'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reviews', require('./routes/reviews'));

// Health check (without database dependency)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'AgriLink Ghana API is running' });
});

// Serve frontend pages - using absolute paths
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Connect to database with retry logic and start server
const startServer = async () => {
  const maxRetries = 5;
  const retryDelay = 5000; // 5 seconds
  
  // Try to connect to database
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
        // This allows health checks to work
      }
    }
  }
  
  // Start server after database connection attempt
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ AgriLink Ghana server running on port ${PORT}`);
    console.log(`🌐 Visit http://localhost:${PORT} to view the application`);
  });
};

// Start the server
startServer();