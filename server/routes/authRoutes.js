
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Student = require("../models/student");
const Admin = require("../models/Admin");
const router = express.Router();

// --------------------------------------------------
// TOKEN
// --------------------------------------------------

const createToken = (id, role) => {
  return jwt.sign(
    {
      id: String(id),
      role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "2h",
    }
  );
};

// --------------------------------------------------
// AUTHORIZATION MIDDLEWARE
// --------------------------------------------------

// Verify that the user has a valid administrator token.
const requireAdmin = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication token is required.",
    });
  }

  try {
    const token = authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Administrator access is required.",
      });
    }

    // The Main Admin is configured through .env.
    if (decoded.id === "admin") {
      req.user = {
        ...decoded,
        isMainAdmin: true,
      };

      return next();
    }

    // Verify that an additional administrator still exists
    // and has an approved account.
    const admin = await Admin.findById(decoded.id).select("status");

    if (!admin || admin.status !== "Approved") {
      return res.status(403).json({
        success: false,
        message: "An approved administrator account is required.",
      });
    }

    req.user = {
      ...decoded,
      isMainAdmin: false,
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" ||
        error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token. Please log in again.",
      });
    }

    console.error("Admin authorization error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify administrator access.",
    });
  }
};

// Only the Main Admin can manage administrator accounts.
const requireMainAdmin = (req, res, next) => {
  requireAdmin(req, res, () => {
    if (!req.user.isMainAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only the Main Admin can perform this action.",
      });
    }

    next();
  });
};

// --------------------------------------------------
// CURRENT USER
// GET /api/auth/me
// --------------------------------------------------

router.get("/me", async (req, res) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required.",
      });
    }

    const token = authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Main Admin from .env.
    if (decoded.role === "admin" && decoded.id === "admin") {
      return res.json({
        success: true,
        role: "admin",
        isMainAdmin: true,
        user: {
          id: "admin",
          username: process.env.ADMIN_ID,
          fullName: "Main Administrator",
          email: "",
        },
      });
    }

    // Additional administrator from MongoDB.
    if (decoded.role === "admin") {
      const admin = await Admin.findById(decoded.id).select(
        "username fullName email status"
      );

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Administrator account was not found.",
        });
      }

      if (admin.status !== "Approved") {
        return res.status(403).json({
          success: false,
          message: "Administrator account is not approved.",
        });
      }

      return res.json({
        success: true,
        role: "admin",
        isMainAdmin: false,
        user: {
          id: admin._id,
          username: admin.username,
          fullName: admin.fullName,
          email: admin.email,
          status: admin.status,
        },
      });
    }

    // Student account.
    if (decoded.role === "student") {
      const student = await Student.findById(decoded.id).select(
        "-password"
      );

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student account was not found.",
        });
      }

      return res.json({
        success: true,
        role: "student",
        isMainAdmin: false,
        user: student,
      });
    }

    return res.status(403).json({
      success: false,
      message: "Invalid account role.",
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
});

// --------------------------------------------------
// STUDENT REGISTRATION
// POST /api/auth/register
// --------------------------------------------------

router.post("/register", async (req, res) => {
  try {
    const { studentId, fullName, email, password } = req.body;

    if (
      !studentId?.trim() ||
      !fullName?.trim() ||
      !email?.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Please complete all required fields.",
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    const normalizedStudentId = studentId.trim();
    const normalizedEmail = email.trim().toLowerCase();

    const existingStudent = await Student.findOne({
      $or: [
        { studentId: normalizedStudentId },
        { email: normalizedEmail },
      ],
    });

    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: "Student ID or email is already registered.",
      });
    }

    // Prevent using an administrator's email for a student account.
    const existingAdmin = await Admin.findOne({
      email: normalizedEmail,
    });

    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered to an administrator.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const student = await Student.create({
      studentId: normalizedStudentId,
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    return res.status(201).json({
      success: true,
      message: "Student registered successfully.",
      user: {
        id: student._id,
        studentId: student.studentId,
        fullName: student.fullName,
        email: student.email,
      },
    });
  } catch (error) {
    console.error("Student registration error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Student ID or email is already registered.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to register student.",
    });
  }
});

// --------------------------------------------------
// REQUEST AN ADMIN ACCOUNT
// POST /api/auth/admins/request
// --------------------------------------------------

router.post("/admins/request", async (req, res) => {
  try {
    const { username, fullName, email, password } = req.body;

    if (
      !username?.trim() ||
      !fullName?.trim() ||
      !email?.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Please complete all administrator fields.",
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();

    const existingAdmin = await Admin.findOne({
      $or: [
        { username: normalizedUsername },
        { email: normalizedEmail },
      ],
    });

    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: "Username or email is already registered.",
      });
    }

    const existingStudent = await Student.findOne({
      email: normalizedEmail,
    });

    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered to a student.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await Admin.create({
      username: normalizedUsername,
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      status: "Pending",
    });

    return res.status(201).json({
      success: true,
      message:
        "Admin request submitted. Wait for Main Admin approval.",
      user: {
        id: admin._id,
        username: admin.username,
        fullName: admin.fullName,
        email: admin.email,
        status: admin.status,
      },
    });
  } catch (error) {
    console.error("Admin request error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Username or email is already registered.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to submit administrator request.",
    });
  }
});

// --------------------------------------------------
// LIST ADMIN ACCOUNTS AND REQUESTS
// GET /api/auth/admins/requests
// MAIN ADMIN ONLY
// --------------------------------------------------

router.get("/admins/requests", requireMainAdmin, async (req, res) => {
  try {
    const requests = await Admin.find({})
      .select("username fullName email status createdAt")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error("Get administrator requests error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load administrator requests.",
    });
  }
});

// --------------------------------------------------
// APPROVE OR REJECT AN ADMIN REQUEST
// PATCH /api/auth/admins/:id/approval
// MAIN ADMIN ONLY
// --------------------------------------------------

router.patch(
  "/admins/:id/approval",
  requireMainAdmin,
  async (req, res) => {
    try {
      const { status } = req.body;

      if (!["Approved", "Rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be Approved or Rejected.",
        });
      }

      const admin = await Admin.findById(req.params.id);

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Administrator account was not found.",
        });
      }

      if (admin.status !== "Pending") {
        return res.status(409).json({
          success: false,
          message: "This request has already been reviewed.",
        });
      }

      admin.status = status;
      await admin.save();

      return res.json({
        success: true,
        message: `Administrator request ${status.toLowerCase()}.`,
        user: {
          id: admin._id,
          username: admin.username,
          fullName: admin.fullName,
          email: admin.email,
          status: admin.status,
        },
      });
    } catch (error) {
      console.error("Review administrator request error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to review administrator request.",
      });
    }
  }
);

// --------------------------------------------------
// MAIN ADMIN CREATES AN ADMIN ACCOUNT
// POST /api/auth/admins
// MAIN ADMIN ONLY
// --------------------------------------------------

router.post("/admins", requireMainAdmin, async (req, res) => {
  try {
    const { username, fullName, email, password } = req.body;

    if (
      !username?.trim() ||
      !fullName?.trim() ||
      !email?.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Please complete all administrator fields.",
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();

    const existingAdmin = await Admin.findOne({
      $or: [
        { username: normalizedUsername },
        { email: normalizedEmail },
      ],
    });

    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: "Username or email is already registered.",
      });
    }

    const existingStudent = await Student.findOne({
      email: normalizedEmail,
    });

    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered to a student.",
      });
    }

    const admin = await Admin.create({
      username: normalizedUsername,
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 10),
      status: "Approved",
    });

    return res.status(201).json({
      success: true,
      message: "Administrator account created successfully.",
      user: {
        id: admin._id,
        username: admin.username,
        fullName: admin.fullName,
        email: admin.email,
        status: admin.status,
      },
    });
  } catch (error) {
    console.error("Create administrator error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Username or email is already registered.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create administrator account.",
    });
  }
});

// --------------------------------------------------
// LOGIN
// POST /api/auth/login
// --------------------------------------------------

router.post("/login", async (req, res) => {
  try {
    const { studentId, password } = req.body;

    if (!studentId?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Enter your username or student ID and password.",
      });
    }

    const loginId = studentId.trim();

    // Main Admin configured in .env.
    if (process.env.ADMIN_ID && loginId === process.env.ADMIN_ID) {
      if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({
          success: false,
          message: "Invalid username or password.",
        });
      }

      const token = createToken("admin", "admin");

      return res.json({
        success: true,
        message: "Main Admin login successful.",
        token,
        role: "admin",
        isMainAdmin: true,
        user: {
          id: "admin",
          username: process.env.ADMIN_ID,
          fullName: "Main Administrator",
          email: "",
        },
      });
    }

    // Additional administrator login.
    const admin = await Admin.findOne({
      username: loginId,
    }).select("+password");

    if (admin) {
      const passwordMatches = await bcrypt.compare(
        password,
        admin.password
      );

      if (!passwordMatches) {
        return res.status(401).json({
          success: false,
          message: "Invalid username or password.",
        });
      }

      if (admin.status !== "Approved") {
        return res.status(403).json({
          success: false,
          message:
            admin.status === "Rejected"
              ? "Your administrator request was rejected."
              : "Your account is pending Main Admin approval.",
          status: admin.status,
        });
      }

      const token = createToken(admin._id, "admin");

      return res.json({
        success: true,
        message: "Administrator login successful.",
        token,
        role: "admin",
        isMainAdmin: false,
        user: {
          id: admin._id,
          username: admin.username,
          fullName: admin.fullName,
          email: admin.email,
          status: admin.status,
        },
      });
    }

    // Student login.
    const student = await Student.findOne({
      studentId: loginId,
    }).select("+password");

    if (!student) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      student.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password.",
      });
    }

    const token = createToken(student._id, "student");

    return res.json({
      success: true,
      message: "Student login successful.",
      token,
      role: "student",
      isMainAdmin: false,
      user: {
        id: student._id,
        studentId: student.studentId,
        fullName: student.fullName,
        email: student.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to log in. Please try again.",
    });
  }
});

module.exports = router;
