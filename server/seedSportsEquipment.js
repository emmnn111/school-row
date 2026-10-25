
require("dotenv").config();
const mongoose = require("mongoose");
const Equipment = require("./models/equipment");

const sportsEquipment = [
  {
    name: "Basketball",
    assetCode: "SPORT-001",
    category: "Sports",
    description: "Basketball for school sports activities.",
    quantityTotal: 10,
    quantityAvailable: 10,
    condition: "Good",
    location: "Sports Equipment Room",
    image: "https://plus.unsplash.com/premium_photo-1668767725891-58f5cd788105?q=80&w=1374&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D"
  },
  {
    name: "Volleyball",
    assetCode: "SPORT-002",
    category: "Sports",
    description: "Volleyball for training and school games.",
    quantityTotal: 10,
    quantityAvailable: 10,
    condition: "Good",
    location: "Sports Equipment Room",
    image: "https://images.unsplash.com/photo-1666901356149-93f2eb3ba5a2?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D"
  },
  {
    name: "Soccer Ball",
    assetCode: "SPORT-003",
    category: "Sports",
    description: "Soccer ball for physical education activities.",
    quantityTotal: 5,
    quantityAvailable: 5,
    condition: "Good",
    location: "Sports Equipment Room",
    image: "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?q=80&w=871&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D"
  },
  {
    name: "Badminton Racket",
    assetCode: "SPORT-004",
    category: "Sports",
    description: "Badminton racket for school badminton activities.",
    quantityTotal: 8,
    quantityAvailable: 8,
    condition: "Good",
    location: "Sports Equipment Room",
    image: "https://images.unsplash.com/photo-1708312604109-16c0be9326cd?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D"
  },
  {
    name: "Table Tennis Set",
    assetCode: "SPORT-005",
    category: "Sports",
    description: "Paddles and balls for table tennis.",
    quantityTotal: 5,
    quantityAvailable: 5,
    condition: "Good",
    location: "Sports Equipment Room",
    image: "https://images.unsplash.com/photo-1676827613262-5fba25cee5fd?q=80&w=387&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D"
  },
  {
    name: "Jump Rope",
    assetCode: "SPORT-006",
    category: "Sports",
    description: "Jump ropes for physical education and fitness.",
    quantityTotal: 15,
    quantityAvailable: 15,
    condition: "Good",
    location: "Sports Equipment Room",
    image: "https://images.unsplash.com/photo-1516876345887-6dd74f80787a?q=80&w=580&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D"
  }
];

async function seedSportsEquipment() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    for (const item of sportsEquipment) {
      await Equipment.updateOne(
  { assetCode: item.assetCode },
  { $set: { image: item.image } },
  { upsert: true }
);
    }

    console.log("Sports equipment added successfully!");
  } catch (error) {
    console.error("Error adding sports equipment:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

seedSportsEquipment();
