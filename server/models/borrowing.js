
const mongoose = require("mongoose");

const borrowingSchema = new mongoose.Schema(
  {
    studentName: {
      type: String,
      required: true,
      trim: true
    },
    studentId: {
      type: String,
      required: true,
      trim: true
    },
    courseSection: {
      type: String,
      required: true,
      trim: true
    },
    equipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Equipment",
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    borrowDate: {
      type: Date,
      required: true
    },
    expectedReturnDate: {
      type: Date,
      required: true
    },
    actualReturnDate: {
      type: Date,
      default: null
    },
    purpose: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: [
        "Pending",
        "Approved",
        "Borrowed",
        "Returned",
        "Rejected"
      ],
      default: "Pending"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Borrowing", borrowingSchema);
