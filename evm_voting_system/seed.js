require("./config/db");
const Voter = require("./models/Voter");
const Admin = require("./models/Admin");

async function seedDatabase() {
  await Admin.deleteMany({});
  await Voter.deleteMany({});

  await Admin.insertMany([
    {
      adminName: "Admin Srikakulam",
      adminId: "ADMIN_SKM_001",
      password: "admin123",
      location: "srikakulam"
    },
    {
      adminName: "Admin Nizamabad",
      adminId: "ADMIN_NZB_001",
      password: "admin456",
      location: "nizamabad"
    }
  ]);

  let voters = [];

  for (let i = 1; i <= 100; i++) {
    voters.push({
      name: "Voter_SKM_" + i,
      voterId: "SKM" + (1000 + i),
      password: "pass" + i,
      location: "srikakulam"
    });
  }

  for (let i = 1; i <= 100; i++) {
    voters.push({
      name: "Voter_NZB_" + i,
      voterId: "NZB" + (2000 + i),
      password: "pass" + i,
      location: "nizamabad"
    });
  }

  await Voter.insertMany(voters);
  console.log("✅ 2 Admins & 200 Voters Inserted");
  process.exit();
}

seedDatabase();
