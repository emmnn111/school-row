
const jwt = require("jsonwebtoken");

function requireLogin(req, res, next) {
  const authorization = req.headers.authorization || "";

  if (!authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Please log in to use the AI assistant.",
    });
  }

  try {
    const token = authorization.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (
      !decoded.id ||
      !["student", "admin"].includes(decoded.role)
    ) {
      return res.status(403).json({
        message: "Your account cannot use this assistant.",
      });
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Your session is invalid or expired. Please log in again.",
    });
  }
}

module.exports = { requireLogin };
