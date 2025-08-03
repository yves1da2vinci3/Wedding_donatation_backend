const mongoose = require('mongoose');
const config = require('./config');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongodb.uri, config.mongodb.options);

    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);
    
    // Créer l'admin par défaut si il n'existe pas
    await createDefaultAdmin();
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

const createDefaultAdmin = async () => {
  try {
    const Admin = require('../models/Admin');
    const existingAdmin = await Admin.findOne({ email: process.env.ADMIN_EMAIL || 'admin@wedding.com' });
    
    if (!existingAdmin) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123456', 12);
      
      const defaultAdmin = new Admin({
        name: 'Administrateur',
        email: process.env.ADMIN_EMAIL || 'admin@wedding.com',
        password: hashedPassword,
        phone: '+33 6 12 34 56 78',
        role: 'admin'
      });
      
      await defaultAdmin.save();
      console.log('✅ Default admin created successfully');
    }

    // Créer des données de test en mode développement
    if (process.env.NODE_ENV === 'development') {
      const { seedData } = require('../utils/seedData');
      await seedData();
    }
  } catch (error) {
    console.error('❌ Error creating default admin:', error.message);
  }
};

module.exports = connectDB;