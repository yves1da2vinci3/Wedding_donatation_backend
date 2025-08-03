const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Middleware pour vérifier l'authentification
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        message: 'Accès refusé. Token manquant.' 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id).select('-password');
    
    if (!admin) {
      return res.status(401).json({ 
        message: 'Token invalide. Administrateur non trouvé.' 
      });
    }
    
    if (!admin.isActive) {
      return res.status(401).json({ 
        message: 'Compte administrateur désactivé.' 
      });
    }
    
    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Token invalide.' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expiré.' 
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
  if (req.admin.role !== 'super_admin') {
    return res.status(403).json({ 
      message: 'Accès refusé. Permissions super administrateur requises.' 
    });
  }
  next();
};

// Middleware optionnel d'authentification (ne bloque pas si pas de token)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const admin = await Admin.findById(decoded.id).select('-password');
      
      if (admin && admin.isActive) {
        req.admin = admin;
      }
    }
    
    next();
  } catch (error) {
    // En cas d'erreur, on continue sans admin
    next();
  }
};

module.exports = {
  authenticate,
  requireSuperAdmin,
  optionalAuth
};