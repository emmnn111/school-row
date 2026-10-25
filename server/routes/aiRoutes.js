
const express = require("express");
const OpenAI = require("openai");
const rateLimit = require("express-rate-limit");
const { requireLogin } = require("../middleware/aiAuth");

const router = express.Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

const instructions = {
  student: `
    You are Schoolrow's student assistant.

    Help students understand:
    - Borrowing school equipment
    - Returning equipment
    - Borrowing request statuses
    - Searching for available equipment
    - Using the student dashboard

    Give clear, friendly, step-by-step instructions.
    Do not claim that you approved, rejected, or changed a request.
    Do not invent equipment availability or borrowing records.
    Direct account-specific issues to a faculty member or administrator.
  `,

  admin: `
    You are Schoolrow's administrator assistant.

    Help administrators understand:
    - Managing equipment
    - Reviewing borrowing requests
    - Handling equipment returns
    - Searching and updating records
    - Using the admin dashboard

    Give clear, practical instructions.
    You cannot perform administrative actions or change database records.
    Never claim that you approved a request or modified equipment.
  `,
};

router.post("/", requireLogin, aiLimiter, async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        message: "AI is not configured. Check the server .env file.",
      });
    }

    const { message, history = [] } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        message: "Please enter a question.",
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        message: "Your message must be 2,000 characters or fewer.",
      });
    }

    const safeHistory = Array.isArray(history)
      ? history
          .filter(
            (item) =>
              item &&
              ["user", "assistant"].includes(item.role) &&
              typeof item.content === "string"
          )
          .slice(-8)
          .map((item) => ({
            role: item.role,
            content: item.content.slice(0, 2000),
          }))
      : [];

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      instructions: instructions[req.user.role],
      input: [
        ...safeHistory,
        {
          role: "user",
          content: message.trim(),
        },
      ],
      max_output_tokens: 500,
    });

    return res.json({
      reply:
        response.output_text ||
        "I couldn't generate an answer. Please try again.",
    });
  } catch (error) {
    console.error("Schoolrow AI error:", error.message);

    return res.status(500).json({
      message: "The AI assistant is temporarily unavailable.",
    });
  }
});

module.exports = router;
