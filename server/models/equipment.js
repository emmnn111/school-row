
const mongoose = require("mongoose");

const equipmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    assetCode: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ""
    },
    quantityTotal: {
      type: Number,
      required: true,
      min: 0
    },
    quantityAvailable: {
      type: Number,
      required: true,
      min: 0
    },
    condition: {
      type: String,
      enum: ["Good", "Fair", "Damaged"],
      default: "Good"
    },
    location: {
      type: String,
      default: "Faculty Office"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Equipment", equipmentSchema);
