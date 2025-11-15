const { sequelize } = require('./server/config/database');
const User = require('./server/models/User');
require('dotenv').config();

async function createCustomer() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    // Create a consumer user
    const consumerEmail = 'customer@agrilink.gh';
    let existingConsumer = await User.findOne({ where: { email: consumerEmail } });

    if (existingConsumer) {
      console.log('Consumer user already exists!');
      console.log('Email:', consumerEmail);
      console.log('Password: customer123');
    } else {
      const consumer = await User.create({
        name: 'Test Customer',
        email: consumerEmail,
        password: 'customer123',
        role: 'consumer',
        phone: '+233123456789',
        isVerified: true,
        isActive: true,
        address: {
          street: '123 Main Street',
          city: 'Accra',
          region: 'Greater Accra',
          postalCode: 'GA-123-4567'
        }
      });
      console.log('Consumer user created successfully!');
      console.log('Email:', consumerEmail);
      console.log('Password: customer123');
    }

    // Create a farmer user
    const farmerEmail = 'farmer@agrilink.gh';
    let existingFarmer = await User.findOne({ where: { email: farmerEmail } });

    if (existingFarmer) {
      console.log('\nFarmer user already exists!');
      console.log('Email:', farmerEmail);
      console.log('Password: farmer123');
    } else {
      const farmer = await User.create({
        name: 'Test Farmer',
        email: farmerEmail,
        password: 'farmer123',
        role: 'farmer',
        phone: '+233987654321',
        isVerified: true,
        isActive: true,
        farmDetails: {
          farmName: 'Green Fields Farm',
          farmSize: 50,
          yearsOfExperience: 10
        },
        address: {
          street: '456 Farm Road',
          city: 'Kumasi',
          region: 'Ashanti',
          postalCode: 'AS-456-7890'
        }
      });
      console.log('\nFarmer user created successfully!');
      console.log('Email:', farmerEmail);
      console.log('Password: farmer123');
    }

    // Create an institutional buyer user
    const buyerEmail = 'buyer@agrilink.gh';
    let existingBuyer = await User.findOne({ where: { email: buyerEmail } });

    if (existingBuyer) {
      console.log('\nInstitutional buyer user already exists!');
      console.log('Email:', buyerEmail);
      console.log('Password: buyer123');
    } else {
      const buyer = await User.create({
        name: 'Test Buyer',
        email: buyerEmail,
        password: 'buyer123',
        role: 'institutional_buyer',
        phone: '+233555123456',
        isVerified: true,
        isActive: true,
        businessDetails: {
          businessName: 'City Supermarket',
          businessType: 'Supermarket',
          taxId: 'TAX-123456'
        },
        address: {
          street: '789 Market Street',
          city: 'Tamale',
          region: 'Northern',
          postalCode: 'NR-789-0123'
        }
      });
      console.log('\nInstitutional buyer user created successfully!');
      console.log('Email:', buyerEmail);
      console.log('Password: buyer123');
    }

    console.log('\n=== Login Credentials ===');
    console.log('\nAdmin:');
    console.log('  Email: admin@agrilink.gh');
    console.log('  Password: admin123');
    console.log('\nConsumer:');
    console.log('  Email: customer@agrilink.gh');
    console.log('  Password: customer123');
    console.log('\nFarmer:');
    console.log('  Email: farmer@agrilink.gh');
    console.log('  Password: farmer123');
    console.log('\nInstitutional Buyer:');
    console.log('  Email: buyer@agrilink.gh');
    console.log('  Password: buyer123');

    process.exit(0);
  } catch (error) {
    console.error('Error creating users:', error);
    process.exit(1);
  }
}

createCustomer();
