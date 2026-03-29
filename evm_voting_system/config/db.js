const mongoose = require("mongoose");

mongoose.connect("mongodb://127.0.0.1:27017/evm_voting_db")
  .then(() => console.log("MongoDB Connected Successfully"))
  .catch(err => console.error("MongoDB Error:", err));

module.exports = mongoose;
