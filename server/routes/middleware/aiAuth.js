
const jwt = require("jsonwebtoken");

function requireLogin(req, res, next) {
  const authorization = req.headers.authorization || "";

  // Check whether the request includes a Bearer token.
  if (!authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Please log in to use the AI assistant.",
    });
  }

  // Ensure the JWT secret is configured.
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is missing from server/.env");

    return res.status(500).json({
      message: "Authentication is not configured correctly.",
    });
  }

  try {
    const token = authorization.slice(7);

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // Validate the user ID and account role.
    if (
      !decoded.id ||
      !["student", "admin"].includes(decoded.role)
    ) {
      return res.status(403).json({
        message: "Your account cannot use this assistant.",
      });
    }

    // Make the authenticated user available to the route.
    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      message:
        "Your session is invalid or expired. Please log in again.",
    });
  }
}

module.exports = { requireLogin };
