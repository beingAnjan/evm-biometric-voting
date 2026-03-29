const express = require("express");
const router = express.Router();
const Voter = require("../models/Voter");

router.post("/login", async (req, res) => {
  const { voterId, password } = req.body;

  const voter = await Voter.findOne({
    voterId,
    password,
    isEligible: true,
    hasVoted: false
  });

  if (!voter) {
    return res.status(401).json({ message: "Invalid or Not Eligible" });
  }

  res.json({
    message: "Voter Verified",
    name: voter.name,
    location: voter.location
  });
});

router.post("/vote", async (req, res) => {
  const { voterId } = req.body;

  await Voter.updateOne(
    { voterId },
    { $set: { hasVoted: true } }
  );

  res.json({ message: "Vote Cast Successfully" });
});

module.exports = router;
