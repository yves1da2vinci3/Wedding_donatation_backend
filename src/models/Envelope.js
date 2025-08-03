const mongoose = require('mongoose');

const envelopeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Le titre est requis'],
    trim: true,
    maxlength: [100, 'Le titre ne peut pas dépasser 100 caractères']
  },
  amount: {
    type: Number,
    required: [true, 'Le montant est requis'],
    min: [1, 'Le montant doit être supérieur à 0']
  },
  description: {
    type: String,
    required: [true, 'La description est requise'],
    trim: true,
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
  },
  usageCount: {
    type: Number,
    default: 0,
    min: [0, 'Le nombre d\'utilisations ne peut pas être négatif']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Métadonnées pour l'affichage
  color: {
    type: String,
    default: '#10b981', // Vert par défaut
    trim: true
  },
  icon: {
    type: String,
    default: 'Mail',
    trim: true
  },
  // Ordre d'affichage
  sortOrder: {
    type: Number,
    default: 0
  },
  // Limites d'utilisation (optionnel)
  maxUsage: {
    type: Number,
    min: [0, 'La limite d\'utilisation ne peut pas être négative']
  },
  // Date d'expiration (optionnel)
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances
envelopeSchema.index({ isActive: 1, sortOrder: 1 });
envelopeSchema.index({ amount: 1 });

// Méthode virtuelle pour vérifier si l'enveloppe est disponible
envelopeSchema.virtual('isAvailable').get(function() {
  // Vérifier si l'enveloppe est active
  if (!this.isActive) return false;
  
  // Vérifier la limite d'utilisation
  if (this.maxUsage && this.usageCount >= this.maxUsage) return false;
  
  // Vérifier la date d'expiration
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  
  return true;
});

// Méthode virtuelle pour le montant formaté
envelopeSchema.virtual('formattedAmount').get(function() {
  return `${this.amount.toLocaleString('fr-FR')} €`;
});

// Méthode pour incrémenter le compteur d'utilisation
envelopeSchema.methods.incrementUsage = async function() {
  this.usageCount += 1;
  return await this.save();
};

// Méthode pour décrémenter le compteur d'utilisation
envelopeSchema.methods.decrementUsage = async function() {
  if (this.usageCount > 0) {
    this.usageCount -= 1;
    return await this.save();
  }
  return this;
};

// Méthodes statiques
envelopeSchema.statics.getActiveEnvelopes = function() {
  return this.find({ isActive: true }).sort({ sortOrder: 1, amount: 1 });
};

envelopeSchema.statics.getPopularEnvelopes = function(limit = 5) {
  return this.find({ isActive: true })
    .sort({ usageCount: -1 })
    .limit(limit);
};

envelopeSchema.statics.getEnvelopeStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalEnvelopes: { $sum: 1 },
        activeEnvelopes: { 
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } 
        },
        totalUsage: { $sum: '$usageCount' },
        averageAmount: { $avg: '$amount' }
      }
    }
  ]);
};

// Middleware pour définir un ordre de tri par défaut
envelopeSchema.pre('save', function(next) {
  if (this.isNew && this.sortOrder === 0) {
    // Si c'est un nouvel enveloppe sans ordre spécifié, utiliser l'ordre basé sur le montant
    this.sortOrder = this.amount;
  }
  next();
});

// Assurer que les enveloppes virtuelles sont incluses dans JSON
envelopeSchema.set('toJSON', { virtuals: true });
envelopeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Envelope', envelopeSchema);