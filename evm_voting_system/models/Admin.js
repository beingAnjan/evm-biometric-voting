const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  adminName: String,
  adminId: { type: String, unique: true },
  password: String,
  location: String
});

module.exports = mongoose.model("Admin", adminSchema);
