const jwt = require('jsonwebtoken');
const RefreshToken = require('../models/RefreshToken');
const config = require('../config/config');

/**
 * Générer un token d'accès JWT
 */
const generateAccessToken = (admin) => {
  const payload = {
    id: admin._id,
    email: admin.email,
    role: admin.role,
    type: 'access'
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn || '1d',
    issuer: 'wedding-donation-api',
    audience: 'wedding-donation-admin'
  });
};

/**
 * Générer un refresh token
 */
const generateRefreshToken = async (admin, options = {}) => {
  const refreshToken = await RefreshToken.createToken(admin._id, {
    expiresIn: 7 * 24 * 60 * 60 * 1000, // 7 jours
    userAgent: options.userAgent || '',
    ipAddress: options.ipAddress || ''
  });

  return refreshToken.token;
};

/**
 * Vérifier un token d'accès
 */
const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: 'wedding-donation-api',
      audience: 'wedding-donation-admin'
    });

    if (decoded.type !== 'access') {
      throw new Error('Type de token invalide');
    }

    return decoded;
  } catch (error) {
    throw new Error('Token d\'accès invalide: ' + error.message);
  }
};

/**
 * Vérifier un refresh token
 */
const verifyRefreshToken = async (token) => {
  try {
    const refreshToken = await RefreshToken.validateToken(token);
    return refreshToken;
  } catch (error) {
    throw new Error('Refresh token invalide: ' + error.message);
  }
};

/**
 * Renouveler les tokens (access + refresh)
 */
const renewTokens = async (refreshToken, options = {}) => {
  try {
    // Valider le refresh token
    const tokenDoc = await verifyRefreshToken(refreshToken);
    const admin = tokenDoc.admin;

    // Vérifier que l'admin est actif
    if (!admin.isActive) {
      throw new Error('Compte administrateur désactivé');
    }

    // Générer de nouveaux tokens
    const newAccessToken = generateAccessToken(admin);
    const newRefreshToken = await generateRefreshToken(admin, options);

    // Révoquer l'ancien refresh token
    await tokenDoc.revoke();

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    };
  } catch (error) {
    throw new Error('Échec du renouvellement des tokens: ' + error.message);
  }
};

/**
 * Révoquer un refresh token
 */
const revokeRefreshToken = async (token) => {
  try {
    const tokenDoc = await RefreshToken.findOne({ token });
    if (tokenDoc) {
      await tokenDoc.revoke();
    }
    return true;
  } catch (error) {
    console.error('Erreur lors de la révocation du token:', error);
    return false;
  }
};

/**
 * Révoquer tous les refresh tokens d'un admin
 */
const revokeAllRefreshTokens = async (adminId) => {
  try {
    await RefreshToken.revokeAllForAdmin(adminId);
    return true;
  } catch (error) {
    console.error('Erreur lors de la révocation de tous les tokens:', error);
    return false;
  }
};

/**
 * Nettoyer les tokens expirés
 */
const cleanupExpiredTokens = async () => {
  try {
    const deletedCount = await RefreshToken.cleanupExpired();
    console.log(`${deletedCount} tokens expirés nettoyés`);
    return deletedCount;
  } catch (error) {
    console.error('Erreur lors du nettoyage des tokens:', error);
    return 0;
  }
};

/**
 * Obtenir les informations sur les tokens actifs d'un admin
 */
const getActiveTokensInfo = async (adminId) => {
  try {
    const tokens = await RefreshToken.getActiveTokensForAdmin(adminId);
    return tokens.map(token => ({
      id: token._id,
      createdAt: token.createdAt,
      lastUsed: token.lastUsed,
      expiresAt: token.expiresAt,
      userAgent: token.userAgent,
      ipAddress: token.ipAddress,
      timeRemaining: token.getTimeRemaining()
    }));
  } catch (error) {
    console.error('Erreur lors de la récupération des tokens actifs:', error);
    return [];
  }
};

/**
 * Extraire le token du header Authorization
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

/**
 * Créer une paire de tokens pour un admin
 */
const createTokenPair = async (admin, options = {}) => {
  const accessToken = generateAccessToken(admin);
  const refreshToken = await generateRefreshToken(admin, options);

  return {
    accessToken,
    refreshToken,
    expiresIn: config.jwt.expiresIn || '15m',
    tokenType: 'Bearer'
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  renewTokens,
  revokeRefreshToken,
  revokeAllRefreshTokens,
  cleanupExpiredTokens,
  getActiveTokensInfo,
  extractTokenFromHeader,
  createTokenPair
};