const express = require("express");
const router = express.Router();

router.post("/verify", (req, res) => {
  console.log(req.body);
  res.json({ message: "Paystack verification successful" });
});

module.exports = router;