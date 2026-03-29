const mongoose = require("mongoose");

const voterSchema = new mongoose.Schema({
  name: String,
  voterId: { type: String, unique: true },
  password: String,
  location: String,
  isEligible: { type: Boolean, default: true },
  hasVoted: { type: Boolean, default: false }
});

module.exports = mongoose.model("Voter", voterSchema);
