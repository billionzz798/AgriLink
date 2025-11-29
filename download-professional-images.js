const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Professional product images - using verified working URLs
// Using Pexels which provides free, high-quality stock photos
const productImages = {
  'tomatoes': {
    name: 'Fresh Tomatoes',
    // Professional tomatoes image from Pexels
    url: 'https://images.pexels.com/photos/257840/pexels-photo-257840.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop',
    filename: 'tomatoes.jpg'
  },
  'jasmine-rice': {
    name: 'Premium Jasmine Rice',
    // Professional rice image
    url: 'https://images.pexels.com/photos/4110256/pexels-photo-4110256.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop',
    filename: 'jasmine-rice.jpg'
  },
  'onions': {
    name: 'Fresh Onions',
    // Professional onions image
    url: 'https://images.pexels.com/photos/1300977/pexels-photo-1300977.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop',
    filename: 'onions.jpg'
  },
  'sweet-potatoes': {
    name: 'Sweet Potatoes',
    // Professional sweet potatoes image
    url: 'https://images.pexels.com/photos/1300978/pexels-photo-1300978.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop',
    filename: 'sweet-potatoes.jpg'
  },
  'plantains': {
    name: 'Fresh Plantains',
    // Professional plantains image
    url: 'https://images.pexels.com/photos/1300982/pexels-photo-1300982.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop',
    filename: 'plantains.jpg'
  },
  'red-beans': {
    name: 'Red Beans',
    // Professional beans image
    url: 'https://images.pexels.com/photos/1300980/pexels-photo-1300980.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop',
    filename: 'red-beans.jpg'
  },
  'pepper': {
    name: 'Fresh Pepper',
    // Professional chili peppers image
    url: 'https://images.pexels.com/photos/143133/pexels-photo-143133.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop',
    filename: 'pepper.jpg'
  },
  'eggs': {
    name: 'Fresh Eggs',
    // Professional eggs image
    url: 'https://images.pexels.com/photos/162712/egg-white-food-protein-162712.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop',
    filename: 'eggs.jpg'
  },
  'maize': {
    name: 'Fresh Maize',
    // Professional corn/maize image
    url: 'https://images.pexels.com/photos/1300976/pexels-photo-1300976.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop',
    filename: 'maize.jpg'
  },
  'cabbage': {
    name: 'Fresh Cabbage',
    // Professional cabbage image
    url: 'https://images.pexels.com/photos/1300983/pexels-photo-1300983.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop',
    filename: 'cabbage.jpg'
  }
};

// Function to download an image with retry logic
function downloadImage(url, filepath, retries = 3) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filepath);
    
    const attemptDownload = () => {
      protocol.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      }, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302 || 
            response.statusCode === 307 || response.statusCode === 308) {
          file.close();
          if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
          
          if (retries > 0) {
            return downloadImage(response.headers.location, filepath, retries - 1)
              .then(resolve)
              .catch(reject);
          } else {
            reject(new Error('Too many redirects'));
          }
          return;
        }
        
        if (response.statusCode !== 200) {
          file.close();
          if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        file.close();
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        
        if (retries > 0) {
          setTimeout(() => {
            attemptDownload();
          }, 1000);
        } else {
          reject(err);
        }
      });
    };
    
    attemptDownload();
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
  
  console.log('\n📥 Downloading professional product images...\n');
  
  let successCount = 0;
  let failCount = 0;
  const failedImages = [];
  
  for (const [key, image] of Object.entries(productImages)) {
    const filepath = path.join(imagesDir, image.filename);
    
    // Remove old file to ensure fresh download
    if (fs.existsSync(filepath)) {
      console.log(`🔄 Re-downloading: ${image.filename}...`);
      fs.unlinkSync(filepath);
    } else {
      console.log(`⬇️  Downloading: ${image.name} (${image.filename})...`);
    }
    
    try {
      await downloadImage(image.url, filepath);
      console.log(`✅ Downloaded: ${image.filename}`);
      successCount++;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (error) {
      console.error(`❌ Failed: ${image.filename} - ${error.message}`);
      failCount++;
      failedImages.push({ name: image.name, filename: image.filename, url: image.url });
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`\n📁 Images saved to: ${imagesDir}\n`);
  
  if (failCount > 0) {
    console.log('⚠️  Some images failed to download automatically.');
    console.log('\n📋 Manual Download Instructions:\n');
    console.log('1. Open each URL in your browser');
    console.log('2. Right-click the image and "Save Image As..."');
    console.log('3. Save to: client/public/images/products/');
    console.log('4. Use the exact filename shown below\n');
    
    failedImages.forEach(img => {
      console.log(`   ${img.filename}:`);
      console.log(`   URL: ${img.url}`);
      console.log(`   Save as: ${img.filename}\n`);
    });
  }
}

// Run
downloadAllImages().catch(console.error);
