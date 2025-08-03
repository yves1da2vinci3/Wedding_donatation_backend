const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true,
    maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères']
  },
  email: {
    type: String,
    required: [true, 'L\'email est requis'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Email invalide']
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères']
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Le numéro de téléphone ne peut pas dépasser 20 caractères']
  },
  role: {
    type: String,
    enum: ['admin', 'super_admin'],
    default: 'admin'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  settings: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    autoExport: {
      type: Boolean,
      default: true
    },
    twoFactorAuth: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances
adminSchema.index({ email: 1 });

// Méthode pour comparer les mots de passe
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Middleware pour hasher le mot de passe avant la sauvegarde
adminSchema.pre('save', async function(next) {
  // Seulement hasher le mot de passe s'il a été modifié
  if (!this.isModified('password')) return next();
  
  // Hasher le mot de passe avec un coût de 12
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Exclure le mot de passe des réponses JSON par défaut
adminSchema.methods.toJSON = function() {
  const admin = this.toObject();
  delete admin.password;
  return admin;
};

module.exports = mongoose.model('Admin', adminSchema);