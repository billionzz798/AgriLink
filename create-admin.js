const { sequelize } = require('./server/config/database');
const User = require('./server/models/User');
require('dotenv').config();

async function createAdmin() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    const adminEmail = 'admin@agrilink.gh';
    const existingAdmin = await User.findOne({ where: { email: adminEmail } });

    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Email:', adminEmail);
      process.exit(0);
    }

    const admin = await User.create({
      name: 'Admin User',
      email: adminEmail,
      password: 'admin123',
      role: 'admin',
      phone: '+233000000000',
      isVerified: true,
      isActive: true
    });

    console.log('Admin user created successfully!');
    console.log('Email:', adminEmail);
    console.log('Password: admin123');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();
