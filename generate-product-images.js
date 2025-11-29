const fs = require('fs');
const path = require('path');

// Product image configurations with specific colors for each product
const productImages = {
  'tomatoes': {
    name: 'Fresh Tomatoes',
    color: '#FF4444', // Red
    icon: '🍅',
    filename: 'tomatoes.jpg'
  },
  'jasmine-rice': {
    name: 'Premium Jasmine Rice',
    color: '#FFF8DC', // Cream/beige
    icon: '🌾',
    filename: 'jasmine-rice.jpg'
  },
  'onions': {
    name: 'Fresh Onions',
    color: '#FFFFFF', // White
    icon: '🧅',
    filename: 'onions.jpg'
  },
  'sweet-potatoes': {
    name: 'Sweet Potatoes',
    color: '#FF8C00', // Orange
    icon: '🍠',
    filename: 'sweet-potatoes.jpg'
  },
  'plantains': {
    name: 'Fresh Plantains',
    color: '#FFD700', // Yellow/gold
    icon: '🍌',
    filename: 'plantains.jpg'
  },
  'red-beans': {
    name: 'Red Beans',
    color: '#DC143C', // Crimson red
    icon: '🫘',
    filename: 'red-beans.jpg'
  },
  'pepper': {
    name: 'Fresh Pepper',
    color: '#FF4500', // Orange red
    icon: '🌶️',
    filename: 'pepper.jpg'
  },
  'eggs': {
    name: 'Fresh Eggs',
    color: '#F5DEB3', // Wheat/beige
    icon: '🥚',
    filename: 'eggs.jpg'
  },
  'maize': {
    name: 'Fresh Maize',
    color: '#FFD700', // Yellow
    icon: '🌽',
    filename: 'maize.jpg'
  },
  'cabbage': {
    name: 'Fresh Cabbage',
    color: '#90EE90', // Light green
    icon: '🥬',
    filename: 'cabbage.jpg'
  }
};

// Function to create SVG image
function createSVGImage(product) {
  const textColor = '#FFFFFF';
  const bgColor = product.color;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="400" fill="${bgColor}"/>
  <text x="200" y="180" font-family="Arial, sans-serif" font-size="80" text-anchor="middle" fill="${textColor}">${product.icon}</text>
  <text x="200" y="250" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="${textColor}">${product.name}</text>
</svg>`;
}

// Main function
function generateAllImages() {
  const imagesDir = path.join(__dirname, 'client/public/images/products');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
    console.log('Created directory:', imagesDir);
  }
  
  console.log('\n🎨 Generating product images...\n');
  
  let successCount = 0;
  
  for (const [key, product] of Object.entries(productImages)) {
    // Save as SVG (more reliable)
    const svgFilepath = path.join(imagesDir, product.filename.replace('.jpg', '.svg'));
    const svgContent = createSVGImage(product);
    
    try {
      fs.writeFileSync(svgFilepath, svgContent, 'utf8');
      console.log(`✅ Created: ${product.filename.replace('.jpg', '.svg')} (${product.name})`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to create ${product.filename}:`, error.message);
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   ✅ Created: ${successCount} images`);
  console.log(`\n📁 Images saved to: ${imagesDir}\n`);
  console.log('Note: Images are saved as SVG files. Update seed script to use .svg extension.\n');
}

// Run
generateAllImages();
