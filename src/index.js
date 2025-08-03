const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const config = require("./config/config");

const connectDB = require("./config/database");
const authRoutes = require("./routes/auth");
const donationRoutes = require("./routes/donations");
const envelopeRoutes = require("./routes/envelopes");
const dashboardRoutes = require("./routes/dashboard");
const settingsRoutes = require("./routes/settings");

const app = express();
const PORT = process.env.PORT || 3001;

// Connecter à la base de données
connectDB();

// Middleware de sécurité
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:8081",
    credentials: true,
  })
);

// Middleware de logging
app.use(morgan("dev"));

// Middleware pour parser le JSON
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "Wedding Donation API",
    version: "1.0.0",
    status: "running",
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/envelopes", envelopeRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/settings", settingsRoutes);

// Middleware de gestion d'erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// // Seed data
// const { seedData, createDefaultAdmin } = require("./utils/seedData");
// // Créer l'admin par défaut au démarrage
// createDefaultAdmin().then(() => {
//   console.log('✅ Admin initialization completed');
//   // Créer les données de test seulement en développement
//   if (process.env.NODE_ENV === 'development') {
//     seedData().then(() => {
//       console.log('✅ Test data initialization completed');
//     });
//   }
// });

// Route 404
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV || "development"}`);
});
