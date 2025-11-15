# AgriLink Ghana - Agricultural E-Commerce Platform

A dual-layer B2B/B2C agricultural e-commerce platform connecting smallholder farmers with institutional buyers and urban consumers in Ghana.

## Features

- **Dual Marketplace**: Separate B2B and B2C pricing and ordering
- **User Roles**: Farmers, Institutional Buyers, Consumers, Admin
- **Product Management**: Full CRUD operations with inventory tracking
- **Order Management**: Complete order lifecycle management
- **Reviews & Ratings**: Product reviews and ratings system
- **Authentication**: JWT-based secure authentication
- **Search**: Full-text search for products
- **Categories**: Hierarchical category system

## Tech Stack

- Node.js & Express
- PostgreSQL & Sequelize
- JWT Authentication
- Express Validator
- Multer (for file uploads)

## Installation

1. Install dependencies:
npm install2. Set up PostgreSQL database:
createdb agrilink3. Update `.env` file with your database credentials

4. Start the server:
npm run dev## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Products
- `GET /api/products` - Get all products (with filters)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (farmer only)
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - Get user orders
- `GET /api/orders/:id` - Get single order
- `PUT /api/orders/:id/status` - Update order status

## License

ISC
