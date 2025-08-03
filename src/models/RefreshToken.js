const mongoose = require('mongoose');
const crypto = require('crypto');

const refreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  isRevoked: {
    type: Boolean,
    default: false
  },
  userAgent: {
    type: String,
    default: ''
  },
  ipAddress: {
    type: String,
    default: ''
  },
  lastUsed: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index composé pour optimiser les requêtes fréquentes
refreshTokenSchema.index({ admin: 1, isRevoked: 1 });

// Index TTL pour supprimer automatiquement les tokens expirés
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Méthode statique pour générer un nouveau token
refreshTokenSchema.statics.generateToken = function() {
  return crypto.randomBytes(64).toString('hex');
};

// Méthode pour créer un nouveau refresh token
refreshTokenSchema.statics.createToken = async function(adminId, options = {}) {
  const {
    expiresIn = 7 * 24 * 60 * 60 * 1000, // 7 jours par défaut
    userAgent = '',
    ipAddress = ''
  } = options;

  const token = this.generateToken();
  const expiresAt = new Date(Date.now() + expiresIn);

  const refreshToken = new this({
    token,
    admin: adminId,
    expiresAt,
    userAgent,
    ipAddress
  });

  await refreshToken.save();
  return refreshToken;
};

// Méthode pour valider un token
refreshTokenSchema.statics.validateToken = async function(token) {
  const refreshToken = await this.findOne({
    token,
    isRevoked: false,
    expiresAt: { $gt: new Date() }
  }).populate('admin');

  if (!refreshToken) {
    throw new Error('Token invalide ou expiré');
  }

  // Mettre à jour la date de dernière utilisation
  refreshToken.lastUsed = new Date();
  await refreshToken.save();

  return refreshToken;
};

// Méthode pour révoquer un token
refreshTokenSchema.methods.revoke = async function() {
  this.isRevoked = true;
  await this.save();
};

// Méthode pour révoquer tous les tokens d'un admin
refreshTokenSchema.statics.revokeAllForAdmin = async function(adminId) {
  await this.updateMany(
    { admin: adminId, isRevoked: false },
    { $set: { isRevoked: true } }
  );
};

// Méthode pour nettoyer les tokens expirés (optionnel, MongoDB le fait automatiquement)
refreshTokenSchema.statics.cleanupExpired = async function() {
  const result = await this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isRevoked: true }
    ]
  });
  
  return result.deletedCount;
};

// Méthode pour obtenir les tokens actifs d'un admin (pour monitoring)
refreshTokenSchema.statics.getActiveTokensForAdmin = async function(adminId) {
  return this.find({
    admin: adminId,
    isRevoked: false,
    expiresAt: { $gt: new Date() }
  }).sort({ lastUsed: -1 });
};

// Hook pré-suppression pour nettoyer les tokens associés
refreshTokenSchema.pre('deleteMany', function() {
  console.log('Nettoyage des refresh tokens...');
});

// Méthode pour formater le token pour la réponse
refreshTokenSchema.methods.toJSON = function() {
  const tokenObject = this.toObject();
  
  // Ne pas exposer le token complet dans les réponses de debug
  if (process.env.NODE_ENV === 'production') {
    delete tokenObject.token;
  }
  
  return tokenObject;
};

// Validation personnalisée pour la durée d'expiration
refreshTokenSchema.pre('save', function(next) {
  // Vérifier que le token n'expire pas dans le passé
  if (this.expiresAt <= new Date()) {
    return next(new Error('La date d\'expiration doit être dans le futur'));
  }
  
  // Limiter la durée maximum à 30 jours
  const maxExpiration = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  if (this.expiresAt > maxExpiration) {
    this.expiresAt = maxExpiration;
  }
  
  next();
});

// Méthode utilitaire pour calculer le temps restant
refreshTokenSchema.methods.getTimeRemaining = function() {
  const now = new Date();
  const remaining = this.expiresAt - now;
  
  if (remaining <= 0) {
    return { expired: true, remaining: 0 };
  }
  
  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  
  return {
    expired: false,
    remaining,
    days,
    hours,
    minutes,
    formatted: `${days}j ${hours}h ${minutes}m`
  };
};

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken;