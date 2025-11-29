const { sequelize } = require('./server/config/database');
require('dotenv').config();

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');
    
    // Check if column exists
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='orders' AND column_name='payment';
    `);
    
    if (results.length === 0) {
      // Add payment column
      await sequelize.query(`
        ALTER TABLE orders 
        ADD COLUMN payment JSONB 
        DEFAULT '{"method": null, "status": "pending", "reference": null, "amount": null, "paidAt": null, "currency": "GHS"}'::jsonb;
      `);
      console.log('✅ Payment column added successfully');
    } else {
      console.log('✅ Payment column already exists');
    }
    
    // Verify the column was added
    const [verify] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name='orders' AND column_name='payment';
    `);
    
    if (verify.length > 0) {
      console.log('✅ Verification: Payment column is present');
      console.log('   Type:', verify[0].data_type);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

migrate();
