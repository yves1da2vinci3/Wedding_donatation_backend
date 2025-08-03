require('dotenv').config();

module.exports = {
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wedding_donation',
    options: {
      // Options de connexion MongoDB
    }
  },
  server: {
    port: process.env.PORT || 3001,
    env: process.env.NODE_ENV || 'development'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'wedding_donation_super_secret_jwt_key_2024',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@wedding.com',
    password: process.env.ADMIN_PASSWORD || 'admin123456'
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
  }
};