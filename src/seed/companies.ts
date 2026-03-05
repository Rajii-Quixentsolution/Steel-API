import mongoose from "mongoose";
import Company from "../models/Company";
import User, { UserRole } from "../models/User";

async function seedCompanies() {
  try {
    console.log("🌱 Seeding companies...");

    // Check if companies already exist
    const existingCompanies = await Company.countDocuments();
    if (existingCompanies > 0) {
      console.log(`⚠️  Found ${existingCompanies} existing companies. Skipping seed.`);
      return;
    }

    // Find Super Admin user (phone: 8888888888)
    const superAdmin = await User.findOne({ phoneNo: 8888888888, role: UserRole.SUPER_ADMIN });
    if (!superAdmin) {
      console.log("❌ Super Admin not found. Please run user seed first.");
      return;
    }

    // Sample steel companies
    const companiesData = [
      {
        name: "SteelTech Industries",
        email: "contact@steeltch.com",
        gstNumber: "27AAACI1234D1Z5",
        companyAdminPhone: "9876543210",
        status: "active"
      },
      {
        name: "IronWorks Solutions",
        email: "info@ironworks.com",
        gstNumber: "27BBBCI2345E2Z6",
        companyAdminPhone: "8765432109",
        status: "active"
      },
      {
        name: "MetalForge Corporation",
        email: "sales@metalforg.com",
        gstNumber: "27CCCDI3456F3Z7",
        companyAdminPhone: "7654321098",
        status: "active"
      },
      {
        name: "SteelMasters Ltd",
        email: "support@steelmasters.com",
        gstNumber: "27DDDEI4567G4Z8",
        companyAdminPhone: "6543210987",
        status: "active"
      },
      {
        name: "IronBridge Steels",
        email: "admin@ironbridge.com",
        gstNumber: "27EEEFI5678H5Z9",
        companyAdminPhone: "5432109876",
        status: "active"
      }
    ];

    // Create companies
    const companies = await Company.insertMany(
      companiesData.map(company => ({
        ...company,
        createdBy: superAdmin._id
      }))
    );

    console.log(`✅ Created ${companies.length} companies:`);
    companies.forEach(company => {
      console.log(`   - ${company.name} (${company.companyAdminPhone})`);
    });

  } catch (error) {
    console.error("❌ Error seeding companies:", error);
  }
}

// Run seed if called directly
if (require.main === module) {
  seedCompanies().then(() => {
    console.log("🎉 Company seeding completed!");
    process.exit(0);
  });
}

export default seedCompanies;