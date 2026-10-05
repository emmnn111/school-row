
const express = require("express");
const mongoose = require("mongoose");
const Equipment = require("../models/equipment");

const router = express.Router();

// GET all equipment and search
router.get("/", async (req, res) => {
  try {
    const { search, category, condition } = req.query;
    const filter = {};

    if (search && search.trim()) {
      const regex = new RegExp(
        search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );

      filter.$or = [
        { name: regex },
        { category: regex },
        { assetCode: regex }
      ];
    }

    if (category) filter.category = category;
    if (condition) filter.condition = condition;

    const equipment = await Equipment.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: equipment.length,
      data: equipment
    });
  } catch (error) {
    console.error("Equipment GET error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve equipment."
    });
  }
});

// GET one equipment item by ID
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid equipment ID."
      });
    }

    const equipment = await Equipment.findById(req.params.id).lean();

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found."
      });
    }

    res.json({
      success: true,
      data: equipment
    });
  } catch (error) {
    console.error("Equipment detail error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve equipment details."
    });
  }
});

module.exports = router;
