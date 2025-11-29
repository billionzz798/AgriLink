const { sequelize } = require('./server/config/database');
const User = require('./server/models/User');
const Category = require('./server/models/Category');
const Product = require('./server/models/Product');
require('dotenv').config();

async function seedProducts() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    // Get or create farmer
    let farmer = await User.findOne({ where: { email: 'farmer@agrilink.gh' } });
    
    if (!farmer) {
      console.log('Creating farmer user...');
      farmer = await User.create({
        name: 'Test Farmer',
        email: 'farmer@agrilink.gh',
        password: 'farmer123',
        role: 'farmer',
        phone: '+233987654321',
        isVerified: true,
        isActive: true,
        farmDetails: {
          farmName: 'Green Fields Farm',
          farmSize: 50,
          yearsOfExperience: 10
        }
      });
      console.log('Farmer created:', farmer.email);
    }

    // Get categories
    const categories = await Category.findAll({ where: { isActive: true } });
    
    if (categories.length === 0) {
      console.log('No categories found. Please run seed-categories.js first.');
      process.exit(1);
    }

    // Find category IDs
    const getCategoryId = (name) => {
      const cat = categories.find(c => c.name.toLowerCase() === name.toLowerCase());
      return cat ? cat.id : categories[0].id;
    };

    // Product images - using local JPG images
    const productImages = {
      'Fresh Tomatoes': '/images/products/tomatoes.jpg',
      'Premium Jasmine Rice': '/images/products/jasmine-rice.jpg',
      'Fresh Onions': '/images/products/onions.jpg',
      'Sweet Potatoes': '/images/products/sweet-potatoes.jpg',
      'Fresh Plantains': '/images/products/plantains.jpg',
      'Red Beans': '/images/products/red-beans.jpg',
      'Fresh Pepper': '/images/products/pepper.jpg',
      'Fresh Eggs': '/images/products/eggs.jpg',
      'Fresh Maize': '/images/products/maize.jpg', // Note: This file might be missing
      'Fresh Cabbage': '/images/products/cabbage.jpg'
    };

    // Helper function to get image URL with fallback
    const getImageUrl = (productName) => {
      if (productImages[productName]) {
        return productImages[productName];
      }
      // Fallback to placeholder
      const encodedName = encodeURIComponent(productName.replace(/\s+/g, '+'));
      return `https://placehold.co/400x400/28a745/ffffff?text=${encodedName}`;
    };

    const sampleProducts = [
      {
        name: 'Fresh Tomatoes',
        description: 'Fresh, organic tomatoes harvested daily from our farm. Perfect for cooking, salads, and sauces. Grown without pesticides.',
        categoryId: getCategoryId('Vegetables'),
        farmerId: farmer.id,
        images: [
          { url: getImageUrl('Fresh Tomatoes'), alt: 'Fresh Tomatoes' }
        ],
        pricing: {
          b2b: { price: 15.00, minQuantity: 50, unit: 'kg' },
          b2c: { price: 20.00, unit: 'kg' }
        },
        inventory: {
          totalQuantity: 500,
          availableQuantity: 500,
          reservedQuantity: 0
        },
        marketplace: 'both',
        status: 'active',
        tags: ['organic', 'fresh', 'tomatoes']
      },
      {
        name: 'Premium Jasmine Rice',
        description: 'High-quality jasmine rice, locally grown and processed. Long grain, aromatic, perfect for daily meals.',
        categoryId: getCategoryId('Grains'),
        farmerId: farmer.id,
        images: [
          { url: getImageUrl('Premium Jasmine Rice'), alt: 'Jasmine Rice' }
        ],
        pricing: {
          b2b: { price: 8.50, minQuantity: 100, unit: 'kg' },
          b2c: { price: 12.00, unit: 'kg' }
        },
        inventory: {
          totalQuantity: 1000,
          availableQuantity: 1000,
          reservedQuantity: 0
        },
        marketplace: 'both',
        status: 'active',
        tags: ['rice', 'jasmine', 'premium']
      },
      {
        name: 'Fresh Onions',
        description: 'Large, fresh onions perfect for cooking. Sweet and flavorful, harvested at peak ripeness.',
        categoryId: getCategoryId('Vegetables'),
        farmerId: farmer.id,
        images: [
          { url: getImageUrl('Fresh Onions'), alt: 'Fresh Onions' }
        ],
        pricing: {
          b2b: { price: 10.00, minQuantity: 30, unit: 'kg' },
          b2c: { price: 15.00, unit: 'kg' }
        },
        inventory: {
          totalQuantity: 300,
          availableQuantity: 300,
          reservedQuantity: 0
        },
        marketplace: 'both',
        status: 'active',
        tags: ['onions', 'fresh', 'cooking']
      },
      {
        name: 'Sweet Potatoes',
        description: 'Organic sweet potatoes, rich in vitamins and minerals. Great for boiling, roasting, or making chips.',
        categoryId: getCategoryId('Tubers'),
        farmerId: farmer.id,
        images: [
          { url: getImageUrl('Sweet Potatoes'), alt: 'Sweet Potatoes' }
        ],
        pricing: {
          b2b: { price: 6.00, minQuantity: 40, unit: 'kg' },
          b2c: { price: 9.00, unit: 'kg' }
        },
        inventory: {
          totalQuantity: 400,
          availableQuantity: 400,
          reservedQuantity: 0
        },
        marketplace: 'both',
        status: 'active',
        tags: ['sweet-potatoes', 'organic', 'tubers']
      },
      {
        name: 'Fresh Plantains',
        description: 'Ripe plantains perfect for frying, boiling, or making plantain chips. Locally sourced and fresh.',
        categoryId: getCategoryId('Fruits'),
        farmerId: farmer.id,
        images: [
          { url: getImageUrl('Fresh Plantains'), alt: 'Fresh Plantains' }
        ],
        pricing: {
          b2b: { price: 7.50, minQuantity: 25, unit: 'kg' },
          b2c: { price: 11.00, unit: 'kg' }
        },
        inventory: {
          totalQuantity: 250,
          availableQuantity: 250,
          reservedQuantity: 0
        },
        marketplace: 'both',
        status: 'active',
        tags: ['plantains', 'fresh', 'ripe']
      },
      {
        name: 'Red Beans',
        description: 'Premium red beans, high in protein and fiber. Perfect for stews, soups, and traditional dishes.',
        categoryId: getCategoryId('Legumes'),
        farmerId: farmer.id,
        images: [
          { url: getImageUrl('Red Beans'), alt: 'Red Beans' }
        ],
        pricing: {
          b2b: { price: 12.00, minQuantity: 50, unit: 'kg' },
          b2c: { price: 18.00, unit: 'kg' }
        },
        inventory: {
          totalQuantity: 600,
          availableQuantity: 600,
          reservedQuantity: 0
        },
        marketplace: 'both',
        status: 'active',
        tags: ['beans', 'red-beans', 'protein']
      },
      {
        name: 'Fresh Pepper',
        description: 'Hot chili peppers, locally grown. Perfect for adding spice to your dishes. Available in various heat levels.',
        categoryId: getCategoryId('Spices'),
        farmerId: farmer.id,
        images: [
          { url: getImageUrl('Fresh Pepper'), alt: 'Fresh Pepper' }
        ],
        pricing: {
          b2b: { price: 25.00, minQuantity: 10, unit: 'kg' },
          b2c: { price: 35.00, unit: 'kg' }
        },
        inventory: {
          totalQuantity: 150,
          availableQuantity: 150,
          reservedQuantity: 0
        },
        marketplace: 'both',
        status: 'active',
        tags: ['pepper', 'chili', 'spicy']
      },
      {
        name: 'Fresh Eggs',
        description: 'Farm-fresh eggs from free-range chickens. Rich in protein and nutrients. Packed in crates.',
        categoryId: getCategoryId('Dairy'),
        farmerId: farmer.id,
        images: [
          { url: getImageUrl('Fresh Eggs'), alt: 'Fresh Eggs' }
        ],
        pricing: {
          b2b: { price: 2.50, minQuantity: 100, unit: 'piece' },
          b2c: { price: 3.50, unit: 'piece' }
        },
        inventory: {
          totalQuantity: 500,
          availableQuantity: 500,
          reservedQuantity: 0
        },
        marketplace: 'both',
        status: 'active',
        tags: ['eggs', 'dairy', 'protein']
      },
      {
        name: 'Fresh Maize',
        description: 'Sweet corn, harvested fresh. Perfect for boiling, roasting, or making cornmeal. Locally grown.',
        categoryId: getCategoryId('Grains'),
        farmerId: farmer.id,
        images: [
          { url: getImageUrl('Fresh Maize'), alt: 'Fresh Maize' }
        ],
        pricing: {
          b2b: { price: 5.00, minQuantity: 50, unit: 'kg' },
          b2c: { price: 8.00, unit: 'kg' }
        },
        inventory: {
          totalQuantity: 350,
          availableQuantity: 350,
          reservedQuantity: 0
        },
        marketplace: 'both',
        status: 'active',
        tags: ['maize', 'corn', 'fresh']
      },
      {
        name: 'Fresh Cabbage',
        description: 'Crisp, fresh cabbage perfect for salads, stews, and traditional dishes. Grown organically.',
        categoryId: getCategoryId('Vegetables'),
        farmerId: farmer.id,
        images: [
          { url: getImageUrl('Fresh Cabbage'), alt: 'Fresh Cabbage' }
        ],
        pricing: {
          b2b: { price: 4.50, minQuantity: 20, unit: 'kg' },
          b2c: { price: 7.00, unit: 'kg' }
        },
        inventory: {
          totalQuantity: 200,
          availableQuantity: 200,
          reservedQuantity: 0
        },
        marketplace: 'both',
        status: 'active',
        tags: ['cabbage', 'vegetables', 'fresh']
      }
    ];

    console.log('\n=== Updating Products with Local Images ===\n');

    for (const productData of sampleProducts) {
      const [product, created] = await Product.findOrCreate({
        where: { 
          name: productData.name,
          farmerId: farmer.id
        },
        defaults: productData
      });

      if (created) {
        console.log(`✅ Created: ${product.name} - Image: ${productData.images[0].url}`);
      } else {
        // Always update images for existing products
        await product.update({ images: productData.images });
        console.log(`🔄 Updated: ${product.name} - Image: ${productData.images[0].url}`);
      }
    }

    console.log('\n✅ All products updated with local images!');
    console.log('\n📦 Products:');
    sampleProducts.forEach(p => {
      console.log(`   - ${p.name}: ${p.images[0].url}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error seeding products:', error);
    process.exit(1);
  }
}

seedProducts();
