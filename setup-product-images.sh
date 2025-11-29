#!/bin/bash

echo "🎨 Setting up product images..."

# Create directory
mkdir -p client/public/images/products

# Generate SVG images
echo "📝 Generating SVG placeholder images..."
node generate-product-images.js

# Update database
echo "🔄 Updating database with image paths..."
node seed-products.js

echo "✅ Done! Images are now generated locally."
echo "📁 Images location: client/public/images/products/"
echo ""
echo "🔄 Next: Restart your server and refresh the browser!"
