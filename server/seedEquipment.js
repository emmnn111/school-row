
require("dotenv").config();

const mongoose = require("mongoose");
const Equipment = require("./models/equipment");

const sampleEquipment = [
  {
    name: "Basketball",
    assetCode: "SPORT-001",
    category: "Basketball",
    description: "Basketballs for PE classes and school games",
    quantityTotal: 10,
    quantityAvailable: 10,
    condition: "Good",
    location: "Sports Equipment Room"
  },
  {
    name: "Volleyball",
    assetCode: "SPORT-002",
    category: "Volleyball",
    description: "Volleyballs for PE classes and team practice",
    quantityTotal: 8,
    quantityAvailable: 8,
    condition: "Good",
    location: "Sports Equipment Room"
  },
  {
    name: "Soccer Ball",
    assetCode: "SPORT-003",
    category: "Football",
    description: "Soccer balls for school sports activities",
    quantityTotal: 6,
    quantityAvailable: 6,
    condition: "Good",
    location: "Sports Equipment Room"
  },
  {
    name: "Badminton Racket",
    assetCode: "SPORT-004",
    category: "Badminton",
    description: "Rackets for badminton practice",
    quantityTotal: 12,
    quantityAvailable: 12,
    condition: "Good",
    location: "PE Storage Room"
  },
  {
    name: "Training Cones",
    assetCode: "SPORT-005",
    category: "Training Equipment",
    description: "Cones for drills and sports training",
    quantityTotal: 20,
    quantityAvailable: 20,
    condition: "Good",
    location: "PE Storage Room"
  },
  {
    name: "Badminton Shuttlecock",
    assetCode: "SPORT-006",
    category: "Badminton",
    description: "Shuttlecocks for badminton practice",
    quantityTotal: 24,
    quantityAvailable: 24,
    condition: "Good",
    location: "PE Storage Room"
  },
  {
    name: "Jump Rope",
    assetCode: "SPORT-007",
    category: "Fitness Equipment",
    description: "Jump ropes for PE fitness activities",
    quantityTotal: 15,
    quantityAvailable: 15,
    condition: "Good",
    location: "PE Storage Room"
  },
  {
    name: "Table Tennis Paddle",
    assetCode: "SPORT-008",
    category: "Table Tennis",
    description: "Paddles for table tennis activities",
    quantityTotal: 10,
    quantityAvailable: 10,
    condition: "Good",
    location: "Sports Equipment Room"
  },
  {
    name: "Softball Glove",
    assetCode: "SPORT-009",
    category: "Softball",
    description: "Gloves for school softball activities",
    quantityTotal: 8,
    quantityAvailable: 8,
    condition: "Fair",
    location: "Sports Equipment Room"
  },
  {
    name: "First Aid Kit",
    assetCode: "SPORT-010",
    category: "Sports Safety",
    description: "First aid supplies for sports activities",
    quantityTotal: 4,
    quantityAvailable: 4,
    condition: "Good",
    location: "PE Storage Room"
  }
];

async function seedEquipment() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from your .env file.");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully.");

    let added = 0;
    let alreadyExists = 0;

    for (const item of sampleEquipment) {
      const result = await Equipment.updateOne(
        { assetCode: item.assetCode },
        { $setOnInsert: item },
        { upsert: true, runValidators: true }
      );

      if (result.upsertedCount > 0) {
        added++;
      } else {
        alreadyExists++;
      }
    }

    console.log(`Sports equipment added: ${added}`);
    console.log(`Existing records preserved: ${alreadyExists}`);
    console.log("Equipment seeding completed successfully.");
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

seedEquipment();

