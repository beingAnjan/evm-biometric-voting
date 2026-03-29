const express = require("express");
const router = express.Router();
const Admin = require("../models/Admin");
const Voter = require("../models/Voter");

router.post("/login", async (req, res) => {
  const { adminId, password } = req.body;

  const admin = await Admin.findOne({ adminId, password });
  if (!admin) {
    return res.status(401).json({ message: "Invalid Admin Credentials" });
  }

  const voters = await Voter.find({ location: admin.location });

  res.json({
    message: "Admin Verified",
    location: admin.location,
    votersCount: voters.length
  });
});

module.exports = router;
