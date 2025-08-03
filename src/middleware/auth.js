const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { verifyAccessToken, extractTokenFromHeader } = require('../utils/tokenUtils');
const config = require('../config/config');

// Middleware pour vérifier l'authentification
const authenticate = async (req, res, next) => {
  try {
    // Récupérer le token du header Authorization
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Accès refusé. Token requis.',
        code: 'NO_TOKEN'
      });
    }

    // Extraire le token
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      return res.status(401).json({
        message: 'Format de token invalide',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }

    // Vérifier le token d'accès
    const decoded = verifyAccessToken(token);
    
    // Vérifier si l'admin existe et est actif
    const admin = await Admin.findById(decoded.id).select('-password');
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        message: 'Token invalide ou compte désactivé',
        code: 'INVALID_ADMIN'
      });
    }

    // Ajouter les informations de l'admin à la requête
    req.admin = admin;

    next();
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    
    // Gestion spécifique des erreurs de token
    if (error.message.includes('Token d\'accès invalide')) {
      return res.status(401).json({
        message: 'Token d\'accès invalide',
        code: 'INVALID_ACCESS_TOKEN'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: 'Token invalide',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Token expiré',
        code: 'TOKEN_EXPIRED'
      });
    }

    res.status(500).json({
      message: 'Erreur d\'authentification.',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
};

// Middleware pour vérifier les permissions super admin
const requireSuperAdmin = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({
      message: 'Authentification requise',
      code: 'AUTHENTICATION_REQUIRED'
    });
  }

  if (req.admin.role !== 'super_admin') {
    return res.status(403).json({
      message: 'Accès refusé. Permissions super administrateur requises.',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  }
  next();
};

// Middleware optionnel d'authentification (ne bloque pas si pas de token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Pas de token, continuer sans authentification
      req.admin = null;
      return next();
    }

    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      req.admin = null;
      return next();
    }

    try {
      const decoded = verifyAccessToken(token);
      const admin = await Admin.findById(decoded.id).select('-password');
      
      if (admin && admin.isActive) {
        req.admin = admin;
      } else {
        req.admin = null;
      }
    } catch (tokenError) {
      // Token invalide ou expiré, continuer sans authentification
      req.admin = null;
    }

    next();
  } catch (error) {
    console.error('Erreur authentification optionnelle:', error);
    req.admin = null;
    next();
  }
};

// Middleware pour vérifier les rôles spécifiques
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        message: 'Authentification requise',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({
        message: 'Accès interdit - Rôle insuffisant',
        code: 'INSUFFICIENT_ROLE',
        required: allowedRoles,
        current: req.admin.role
      });
    }

    next();
  };
};

// Middleware pour vérifier si l'admin peut accéder à la ressource
const requireOwnershipOrSuperAdmin = (getResourceOwnerId) => {
  return async (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        message: 'Authentification requise',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    // Super admin a accès à tout
    if (req.admin.role === 'super_admin') {
      return next();
    }

    try {
      const resourceOwnerId = typeof getResourceOwnerId === 'function' 
        ? await getResourceOwnerId(req) 
        : req.admin.id;

      // Vérifier si l'admin est le propriétaire de la ressource
      if (req.admin.id.toString() !== resourceOwnerId.toString()) {
        return res.status(403).json({
          message: 'Accès interdit - Vous ne pouvez accéder qu\'à vos propres ressources',
          code: 'OWNERSHIP_REQUIRED'
        });
      }

      next();
    } catch (error) {
      console.error('Erreur vérification propriétaire:', error);
      res.status(500).json({
        message: 'Erreur lors de la vérification des permissions'
      });
    }
  };
};

// Middleware pour logger les tentatives d'accès
const logAccess = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';
  const adminId = req.admin ? req.admin.id : 'Anonymous';

  console.log(`[${timestamp}] ${method} ${url} - Admin: ${adminId} - IP: ${ip} - UA: ${userAgent}`);
  next();
};

module.exports = {
  authenticate,
  requireSuperAdmin,
  optionalAuth,
  requireRole,
  requireOwnershipOrSuperAdmin,
  logAccess
};