/**
 * Database Configuration
 * 
 * Configures Sequelize ORM connection to PostgreSQL database.
 * Supports both DATABASE_URL (for cloud deployments) and individual
 * environment variables (for local development).
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

/**
 * Sequelize instance - will be initialized based on available configuration
 */
let sequelize;

// ============================================================================
// Database Connection Configuration
// ============================================================================

if (process.env.DATABASE_URL) {
  /**
   * Cloud Deployment Configuration (Railway, Heroku, Fly.io, etc.)
   * Uses DATABASE_URL environment variable which contains full connection string
   */
  const dbUrl = process.env.DATABASE_URL;
  
  // Parse URL to log connection details (without password) for debugging
  try {
    const url = new URL(dbUrl);
    console.log(`Connecting to PostgreSQL at ${url.hostname}:${url.port || 5432}`);
  } catch (e) {
    console.log('Using DATABASE_URL for connection');
  }
  
  // Initialize Sequelize with DATABASE_URL
  sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    protocol: 'postgres',
    // Log SQL queries in development mode
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      // SSL required for cloud database connections
      ssl: {
        require: true,
        rejectUnauthorized: false // Required for some cloud providers
      }
    },
    // Connection pool configuration
    pool: {
      max: 5,        // Maximum number of connections in pool
      min: 0,        // Minimum number of connections in pool
      acquire: 30000, // Maximum time (ms) to wait for connection
      idle: 10000    // Maximum time (ms) connection can be idle
    },
    // Retry logic for failed connections
    retry: {
      max: 3 // Maximum number of retry attempts
    }
  });
} else {
  /**
   * Local Development Configuration
   * Uses individual environment variables for connection
   */
  sequelize = new Sequelize(
    process.env.DB_NAME || 'agrilink',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      dialectOptions: {
        // SSL only in production for local setups
        ssl: process.env.NODE_ENV === 'production' ? {
          require: true,
          rejectUnauthorized: false
        } : false
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
}

/**
 * Connect to Database
 * Authenticates connection and synchronizes database models
 * 
 * @throws {Error} If connection fails
 */
const connectDB = async () => {
  try {
    console.log('Attempting to connect to PostgreSQL...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected successfully');
    
    // Synchronize models with database schema
    // force: false - Don't drop existing tables
    // alter: false - Don't alter existing tables (prevents data loss)
    console.log('Synchronizing database models...');
    await sequelize.sync({ force: false, alter: false });
    console.log('✅ Database models synchronized');
  } catch (error) {
    // Log detailed error information for debugging
    console.error('❌ Unable to connect to PostgreSQL:', error.message);
    console.error('Error code:', error.code);
    console.error('Error details:', {
      name: error.name,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      address: error.address,
      port: error.port
    });
    
    // Log DATABASE_URL info (without password) for debugging
    if (process.env.DATABASE_URL) {
      try {
        const url = new URL(process.env.DATABASE_URL);
        console.error('Connection URL details:', {
          protocol: url.protocol,
          hostname: url.hostname,
          port: url.port,
          database: url.pathname.replace('/', ''),
          user: url.username
        });
      } catch (e) {
        console.error('Could not parse DATABASE_URL');
      }
    }
    
    // Exit process on connection failure
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
