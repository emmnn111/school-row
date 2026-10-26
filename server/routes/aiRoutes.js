
const express = require("express");
const rateLimit = require("express-rate-limit");
const { requireLogin } = require("../middleware/aiAuth");

const router = express.Router();

// Allow up to 10 AI requests per minute per client.
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

// Instructions for each account role.
const instructions = {
  student: `
You are Schoolrow's AI assistant for students.

Schoolrow is a school equipment borrowing system.

Help students with:
- How to borrow and return school equipment.
- How to use Schoolrow.
- Understanding borrowing statuses.
- Understanding equipment availability.
- Finding and understanding equipment information.
- Troubleshooting common problems.

Be friendly, clear, and concise.
Prefer short answers and numbered steps when useful.

Do not claim that you have borrowed, reserved, returned, or changed
equipment.
Do not invent equipment availability, school policies, or records.
If you do not know something, advise the student to check Schoolrow
or contact the faculty.
`,

  admin: `
You are Schoolrow's AI assistant for administrators.

Schoolrow is a school equipment borrowing system.

Help administrators with:
- Managing equipment records.
- Understanding equipment quantities and availability.
- Understanding borrowing statuses and workflows.
- Troubleshooting common Schoolrow issues.
- Organizing equipment information.
- Understanding equipment search and inventory management.

Be professional, friendly, and concise.
Prefer short answers and numbered steps when useful.

You cannot directly create, update, or delete records.
Never claim that you performed an action in the system.
Do not invent equipment data, borrowing records, or school policies.
`,

};

// POST /api/ai
router.post(
  "/",
  requireLogin,
  aiLimiter,
  async (req, res) => {
    const { message, history = [] } = req.body || {};

    // Validate the message before contacting Ollama.
    if (
      typeof message !== "string" ||
      !message.trim()
    ) {
      return res.status(400).json({
        message: "Please enter a message.",
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        message:
          "Your message is too long. Please use 2000 characters or fewer.",
      });
    }

    // Verify the authenticated user's role.
    const userRole = req.user?.role;

    if (!instructions[userRole]) {
      return res.status(403).json({
        message:
          "Your account role is not authorized to use this AI assistant.",
      });
    }

    // Keep only the most recent 6 valid conversation messages.
    const safeHistory = Array.isArray(history)
      ? history
          .filter(
            (item) =>
              item &&
              ["user", "assistant"].includes(item.role) &&
              typeof item.content === "string" &&
              item.content.trim()
          )
          .slice(-6)
          .map((item) => ({
            role: item.role,
            content: item.content.slice(0, 1200),
          }))
      : [];

    const ollamaUrl = (
      process.env.OLLAMA_URL ||
      "http://127.0.0.1:11434"
    ).replace(/\/+$/, "");

    const model =
      process.env.OLLAMA_MODEL || "llama3.2:3b";

    const controller = new AbortController();

    // Keep a generous timeout for slower computers.
    const timeout = setTimeout(() => {
      controller.abort();
    }, 120000);

    try {
      const response = await fetch(
        `${ollamaUrl}/api/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            stream: false,

            // Keep the model loaded to reduce reload delays.
            keep_alive: "10m",

            messages: [
              {
                role: "system",
                content: instructions[userRole],
              },
              ...safeHistory,
              {
                role: "user",
                content: message.trim(),
              },
            ],

            // Performance settings.
            options: {
              num_predict: 180,
              num_ctx: 2048,
              temperature: 0.3,
            },
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error(
          "Ollama API error:",
          data.error || response.statusText
        );

        return res.status(502).json({
          message:
            "Ollama could not generate a response. Check that Ollama is running and the model is installed.",
        });
      }

      const reply = data.message?.content;

      if (
        typeof reply !== "string" ||
        !reply.trim()
      ) {
        return res.status(502).json({
          message:
            "Ollama returned an empty response. Please try again.",
        });
      }

      // Preserve the response format used by your frontend.
      return res.status(200).json({
        reply: reply.trim(),
      });
    } catch (error) {
      if (error.name === "AbortError") {
        return res.status(504).json({
          message:
            "Ollama took too long to respond. Please try again.",
        });
      }

      console.error(
        "Schoolrow Ollama error:",
        error.message
      );

      return res.status(503).json({
        message:
          "Cannot connect to Ollama. Make sure Ollama is running and the configured URL is correct.",
      });
    } finally {
      clearTimeout(timeout);
    }
  }
);

module.exports = router;
