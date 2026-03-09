const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEM_secrete);

/**
 * POST /ai/chat
 * Body: {
 *   messages: [{ role: "user"|"model", parts: [{ text: string }] }],  // chat history
 *   problem:  { title, description, visibletestCase },                  // context
 *   code:     string,                                                    // current editor code
 *   language: string,                                                    // active language
 * }
 *
 * Token-saving measures:
 *  - System instruction is kept short and explicit about output length.
 *  - Problem description is truncated to 500 chars if it's very long.
 *  - Test cases: only the first 2 visible cases are sent.
 *  - Code: only first 120 lines sent.
 *  - maxOutputTokens capped at 300 (~200-250 words).
 */
const aiChat = async (req, res) => {
  try {
    const { messages = [], problem = {}, code = "", language = "" } = req.body;

    // ── Build a compact context block ──────────────────────────────
    const truncate = (str, max) =>
      str && str.length > max ? str.slice(0, max) + "…" : str || "";

    const codeLines = code.split("\n").slice(0, 120).join("\n");
    const testCaseSummary = (problem.visibletestCase || [])
      .slice(0, 2)
      .map((tc, i) => `Example ${i + 1}: Input: ${tc.input} | Output: ${tc.output}`)
      .join("\n");

    const systemInstruction = `You are a concise coding assistant for the problem-solving platform LogicLab.
CONTEXT:
Problem: ${truncate(problem.title, 80)}
Description: ${truncate(problem.description, 500)}
Test cases:
${testCaseSummary || "N/A"}
Student's current ${language || "code"}:
\`\`\`
${truncate(codeLines, 2000)}
\`\`\`
RULES:
- Answer ONLY about this problem and the student's code.
- Be concise — max 120 words. Prefer bullet points.
- Give hints, not full solutions unless explicitly asked.
- No pleasantries, no filler.`;

    // ── Map messages to Gemini format ──
    // Gemini history MUST start with 'user' and alternate user/model.
    // We skip the initial model greeting and any messages that don't fit the pattern.
    const history = [];
    messages.slice(0, -1).forEach((msg) => {
      const role = msg.role === "user" ? "user" : "model";
      // Only push if it's a valid alternating sequence starting with user
      if (history.length === 0 && role !== "user") return; 
      history.push({
        role,
        parts: [{ text: msg.parts?.[0]?.text || "" }],
      });
    });

    // ── Call Gemini ───────────────────────────────────────────────
    const model = genAI.getGenerativeModel(
      {
        model: "gemini-1.5-flash",   // most stable free-tier model
        systemInstruction,
        generationConfig: {
          maxOutputTokens: 300,
          temperature: 0.5,
        },
      }
    );

    const chat = model.startChat({ history });

    const userMessage =
      messages[messages.length - 1]?.parts?.[0]?.text || "";

    if (!userMessage) return res.status(400).json({ message: "No message provided" });

    const result = await chat.sendMessage(userMessage);
    const response = result.response.text();

    res.status(200).json({ message: response });
  } catch (err) {
    console.error("AI Chat Error Details:", err);
    res.status(500).json({ 
      message: "AI unavailable right now. " + (err.message?.includes("429") ? "Too many requests. Please wait a minute." : "Please try again.") 
    });
  }
};

module.exports = { aiChat };
