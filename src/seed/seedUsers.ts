import mongoose from "mongoose";
import dotenv from "dotenv";
import User, { UserRole } from "../models/User";

dotenv.config();

// Users to seed in MongoDB
const SEED_USERS = [
  { phoneNo: 9999999999, role: UserRole.SUPER_ADMIN, name: "Super Admin" },
  { phoneNo: 8888888888, role: UserRole.ASO, name: "ASO" },
  { phoneNo: 7777777777, role: UserRole.DEALER, name: "Dealer" },
  { phoneNo: 6666666666, role: UserRole.BARBENDER, name: "Barbender" }
];

const seedUsers = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/steel";
    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB connected");

    // Clear existing users
    await User.deleteMany({});
    console.log("✅ Cleared existing users");

    // Seed allowed users
    const now = new Date();
    const usersToInsert = SEED_USERS.map(user => ({
      countryCode: "91",
      phoneNo: user.phoneNo,
      role: user.role,
      name: user.name,
      lastOTPValidated: now,
      createdAt: now,
      updatedAt: now,
      isDeleted: false
    }));

    await User.insertMany(usersToInsert);
    console.log("✅ Seeded allowed users:");

    SEED_USERS.forEach(user => {
      console.log(`   - ${user.name} (${user.role}): ${user.phoneNo}`);
    });

    console.log("\n✅ Seed completed successfully!");
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Seed failed:", error.message);
    process.exit(1);
  }
};

seedUsers();
