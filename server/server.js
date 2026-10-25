
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const equipmentRoutes = require("./routes/equipmentRoutes");
const borrowingRoutes = require("./routes/borrowingRoutes");
const authRoutes = require("./routes/authRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
    ],
  })
);

app.use(express.json({ limit: "20kb" }));

app.get("/", (req, res) => {
  res.send("Welcome to Schoolrow API!");
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Schoolrow server is running!",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
  });
});

app.use("/api/equipment", equipmentRoutes);
app.use("/api/borrowings", borrowingRoutes);
app.use("/api/auth", authRoutes);

// AI assistant endpoint
app.use("/api/ai", aiRoutes);

// Keep this after all registered routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found.",
  });
});

async function startServer() {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error(
        "MONGODB_URI is missing. Check the server/.env file."
      );
    }

    await mongoose.connect(mongoUri);

    console.log("MongoDB connected successfully.");

    app.listen(PORT, () => {
      console.log(
        `Schoolrow server running at http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
