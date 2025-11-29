const { Sequelize } = require('sequelize');
require('dotenv').config();

// Railway provides DATABASE_URL automatically, but we support both formats
let sequelize;

if (process.env.DATABASE_URL) {
  // Railway/Heroku style - use DATABASE_URL if provided
  const dbUrl = process.env.DATABASE_URL;
  
  // Parse URL to log connection details (without password)
  try {
    const url = new URL(dbUrl);
    console.log(`Connecting to PostgreSQL at ${url.hostname}:${url.port || 5432}`);
  } catch (e) {
    console.log('Using DATABASE_URL for connection');
  }
  
  sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      // Railway requires SSL for database connections
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    // Add retry logic
    retry: {
      max: 3
    }
  });
} else {
  // Fallback to individual environment variables
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

const connectDB = async () => {
  try {
    console.log('Attempting to connect to PostgreSQL...');
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected successfully');
    
    // Sync models in production too (but don't force/drop tables)
    console.log('Synchronizing database models...');
    await sequelize.sync({ force: false, alter: false });
    console.log('✅ Database models synchronized');
  } catch (error) {
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
    
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };