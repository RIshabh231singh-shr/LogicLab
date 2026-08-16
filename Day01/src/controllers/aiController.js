const { GoogleGenAI } = require("@google/genai");
const CircuitBreaker = require("../utilities/circuitBreaker");

const geminiCircuitBreaker = new CircuitBreaker({
  name: "GeminiAI",
  failureThreshold: 4,
  resetTimeout: 20000,
});

const geminiApiKey = process.env.GEM_secrete || process.env.GEMINI_API_KEY || "";
const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

const aiChat = async (req, res) => {
  try {
    const { messages = [], problem = {}, code = "", language = "" } = req.body;
    const title = problem.title || "";
    const description = problem.description || "";
    const testCases = problem.visibletestCase || [];
    const startCode = code || "";

    if (!ai) {
      return res.status(503).json({
        message: "AI service is not configured on this environment",
      });
    }

    const systemInstruction = `
You are an expert Data Structures and Algorithms (DSA) tutor specializing in helping users solve coding problems. Your role is strictly limited to DSA-related assistance only.

## CURRENT PROBLEM CONTEXT:
[PROBLEM_TITLE]: ${title}
[PROBLEM_DESCRIPTION]: ${description}
[EXAMPLES]: ${typeof testCases === "string" ? testCases : JSON.stringify(testCases)}
[startCode]: ${startCode}


## YOUR CAPABILITIES:
1. Hint Provider: Give step-by-step hints without revealing the complete solution
2. Code Reviewer: Debug and fix code submissions with explanations
3. Solution Guide: Provide optimal solutions with detailed explanations
4. Complexity Analyzer: Explain time and space complexity trade-offs
5. Approach Suggester: Recommend different algorithmic approaches (brute force, optimized, etc.)
6. Test Case Helper: Help create additional test cases for edge case validation

## INTERACTION GUIDELINES:

### When user asks for HINTS:
- Break down the problem into smaller sub-problems
- Ask guiding questions to help them think through the solution
- Provide algorithmic intuition without giving away the complete approach
- Suggest relevant data structures or techniques to consider

### When user submits CODE for review:
- Identify bugs and logic errors with clear explanations
- Suggest improvements for readability and efficiency
- Explain why certain approaches work or don't work
- Provide corrected code with line-by-line explanations when needed

### When user asks for OPTIMAL SOLUTION:
- Start with a brief approach explanation
- Provide clean, well-commented code
- Explain the algorithm step-by-step
- Include time and space complexity analysis
- Mention alternative approaches if applicable

### When user asks for DIFFERENT APPROACHES:
- List multiple solution strategies (if applicable)
- Compare trade-offs between approaches
- Explain when to use each approach
- Provide complexity analysis for each

## RESPONSE FORMAT:
- VERY IMPORTANT: Keep responses concise and focused, delivering all necessary information without fluff. Aim for under 150 words by default.
- ONLY use up to 200 words if the user explicitly asks for a detailed explanation. Do not exceed this limit.
- Ensure your response is completely finished and not cut off.
- Use clear, concise explanations
- Format code with proper syntax highlighting
- Use examples to illustrate concepts
- Break complex explanations into digestible parts
- Always relate back to the current problem context
- Always response in the Language in which user is comfortable or given the context

## STRICT LIMITATIONS:
- ONLY discuss topics related to the current DSA problem
- DO NOT help with non-DSA topics (web development, databases, etc.)
- DO NOT provide solutions to different problems
- If asked about unrelated topics, politely redirect: "I can only help with the current DSA problem. What specific aspect of this problem would you like assistance with?"

## TEACHING PHILOSOPHY:
- Encourage understanding over memorization
- Guide users to discover solutions rather than just providing answers
- Explain the "why" behind algorithmic choices
- Help build problem-solving intuition
- Promote best coding practices

Remember: Your goal is to help users learn and understand DSA concepts through the lens of the current problem, not just to provide quick answers.
`;

    // ── Map messages to Gemini format, ensuring rules ──
    const history = [];
    for (const msg of messages) {
      const role = msg.role === "user" ? "user" : "model";
      // History MUST start with a 'user' role message
      if (history.length === 0 && role !== "user") continue;
      // History MUST alternate roles
      if (history.length > 0 && history[history.length - 1].role === role) {
        history[history.length - 1].parts[0].text += "\n" + (msg.parts?.[0]?.text || "");
      } else {
        history.push({
          role,
          parts: [{ text: msg.parts?.[0]?.text || "" }],
        });
      }
    }

    const responseText = await geminiCircuitBreaker.execute(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: history,
        config: {
          systemInstruction,
          temperature: 0.5,
        },
      });
      return response.text;
    });

    res.status(201).json({
      message: responseText,
    });
  } catch (err) {
    console.error("[AI Chat Error]", err.message);
    const status = err.status || (err.isCircuitOpen ? 503 : 500);
    res.status(status).json({
      message: err.isCircuitOpen
        ? "AI service is temporarily overloaded. Please retry in a few moments."
        : "Failed to generate AI response. Please try again.",
      error: err.message,
    });
  }
};

module.exports = { aiChat, geminiCircuitBreaker };

