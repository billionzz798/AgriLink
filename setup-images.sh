#!/bin/bash

echo "📁 Creating products directory..."
mkdir -p client/public/images/products

echo "📥 Downloading product images..."
node download-product-images.js

echo "🔄 Updating products with local image paths..."
node seed-products.js

echo "✅ Setup complete! Images are now hosted locally."
echo "📁 Images location: client/public/images/products/"
