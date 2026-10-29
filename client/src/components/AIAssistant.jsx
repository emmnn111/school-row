
import { useState } from "react";
import "./AIAssistant.css";

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const API_ROOT = API_BASE.endsWith("/api")
  ? API_BASE
  : `${API_BASE}/api`;

const suggestions = {
  student: [
    "What equipment is currently available?",
    "How do I borrow school equipment?",
    "What do the borrowing statuses mean?",
    "How can I check my borrowing status?",
    "How do I return borrowed equipment?",
    "What should I do if equipment is damaged?",
    "What information do I need to borrow equipment?",
    "Why is my borrowing request still pending?",
    "What should I do if my request is rejected?",
    "Can I request more than one equipment item?",
    "How can I check my expected return date?",
    "What should I do if I need to extend my borrowing period?",
  ],
  admin: [
    "Show me the available equipment.",
    "Which equipment has low stock?",
    "Which equipment is damaged?",
    "How do I add new equipment?",
    "How do I update equipment details?",
    "How can I manage borrowing requests?",
    "What do the borrowing statuses mean?",
    "How do I process equipment returns?",
  ],
};

export default function AIAssistant({ role = "student" }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const roleSuggestions = suggestions[role] || suggestions.student;

  function chooseSuggestion(question) {
    setMessage(question);
  }

  async function sendMessage(event) {
    event.preventDefault();

    const text = message.trim();

    if (!text || loading) return;

    const token = localStorage.getItem("schoolrowToken");

    if (!token) {
      setError("Please log in again to use Schoolrow AI.");
      return;
    }

    const history = messages
      .slice(-8)
      .map(({ role, content }) => ({ role, content }));

    setMessages((previous) => [
      ...previous,
      { role: "user", content: text },
    ]);

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_ROOT}/ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          history,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || `AI request failed (${response.status}).`
        );
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: data.reply || "No response was returned.",
        },
      ]);
    } catch (err) {
      setError(
        err.message || "The AI assistant is temporarily unavailable."
      );
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages([]);
    setError("");
  }

  return (
    <div className="schoolrow-ai">
      {open && (
        <section
          className="schoolrow-ai-panel"
          aria-label="Schoolrow AI assistant"
        >
          <header className="schoolrow-ai-header">
            <div className="schoolrow-ai-title">
              <div className="schoolrow-ai-avatar">AI</div>

              <div>
                <strong>Schoolrow AI</strong>
                <p>
                  {role === "admin"
                    ? "Admin Assistant"
                    : "Student Assistant"}
                </p>
              </div>
            </div>

            <div className="schoolrow-ai-actions">
              <button
                type="button"
                onClick={clearChat}
                className="schoolrow-ai-clear"
                title="Clear conversation"
                aria-label="Clear conversation"
              >
                ↻
              </button>

              <button
                type="button"
                className="schoolrow-ai-close"
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
              >
                ×
              </button>
            </div>
          </header>

          <div className="schoolrow-ai-messages" aria-live="polite">
            {messages.length === 0 && (
              <div className="schoolrow-ai-welcome">
                <div className="schoolrow-ai-welcome-icon">✦</div>

                <h3>Hi! How can I help?</h3>

                <p>
                  {role === "admin"
                    ? "Ask me about equipment management, borrowing requests, and returns."
                    : "Ask me about available equipment, borrowing requests, and returns."}
                </p>

                <div className="schoolrow-ai-suggestions">
                  {roleSuggestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => chooseSuggestion(question)}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                className={`schoolrow-ai-message ${item.role}`}
              >
                <span className="schoolrow-ai-message-label">
                  {item.role === "user" ? "You" : "Schoolrow AI"}
                </span>

                <p>{item.content}</p>
              </div>
            ))}

            {loading && (
              <div className="schoolrow-ai-thinking">
                <span className="schoolrow-ai-dot" />
                <span className="schoolrow-ai-dot" />
                <span className="schoolrow-ai-dot" />
                <span>Thinking...</span>
              </div>
            )}

            {error && (
              <div className="schoolrow-ai-error" role="alert">
                {error}
              </div>
            )}
          </div>

          <form className="schoolrow-ai-form" onSubmit={sendMessage}>
            <input
              type="text"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask Schoolrow AI..."
              maxLength={2000}
              aria-label="Your message"
              disabled={loading}
            />

            <button
              type="submit"
              disabled={loading || !message.trim()}
              aria-label="Send message"
            >
              ➤
            </button>
          </form>

          <p className="schoolrow-ai-note">
            AI can make mistakes. Verify important information with faculty.
          </p>
        </section>
      )}

      <button
        type="button"
        className="schoolrow-ai-toggle"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        aria-label={open ? "Close Schoolrow AI" : "Open Schoolrow AI"}
      >
        {open ? (
          "×"
        ) : (
          <>
            <span>✦</span> AI
          </>
        )}
      </button>
    </div>
  );
}
