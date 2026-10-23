
const express = require("express");
const mongoose = require("mongoose");
const Borrowing = require("../models/borrowing");
const Equipment = require("../models/equipment");

const router = express.Router();

const allowedStatuses = [
  "Pending",
  "Approved",
  "Borrowed",
  "Returned",
  "Rejected"
];

// GET all borrowing records with search and filters
router.get("/", async (req, res) => {
  try {
    const { search, status, studentId } = req.query;
    const filter = {};

    if (search && search.trim()) {
      const escapedSearch = search.trim().replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );
      const regex = new RegExp(escapedSearch, "i");

      filter.$or = [
        { studentName: regex },
        { studentId: regex },
        { courseSection: regex },
        { purpose: regex }
      ];
    }

    if (status) {
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid borrowing status."
        });
      }

      filter.status = status;
    }

    if (studentId) {
      filter.studentId = studentId;
    }

    const borrowings = await Borrowing.find(filter)
      .populate("equipmentId", "name assetCode category location")
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

// CREATE a borrowing request
router.post("/", async (req, res) => {
  try {
    const {
      studentName,
      studentId,
      courseSection,
      equipmentId,
      quantity,
      borrowDate,
      expectedReturnDate,
      purpose
    } = req.body;

    if (
      !studentName?.trim() ||
      !studentId?.trim() ||
      !courseSection?.trim() ||
      !equipmentId ||
      !purpose?.trim() ||
      !borrowDate ||
      !expectedReturnDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Please complete all required fields."
      });
    }

    if (!mongoose.isValidObjectId(equipmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid equipment ID."
      });
    }

    if (
      !Number.isInteger(Number(quantity)) ||
      Number(quantity) < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive whole number."
      });
    }

    const startDate = new Date(borrowDate);
    const endDate = new Date(expectedReturnDate);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      endDate < startDate
    ) {
      return res.status(400).json({
        success: false,
        message: "The return date must be on or after the borrow date."
      });
    }

    const equipment = await Equipment.findById(equipmentId);

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found."
      });
    }

    if (equipment.condition === "Damaged") {
      return res.status(400).json({
        success: false,
        message: "Damaged equipment cannot be borrowed."
      });
    }

    if (Number(quantity) > equipment.quantityAvailable) {
      return res.status(400).json({
        success: false,
        message: `Only ${equipment.quantityAvailable} unit(s) are currently available.`
      });
    }

    const borrowing = await Borrowing.create({
      studentName: studentName.trim(),
      studentId: studentId.trim(),
      courseSection: courseSection.trim(),
      equipmentId,
      quantity: Number(quantity),
      borrowDate: startDate,
      expectedReturnDate: endDate,
      purpose: purpose.trim(),
      status: "Pending"
    });

    const result = await Borrowing.findById(borrowing._id)
      .populate("equipmentId", "name assetCode category location");

    res.status(201).json({
      success: true,
      message: "Borrowing request submitted successfully.",
      data: result
    });
  } catch (error) {
    console.error("Borrowing POST error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to submit borrowing request."
    });
  }
});

// UPDATE borrowing status
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid borrowing record ID."
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid borrowing status."
      });
    }

    const borrowing = await Borrowing.findById(id);

    if (!borrowing) {
      return res.status(404).json({
        success: false,
        message: "Borrowing record not found."
      });
    }

    const previousStatus = borrowing.status;

    if (previousStatus === status) {
      return res.status(400).json({
        success: false,
        message: `This request is already ${status}.`
      });
    }

    // Define allowed status transitions.
    const transitions = {
      Pending: ["Approved", "Rejected"],
      Approved: ["Borrowed", "Rejected"],
      Borrowed: ["Returned"],
      Returned: [],
      Rejected: []
    };

    if (!transitions[previousStatus]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${previousStatus} to ${status}.`
      });
    }

    const equipment = await Equipment.findById(borrowing.equipmentId);

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "The associated equipment no longer exists."
      });
    }

    // Approval reserves the requested quantity.
    if (previousStatus === "Pending" && status === "Approved") {
      const updatedEquipment = await Equipment.findOneAndUpdate(
        {
          _id: equipment._id,
          quantityAvailable: { $gte: borrowing.quantity }
        },
        {
          $inc: {
            quantityAvailable: -borrowing.quantity
          }
        },
        { new: true, runValidators: true }
      );

      if (!updatedEquipment) {
        return res.status(400).json({
          success: false,
          message: "Not enough equipment is available to approve this request."
        });
      }
    }

    // If an approved request is rejected, release its reserved quantity.
    if (previousStatus === "Approved" && status === "Rejected") {
      await Equipment.updateOne(
        { _id: equipment._id },
        {
          $inc: {
            quantityAvailable: borrowing.quantity
          }
        }
      );
    }

    // Returning borrowed equipment makes it available again.
    if (previousStatus === "Borrowed" && status === "Returned") {
      await Equipment.updateOne(
        { _id: equipment._id },
        {
          $inc: {
            quantityAvailable: borrowing.quantity
          }
        }
      );

      borrowing.actualReturnDate = new Date();
    }

    borrowing.status = status;
    await borrowing.save();

    const result = await Borrowing.findById(borrowing._id)
      .populate("equipmentId", "name assetCode category location");

    res.json({
      success: true,
      message: `Borrowing request updated to ${status}.`,
      data: result
    });
  } catch (error) {
    console.error("Borrowing status error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update borrowing status."
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
      .populate("equipmentId", "name assetCode category location")
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
