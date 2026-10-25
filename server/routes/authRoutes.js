
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Student = require("../models/Student");

const router = express.Router();

// CREATE JWT TOKEN
function createToken(id, role) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing from the server .env file.");
  }

  return jwt.sign(
    { id: String(id), role },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );
}


router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication token is required.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Return the admin profile for admin tokens.
    if (decoded.role === "admin") {
      return res.json({
        role: "admin",
        admin: {
          id: "admin",
          username: process.env.ADMIN_ID,
        },
      });
    }

    // Return the student profile for student tokens.
    if (decoded.role !== "student") {
      return res.status(403).json({
        message: "Invalid account role.",
      });
    }

    const student = await Student.findById(decoded.id);

    if (!student) {
      return res.status(404).json({
        message: "Student account not found.",
      });
    }

    return res.json({
      role: "student",
      student: {
        id: student._id,
        fullName: student.fullName,
        studentId: student.studentId,
        email: student.email,
      },
    });
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired login session.",
    });
  }
});


// =====================================
// STUDENT REGISTRATION
// POST /api/auth/register
// =====================================
router.post("/register", async (req, res) => {
  try {
    const { fullName, studentId, email, password } = req.body;

    if (!fullName || !studentId || !email || !password) {
      return res.status(400).json({
        message: "Please complete all required fields.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters.",
      });
    }

    const cleanStudentId = studentId.trim();
    const cleanEmail = email.trim().toLowerCase();

    const existingStudent = await Student.findOne({
      $or: [
        { studentId: cleanStudentId },
        { email: cleanEmail },
      ],
    });

    if (existingStudent) {
      return res.status(409).json({
        message: "Student ID or email is already registered.",
      });
    }

    // Hash the password before saving it
    const hashedPassword = await bcrypt.hash(password, 10);

    const student = await Student.create({
      fullName: fullName.trim(),
      studentId: cleanStudentId,
      email: cleanEmail,
      password: hashedPassword,
    });

    return res.status(201).json({
      message: "Student account created successfully.",
      student: {
        id: student._id,
        fullName: student.fullName,
        studentId: student.studentId,
        email: student.email,
      },
    });
  } catch (error) {
    console.error("REGISTRATION ERROR:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Student ID or email is already registered.",
      });
    }

    return res.status(500).json({
      message: "Unable to register student. Check the server terminal.",
    });
  }
});

// =====================================
// STUDENT AND ADMIN LOGIN
// POST /api/auth/login
// =====================================
router.post("/login", async (req, res) => {
  try {
    const { studentId, password } = req.body;

    if (
      typeof studentId !== "string" ||
      typeof password !== "string" ||
      !studentId.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Please enter your username or student ID and password.",
      });
    }

    const username = studentId.trim();

    // ADMIN LOGIN
    if (
      process.env.ADMIN_ID &&
      username === process.env.ADMIN_ID.trim()
    ) {
      if (
        !process.env.ADMIN_PASSWORD ||
        password !== process.env.ADMIN_PASSWORD
      ) {
        return res.status(401).json({
          message: "Invalid administrator credentials.",
        });
      }

      const token = createToken("admin", "admin");

      return res.json({
        message: "Admin login successful.",
        token,
        role: "admin",
        admin: {
          id: "admin",
          username: process.env.ADMIN_ID,
        },
      });
    }

    // STUDENT LOGIN
    // Explicitly retrieve the password because Student.js uses select: false
    const student = await Student.findOne({
      studentId: username,
    }).select("+password");

    if (!student) {
      return res.status(401).json({
        message: "Invalid student ID or password.",
      });
    }

    if (
      typeof student.password !== "string" ||
      !student.password
    ) {
      console.error(
        "Student account has no stored password hash:",
        student.studentId
      );

      return res.status(500).json({
        message: "This student account needs a password reset.",
      });
    }

    // Compare the entered password with its stored hash
    const passwordMatches = await bcrypt.compare(
      password,
      student.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid student ID or password.",
      });
    }

    const token = createToken(student._id, "student");

    return res.json({
      message: "Student login successful.",
      token,
      role: "student",
      student: {
        id: student._id,
        fullName: student.fullName,
        studentId: student.studentId,
        email: student.email,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR DETAILS:", error);

    return res.status(500).json({
      message: "Unable to log in. Check the server terminal.",
    });
  }
});

module.exports = router;
