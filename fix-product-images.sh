#!/bin/bash

echo "🔧 Fixing product images..."

# Create directory
mkdir -p client/public/images/products

# Delete existing wrong images
echo "🗑️  Removing old images..."
rm -f client/public/images/products/*.jpg

# Download correct images
echo "📥 Downloading correct images..."
node download-product-images.js

# Update database
echo "🔄 Updating database with correct image paths..."
node seed-products.js

echo "✅ Done! Refresh your browser to see the correct images."
