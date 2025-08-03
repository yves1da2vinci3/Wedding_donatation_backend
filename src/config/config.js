require('dotenv').config();

module.exports = {
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/wedding_donation',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-fallback-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    issuer: 'wedding-donation-api',
    audience: 'wedding-donation-admin'
  },
  refreshToken: {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
    maxTokensPerAdmin: parseInt(process.env.MAX_TOKENS_PER_ADMIN) || 10,
    cleanupInterval: parseInt(process.env.TOKEN_CLEANUP_INTERVAL) || 24 * 60 * 60 * 1000 // 24 heures
  },
  security: {
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
    lockoutTime: parseInt(process.env.LOCKOUT_TIME) || 15 * 60 * 1000, // 15 minutes
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8,
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
  },
  server: {
    port: process.env.PORT || 3001,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  api: {
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX) || 100 // limite de requêtes par fenêtre
    },
    requestSizeLimit: process.env.REQUEST_SIZE_LIMIT || '10mb'
  }
};