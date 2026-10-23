
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const equipmentRoutes = require("./routes/equipmentRoutes");
const borrowingRoutes = require("./routes/borrowingRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: [
    "http://localhost:5173",
    "http://localhost:5174"
  ]
}));
app.use(express.json());

app.use(
  "/api/borrowings",
  require("./routes/borrowingRoutes")
);

// Homepage
app.get("/", (req, res) => {
  res.send("Welcome to Schoolrow API!");
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Schoolrow server is running!",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected"
  });
});

// Register routes
app.use("/api/equipment", equipmentRoutes);
app.use("/api/borrowings", borrowingRoutes);
app.use("/api/equipment", require("./routes/equipmentRoutes"));
// Unknown route
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found."
  });
});

// Start after MongoDB connects
async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected successfully.");

    app.listen(PORT, () => {
      console.log(
        `Schoolrow server running at http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

startServer();
