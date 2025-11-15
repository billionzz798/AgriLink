const { sequelize } = require('./server/config/database');
const Category = require('./server/models/Category');
require('dotenv').config();

function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function seedCategories() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    const categories = [
      { name: 'Grains', description: 'Rice, maize, millet, sorghum' },
      { name: 'Vegetables', description: 'Fresh vegetables and greens' },
      { name: 'Fruits', description: 'Fresh fruits and produce' },
      { name: 'Legumes', description: 'Beans, groundnuts, soybeans' },
      { name: 'Tubers', description: 'Yam, cassava, sweet potato' },
      { name: 'Spices', description: 'Pepper, ginger, garlic, onions' },
      { name: 'Livestock', description: 'Poultry, cattle, goats, sheep' },
      { name: 'Dairy', description: 'Milk, eggs, cheese' }
    ];

    for (const cat of categories) {
      const slug = generateSlug(cat.name);
      const [category, created] = await Category.findOrCreate({
        where: { name: cat.name },
        defaults: {
          ...cat,
          slug: slug
        }
      });
      if (created) {
        console.log(`Created category: ${cat.name} (slug: ${slug})`);
      } else {
        console.log(`Category already exists: ${cat.name}`);
      }
    }

    console.log('Categories seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding categories:', error);
    process.exit(1);
  }
}

seedCategories();
