import React, { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import axiosClient from "../utility/axios";
import { Send, Bot, User, Sparkles, Loader2 } from "lucide-react";

/**
 * ChatAi — context-aware AI assistant for LogicLab.
 *
 * Props:
 *  problem         — full problem object (title, description, visibletestCase)
 *  currentCode     — the code currently in the editor for the active language
 *  currentLanguage — "javascript" | "java" | "cpp"
 *
 * Token-saving: we only send the last 6 messages of history (not the full log),
 * and the backend further truncates description / code before calling Gemini.
 */
function ChatAi({ problem, currentCode = "", currentLanguage = "javascript" }) {
  const [messages, setMessages] = useState([
    {
      role: "model",
      parts: [
        {
          text: "Hi! I'm your LogicLab AI. I can see your current code and the problem. Ask me for a hint, walkthrough, or debugging help!",
        },
      ],
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm({ mode: "onChange" });

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const onSubmit = async (data) => {
    const userMessage = data.message;

    const newMsg = { role: "user", parts: [{ text: userMessage }] };
    setMessages((prev) => [...prev, newMsg]);
    reset();
    setIsTyping(true);

    // Only send last 6 messages (3 pairs) to save tokens
    const recentHistory = [...messages, newMsg].slice(-6);

    try {
      const response = await axiosClient.post("/ai/chat", {
        messages: recentHistory,
        problem: {
          title: problem?.title,
          description: problem?.description,
          // Only first 2 visible test cases (truncated in backend too)
          visibletestCase: problem?.visibletestCase?.slice(0, 2) || [],
        },
        code: currentCode,
        language: currentLanguage,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          parts: [{ text: response.data.message }],
        },
      ]);
    } catch (error) {
      console.error("AI Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          parts: [{ text: "AI unavailable right now. Please try again." }],
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Context badge */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-slate-900/30 shrink-0">
        <Sparkles size={12} className="text-indigo-400" />
        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
          Reading your {currentLanguage} code • {problem?.title || "problem"}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            <div
              className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                  msg.role === "user"
                    ? "bg-indigo-500/20 text-indigo-400"
                    : "vibrant-gradient text-white"
                }`}
              >
                {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div
                className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-indigo-500 text-white rounded-tr-none"
                    : "glass border border-white/10 text-slate-200 rounded-tl-none"
                }`}
              >
                {msg.parts[0].text}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-lg vibrant-gradient flex items-center justify-center text-white">
                <Bot size={16} />
              </div>
              <div className="glass border border-white/10 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 pt-0 shrink-0">
        <form onSubmit={handleSubmit(onSubmit)} className="relative group">
          <div className="absolute -inset-0.5 vibrant-gradient rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-500"></div>
          <div className="relative flex items-center glass border border-white/10 rounded-2xl overflow-hidden p-1">
            <input
              placeholder="Ask for a hint or debugging help..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-200 px-4 py-3 placeholder:text-slate-500"
              {...register("message", { required: true, minLength: 2 })}
              autoComplete="off"
            />
            <button
              type="submit"
              className={`p-2.5 rounded-xl transition-all mr-1 ${
                isValid && !isTyping
                  ? "vibrant-gradient text-white shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95"
                  : "bg-white/5 text-slate-500 cursor-not-allowed"
              }`}
              disabled={!isValid || isTyping}
            >
              {isTyping ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChatAi;
