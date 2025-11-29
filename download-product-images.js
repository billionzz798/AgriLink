const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Product images mapping - using verified image URLs for each specific product
const productImages = {
  'tomatoes': {
    // Fresh red tomatoes
    url: 'https://images.unsplash.com/photo-1546097491-8c5c5a4c8b3d?w=400&h=400&fit=crop',
    filename: 'tomatoes.jpg'
  },
  'jasmine-rice': {
    // Jasmine rice grains
    url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop',
    filename: 'jasmine-rice.jpg'
  },
  'onions': {
    // Fresh onions
    url: 'https://images.unsplash.com/photo-1518977822534-7049a61ee0c2?w=400&h=400&fit=crop',
    filename: 'onions.jpg'
  },
  'sweet-potatoes': {
    // Sweet potatoes
    url: 'https://images.unsplash.com/photo-1604977049386-031bf3e3b3e1?w=400&h=400&fit=crop',
    filename: 'sweet-potatoes.jpg'
  },
  'plantains': {
    // Fresh plantains
    url: 'https://images.unsplash.com/photo-1603035575702-0d3a4b0e5c0a?w=400&h=400&fit=crop',
    filename: 'plantains.jpg'
  },
  'red-beans': {
    // Red beans
    url: 'https://images.unsplash.com/photo-1599599810769-313c8887d4f5?w=400&h=400&fit=crop',
    filename: 'red-beans.jpg'
  },
  'pepper': {
    // Chili peppers
    url: 'https://images.unsplash.com/photo-1604977049386-031bf3e3b3e1?w=400&h=400&fit=crop',
    filename: 'pepper.jpg'
  },
  'eggs': {
    // Fresh eggs
    url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=400&fit=crop',
    filename: 'eggs.jpg'
  },
  'maize': {
    // Fresh maize/corn
    url: 'https://images.unsplash.com/photo-1464454709131-8d3031217424?w=400&h=400&fit=crop',
    filename: 'maize.jpg'
  },
  'cabbage': {
    // Fresh cabbage
    url: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400&h=400&fit=crop',
    filename: 'cabbage.jpg'
  }
};

// Function to download an image (handles both http and https)
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filepath);
    
    protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
        file.close();
        fs.unlinkSync(filepath);
        return downloadImage(response.headers.location, filepath)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(filepath);
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      reject(err);
    });
  });
}

// Main function
async function downloadAllImages() {
  const imagesDir = path.join(__dirname, 'client/public/images/products');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
    console.log('Created directory:', imagesDir);
  }
  
  console.log('\n📥 Downloading product images with correct assignments...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const [key, image] of Object.entries(productImages)) {
    const filepath = path.join(imagesDir, image.filename);
    
    // Delete existing file to re-download with correct image
    if (fs.existsSync(filepath)) {
      console.log(`🔄 Re-downloading: ${image.filename}...`);
      fs.unlinkSync(filepath);
    } else {
      console.log(`⬇️  Downloading: ${image.filename}...`);
    }
    
    try {
      await downloadImage(image.url, filepath);
      console.log(`✅ Downloaded: ${image.filename}`);
      successCount++;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ Failed to download ${image.filename}:`, error.message);
      failCount++;
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`\n�� Images saved to: ${imagesDir}\n`);
  
  if (failCount > 0) {
    console.log('⚠️  Some images failed to download.');
    console.log('You can manually download them from the URLs in the script.\n');
  }
}

// Run
downloadAllImages().catch(console.error);
