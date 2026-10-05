
const express = require("express");
const mongoose = require("mongoose");
const Borrowing = require("../models/borrowing");

const router = express.Router();

// GET all borrowing records and search
router.get("/", async (req, res) => {
  try {
    const { search, status, studentId } = req.query;
    const filter = {};

    if (search && search.trim()) {
      const regex = new RegExp(
        search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );

      filter.$or = [
        { studentName: regex },
        { studentId: regex },
        { courseSection: regex },
        { purpose: regex }
      ];
    }

    if (status) {
      const allowedStatuses = [
        "Pending",
        "Approved",
        "Borrowed",
        "Returned",
        "Rejected"
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid borrowing status."
        });
      }

      filter.status = status;
    }

    if (studentId) filter.studentId = studentId;

    const borrowings = await Borrowing.find(filter)
      .populate(
        "equipmentId",
        "name assetCode category location"
      )
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: borrowings.length,
      data: borrowings
    });
  } catch (error) {
    console.error("Borrowing GET error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve borrowing records."
    });
  }
});

// GET one borrowing record by ID
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid borrowing record ID."
      });
    }

    const borrowing = await Borrowing.findById(req.params.id)
      .populate(
        "equipmentId",
        "name assetCode category location"
      )
      .lean();

    if (!borrowing) {
      return res.status(404).json({
        success: false,
        message: "Borrowing record not found."
      });
    }

    res.json({
      success: true,
      data: borrowing
    });
  } catch (error) {
    console.error("Borrowing detail error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve borrowing details."
    });
  }
});

module.exports = router;
