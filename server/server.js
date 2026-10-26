
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/authRoutes");
const equipmentRoutes = require("./routes/equipmentRoutes");
const borrowingRoutes = require("./routes/borrowingRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root health check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Schoolrow API is running.",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/equipment", equipmentRoutes);
app.use("/api/borrowings", borrowingRoutes);
app.use("/api/ai", aiRoutes);

// Not-found handler (must be after all routes)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found.",
    path: req.originalUrl,
    method: req.method,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Schoolrow server error:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    success: false,
    message: "An unexpected server error occurred.",
  });
});

// Connect to MongoDB and start the server
async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from server/.env.");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected successfully.");

    app.listen(PORT, () => {
      console.log(`Schoolrow API running at http://localhost:${PORT}`);
      console.log(`Authentication: http://localhost:${PORT}/api/auth`);
      console.log(`Equipment: http://localhost:${PORT}/api/equipment`);
      console.log(`Borrowings: http://localhost:${PORT}/api/borrowings`);
      console.log(`AI: http://localhost:${PORT}/api/ai`);
      console.log(
        `Ollama: ${process.env.OLLAMA_URL || "http://127.0.0.1:11434"}`
      );
      console.log(
        `AI model: ${process.env.OLLAMA_MODEL || "llama3.2:3b"}`
      );
    });
  } catch (error) {
    console.error("Failed to start Schoolrow:", error.message);
    process.exit(1);
  }
}

startServer();
