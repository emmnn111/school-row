
const express = require("express");
const rateLimit = require("express-rate-limit");
const { requireLogin } = require("../middleware/aiAuth");
const Equipment = require("../models/equipment");

const router = express.Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

const instructions = {
  student: `
You are Schoolrow's AI assistant for students.
Schoolrow is a school equipment borrowing system.

Help students understand how to borrow and return equipment,
borrowing statuses, equipment availability, and how to use Schoolrow.

You will receive live equipment data from the Schoolrow database.
Use that data to answer questions about equipment, quantities,
condition, categories, asset codes, and locations.

An equipment item is available to borrow only when quantityAvailable
is greater than zero. If it is zero, say none are currently available.
Do not confuse quantityTotal with quantityAvailable.

Never invent equipment records, quantities, policies, or availability.
If no matching equipment is found, clearly say so.
Do not claim to create, edit, delete, approve, or reject records.
Be friendly, clear, and concise.
`,

  admin: `
You are Schoolrow's AI assistant for administrators.

Help administrators understand equipment inventory, availability,
quantities, categories, conditions, locations, and asset codes.

You will receive live equipment data from the Schoolrow database.
Use that data to answer inventory questions accurately.

An item has available stock when quantityAvailable is greater than zero.
Do not confuse quantityTotal with quantityAvailable.

Never invent equipment records, quantities, or policies.
If no matching equipment is found, clearly say so.
You can explain how to manage records, but you cannot directly
create, update, or delete equipment records.
Be professional, friendly, and concise.
`,
};

router.post("/", requireLogin, aiLimiter, async (req, res) => {
  const { message, history = [] } = req.body || {};

  if (typeof message !== "string" || !message.trim()) {
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

  const userRole = req.user?.role;

  if (!instructions[userRole]) {
    return res.status(403).json({
      message:
        "Your account role is not authorized to use this AI assistant.",
    });
  }

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

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model =
    process.env.OPENROUTER_MODEL ||
    "nvidia/nemotron-3.5-lightning:free";

  if (!apiKey) {
    return res.status(500).json({
      message:
        "The AI assistant is not configured. Please contact the administrator.",
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    // Retrieve current equipment records from MongoDB.
    const equipment = await Equipment.find({})
      .select(
        "name assetCode category description quantityTotal quantityAvailable condition location"
      )
      .sort({ name: 1 })
      .limit(100)
      .lean();

    // Send only the inventory fields the AI needs.
    const inventory = equipment.map((item) => ({
      name: item.name,
      assetCode: item.assetCode,
      category: item.category,
      description: item.description,
      quantityTotal: item.quantityTotal,
      quantityAvailable: item.quantityAvailable,
      condition: item.condition,
      location: item.location,
    }));

    const inventoryContext = `
LIVE SCHOOLROW EQUIPMENT DATABASE DATA

The following JSON contains equipment records retrieved from MongoDB
for this request. Use these records as the source of truth for
equipment questions.

${JSON.stringify(inventory)}

Total records included: ${inventory.length}.
${
  inventory.length === 100
    ? "The query is limited to 100 records; do not claim this is the complete inventory."
    : "All records returned by the current equipment query are included."
}

Rules:
- quantityTotal means the total quantity recorded.
- quantityAvailable means the quantity currently recorded as available.
- If quantityAvailable is greater than zero, report that quantity as available.
- If quantityAvailable is zero, report that none are currently available.
- Do not invent equipment or quantities absent from the data.
- If the database contains no records, say that no equipment records were found.
- If a user asks for a specific item and it is not listed, say you could not find it.
- Be clear that this data reflects the database at the time of this request.
- This data is read-only. Do not claim to change any records.
`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-OpenRouter-Title": "Schoolrow",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: `${instructions[userRole]}\n\n${inventoryContext}`,
            },
            ...safeHistory,
            {
              role: "user",
              content: message.trim(),
            },
          ],
          max_tokens: 1600,
          temperature: 0.3,
          stream: false,
        }),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("OpenRouter API error:", {
        status: response.status,
        message: data.error?.message || response.statusText,
      });

      return res.status(502).json({
        message:
          "The AI provider could not generate a response. Please try again later.",
      });
    }

    const choice = data.choices?.[0];
    const content = choice?.message?.content;

    const reply = Array.isArray(content)
      ? content
          .filter((part) => part && part.type === "text")
          .map((part) => part.text || "")
          .join("")
      : content;

    if (typeof reply !== "string" || !reply.trim()) {
      console.error("OpenRouter returned no text:", {
        model: data.model,
        finishReason: choice?.finish_reason,
        messageKeys: Object.keys(choice?.message || {}),
      });

      return res.status(502).json({
        message: "The AI returned no text answer. Please try again.",
      });
    }

    return res.status(200).json({
      reply: reply.trim(),
    });
  } catch (error) {
    if (error.name === "AbortError") {
      return res.status(504).json({
        message: "The AI took too long to respond. Please try again.",
      });
    }

    console.error("Schoolrow AI error:", error.message);

    return res.status(503).json({
      message:
        "Could not retrieve equipment data or connect to the AI provider. Please try again.",
    });
  } finally {
    clearTimeout(timeout);
  }
});

module.exports = router;
