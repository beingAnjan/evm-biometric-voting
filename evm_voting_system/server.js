const express = require("express");
const path = require("path");
require("./config/db");

const Voter = require("./models/Voter");
const Admin = require("./models/Admin");

const app = express();   // ✅ app is defined HERE

// Middleware
app.use(express.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, "public")));

// 🔐 LOGIN API
app.post("/login", async (req, res) => {
  console.log("LOGIN API HIT:", req.body);

  const { userId, password } = req.body;

  // Check voter
  const voter = await Voter.findOne({
    voterId: userId,
    password: password,
    isEligible: true,
    hasVoted: false
  });

  if (voter) {
    return res.json({ role: "voter" });
  }

  // Check admin
  const admin = await Admin.findOne({
    adminId: userId,
    password: password
  });

  if (admin) {
    return res.json({ role: "admin" });
  }

  res.status(401).json({ message: "Invalid credentials" });
});

// Default route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});
