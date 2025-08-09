const express = require("express");
const router = express.Router();
const Donation = require("../models/Donation");

router.post("/verify", async (req, res) => {
  try {
    console.log("Données reçues:", req.body);
    
    const { reference, envelopeId, donationData, amount, donorInfo } = req.body;
    
    // Extraction des données du donateur
    const {
      firstName: donorFirstName,
      lastName: donorLastName,
      email: donorEmail,
      phone: donorPhone,
      message: donorMessage,
      isAnonymous: donorIsAnonymous,
    } = donorInfo;

    // Déterminer la méthode de paiement basée sur les métadonnées Paystack
    let paymentMethod = "Visa Mastercard"; // Par défaut
    if (req.body.metadata && req.body.metadata.custom_fields) {
      const paymentField = req.body.metadata.custom_fields.find(
        field => field.variable_name === "payment_method"
      );
      if (paymentField) {
        paymentMethod = paymentField.value;
      }
    }

   

    // Formater le nom du donateur
    const donorName = donorIsAnonymous 
      ? "Donateur Anonyme" 
      : `${donorFirstName || ""} ${donorLastName || ""}`.trim() || "Donateur";

    // Créer la donation selon le modèle
    const donation = new Donation({
      reference: reference,
      amount: amount,
      donor: donorName,
      email: donorEmail,
      date: new Date(),
      time: new Date().toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      status: "completed", // Paystack a déjà vérifié le paiement
      anonymous: donorIsAnonymous,
      message: donorMessage || "",
      paymentMethod: paymentMethod,
      transactionId: reference,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      envelope: envelopeId // Référence vers l'enveloppe
    });

    await donation.save();
    
    console.log("Donation créée avec succès:", donation);
    
    res.json({ 
      message: "Paystack verification successful", 
      donation: {
        id: donation._id,
        reference: donation.reference,
        amount: donation.amount,
        donor: donation.donor,
        status: donation.status,
        date: donation.date
      }
    });
    
  } catch (error) {
    console.error("Erreur lors de la création de la donation:", error);
    res.status(500).json({ 
      error: "Erreur lors de la création de la donation",
      details: error.message 
    });
  }
});


router.post("/webhook", (req, res) => {
  const { event , data } = req.body;
  const reference = data.reference;
  const provider =  data.bank;


  console.log("Paystack webhook received:", req.body);
  res.json({ message: "Paystack webhook received" });
});

module.exports = router;
