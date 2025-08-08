const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  reference: {
    type: String,
    required: [true, 'La référence est requise'],
    unique: true,
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Le montant est requis'],
    min: [1, 'Le montant doit être supérieur à 0']
  },
  donor: {
    type: String,
    required: [true, 'Le nom du donateur est requis'],
    trim: true,
    maxlength: [200, 'Le nom du donateur ne peut pas dépasser 200 caractères']
  },
  email: {
    type: String,
    required: [true, 'L\'email est requis'],
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Email invalide']
  },
  date: {
    type: Date,
    required: [true, 'La date est requise'],
    default: Date.now
  },
  time: {
    type: String,
    required: [true, 'L\'heure est requise']
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  anonymous: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    trim: true,
    maxlength: [1000, 'Le message ne peut pas dépasser 1000 caractères']
  },
  paymentMethod: {
    type: String,
    required: [true, 'La méthode de paiement est requise'],
    enum: ['Wave', 'OM', 'MTN Momo', 'Moov', 'Visa Mastercard']
  },
  // Informations de traitement du paiement
  transactionId: {
    type: String,
    trim: true
  },
  // Métadonnées
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  // Enveloppe utilisée (référence)
  envelope: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Envelope'
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances
donationSchema.index({ email: 1 });
donationSchema.index({ status: 1 });
donationSchema.index({ paymentMethod: 1 });
donationSchema.index({ date: -1 });
donationSchema.index({ amount: -1 });

// Méthode pour formater la date
donationSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString('fr-FR');
});

// Méthode pour formater le montant
donationSchema.virtual('formattedAmount').get(function() {
  return `${this.amount.toLocaleString('fr-FR')} €`;
});

// Générer automatiquement une référence unique si non fournie
donationSchema.pre('save', async function(next) {
  if (!this.reference) {
    const count = await this.constructor.countDocuments();
    this.reference = `DON-${String(count + 1).padStart(6, '0')}`;
  }
  
  // Générer l'heure si non fournie
  if (!this.time) {
    this.time = new Date().toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  
  next();
});

// Méthodes statiques pour les statistiques
donationSchema.statics.getTotalAmount = function(filter = {}) {
  return this.aggregate([
    { $match: { ...filter, status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
};

donationSchema.statics.getCountByStatus = function() {
  return this.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
};

donationSchema.statics.getRecentDonations = function(limit = 10) {
  return this.find({ status: 'completed' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('envelope', 'title amount');
};

module.exports = mongoose.model('Donation', donationSchema);