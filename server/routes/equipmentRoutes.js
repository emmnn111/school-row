const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const Equipment = require("../models/equipment");

const router = express.Router();

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Image upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // Maximum 5 MB
  },
  fileFilter: (req, file, callback) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif"
    ];

    if (allowedTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(
        new Error("Only JPG, PNG, WEBP, and GIF images are allowed.")
      );
    }
  }
});

// Upload image to Cloudinary
function uploadToCloudinary(fileBuffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "schoolrow/equipment",
        resource_type: "image"
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result);
      }
    );

    stream.end(fileBuffer);
  });
}

// Handle upload errors, such as invalid image type or file too large
function handleUploadError(error, req, res, next) {
  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Image must not exceed 5 MB."
        : error.message;

    return res.status(400).json({
      success: false,
      message
    });
  }

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Image upload failed."
    });
  }

  next();
}

// GET: Retrieve and search equipment
router.get("/", async (req, res) => {
  try {
    const { search, category, condition } = req.query;
    const filter = {};

    if (category) {
      filter.category = category;
    }

    if (condition) {
      filter.condition = condition;
    }

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
    console.error("Retrieve equipment error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve equipment."
    });
  }
});

// POST: Add equipment with optional image upload
router.post(
  "/",
  (req, res, next) => {
    upload.single("image")(req, res, (error) => {
      handleUploadError(error, req, res, next);
    });
  },
  async (req, res) => {
    try {
      const {
        name,
        assetCode,
        category,
        description,
        quantityTotal,
        quantityAvailable,
        condition,
        location
      } = req.body;

      if (
        typeof name !== "string" ||
        !name.trim() ||
        typeof assetCode !== "string" ||
        !assetCode.trim() ||
        typeof category !== "string" ||
        !category.trim()
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

      // Upload the image if the admin selected one
      let imageUrl = "";

      if (req.file) {
        const uploadedImage = await uploadToCloudinary(
          req.file.buffer
        );

        imageUrl = uploadedImage.secure_url;
      }

      const equipment = await Equipment.create({
        name: name.trim(),
        assetCode: assetCode.trim(),
        category: category.trim(),
        description: description || "",
        quantityTotal: total,
        quantityAvailable: available,
        condition: condition || "Good",
        location: location || "Faculty Office",
        image: imageUrl
      });

      res.status(201).json({
        success: true,
        message: "Equipment added successfully.",
        data: equipment
      });
    } catch (error) {
      console.error("Add equipment error:", error);

      res.status(error.code === 11000 ? 400 : 500).json({
        success: false,
        message:
          error.code === 11000
            ? "That asset code already exists."
            : error.message || "Failed to add equipment."
      });
    }
  }
);

// PUT: Edit existing equipment
// This route retains support for updating an image using its URL.
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
    console.error("Update equipment error:", error);

    res.status(400).json({
      success: false,
      message:
        error.code === 11000
          ? "That asset code already exists."
          : error.message || "Failed to update equipment."
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
    console.error("Delete equipment error:", error);

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
    console.error("Retrieve equipment error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve equipment."
    });
  }
});

module.exports = router;