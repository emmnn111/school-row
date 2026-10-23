
const express = require("express");
const mongoose = require("mongoose");
const Equipment = require("../models/equipment");

const router = express.Router();

// GET: Retrieve and search equipment
router.get("/", async (req, res) => {
  try {
    const { search, category, condition } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (condition) filter.condition = condition;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { assetCode: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } }
      ];
    }

    const equipment = await Equipment.find(filter).sort({
      createdAt: -1
    });

    res.json({
      success: true,
      count: equipment.length,
      data: equipment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve equipment."
    });
  }
});

// POST: Add equipment
router.post("/", async (req, res) => {
  try {
    const {
      name,
      assetCode,
      category,
      description,
      quantityTotal,
      quantityAvailable,
      condition,
      location,
      image
    } = req.body;

    if (
      !name?.trim() ||
      !assetCode?.trim() ||
      !category?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, asset code, and category are required."
      });
    }

    const total = Number(quantityTotal);
    const available = Number(quantityAvailable);

    if (
      !Number.isInteger(total) ||
      !Number.isInteger(available) ||
      total < 0 ||
      available < 0 ||
      available > total
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Quantities must be whole numbers, and available quantity cannot exceed total quantity."
      });
    }

    const equipment = await Equipment.create({
      name: name.trim(),
      assetCode: assetCode.trim(),
      category: category.trim(),
      description,
      quantityTotal: total,
      quantityAvailable: available,
      condition,
      location,
      image: image || ""
    });

    res.status(201).json({
      success: true,
      message: "Equipment added successfully.",
      data: equipment
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error.code === 11000
          ? "That asset code already exists."
          : error.message
    });
  }
});

// PUT: Edit existing equipment
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid equipment ID."
      });
    }

    const allowedFields = [
      "name",
      "assetCode",
      "category",
      "description",
      "quantityTotal",
      "quantityAvailable",
      "condition",
      "location",
      "image"
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    for (const field of ["name", "assetCode", "category"]) {
      if (
        updates[field] !== undefined &&
        (
          typeof updates[field] !== "string" ||
          !updates[field].trim()
        )
      ) {
        return res.status(400).json({
          success: false,
          message: `${field} cannot be empty.`
        });
      }

      if (typeof updates[field] === "string") {
        updates[field] = updates[field].trim();
      }
    }

    if (
      updates.quantityTotal !== undefined ||
      updates.quantityAvailable !== undefined
    ) {
      const current = await Equipment.findById(id);

      if (!current) {
        return res.status(404).json({
          success: false,
          message: "Equipment not found."
        });
      }

      const total = Number(
        updates.quantityTotal ?? current.quantityTotal
      );

      const available = Number(
        updates.quantityAvailable ?? current.quantityAvailable
      );

      if (
        !Number.isInteger(total) ||
        !Number.isInteger(available) ||
        total < 0 ||
        available < 0 ||
        available > total
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Quantities must be whole numbers, and available quantity cannot exceed total quantity."
        });
      }

      updates.quantityTotal = total;
      updates.quantityAvailable = available;
    }

    const equipment = await Equipment.findByIdAndUpdate(
      id,
      updates,
      {
        new: true,
        runValidators: true
      }
    );

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found."
      });
    }

    res.json({
      success: true,
      message: "Equipment updated successfully.",
      data: equipment
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error.code === 11000
          ? "That asset code already exists."
          : error.message
    });
  }
});

// DELETE: Remove equipment
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid equipment ID."
      });
    }

    const equipment = await Equipment.findByIdAndDelete(id);

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found."
      });
    }

    res.json({
      success: true,
      message: "Equipment deleted successfully.",
      data: equipment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete equipment."
    });
  }
});

// GET: Retrieve one equipment record
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid equipment ID."
      });
    }

    const equipment = await Equipment.findById(id);

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
    res.status(500).json({
      success: false,
      message: "Failed to retrieve equipment."
    });
  }
});

module.exports = router;
