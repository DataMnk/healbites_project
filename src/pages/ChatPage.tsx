import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "../context/SessionContext";
import supabase from "../supabase";

// ── Types ──────────────────────────────────────────────────────────────────

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
};

// ── Constants ──────────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  "Can I swap chicken for tuna on Wednesday?",
  "Why was this meal chosen for me?",
  "Snack ideas for sweet cravings",
  "Explain why my plan limits sodium",
];

const DAILY_LIMIT = 5;

// ── Component ──────────────────────────────────────────────────────────────

const ChatPage = () => {
  const { session } = useSession();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [tier, setTier] = useState<string>("basic");
  const [messagesRemaining, setMessagesRemaining] = useState<number>(DAILY_LIMIT);
  const [limitReached, setLimitReached] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Load tier + history on mount ─────────────────────────────────────────
  useEffect(() => {
    if (!session) return;

    const today = new Date().toISOString().split("T")[0];

    Promise.all([
      supabase
        .from("subscriptions")
        .select("tier")
        .eq("user_id", session.user.id)
        .maybeSingle(),
      supabase
        .from("chat_usage")
        .select("message_count")
        .eq("user_id", session.user.id)
        .eq("message_date", today)
        .maybeSingle(),
    ]).then(([subResult, usageResult]) => {
      const userTier = subResult.data?.tier ?? "basic";
      setTier(userTier);

      const count = usageResult.data?.message_count ?? 0;
      const remaining = Math.max(0, DAILY_LIMIT - count);
      setMessagesRemaining(remaining);
      if (userTier === "basic" && remaining === 0) setLimitReached(true);

      // Premium: load most recent session history
      if (userTier === "premium") {
        supabase
          .from("chat_sessions")
          .select("id, messages")
          .eq("user_id", session.user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle()
          .then(({ data }) => {
            if (data && Array.isArray(data.messages) && data.messages.length > 0) {
              setSessionId(data.id);
              setMessages(data.messages as ChatMessage[]);
            }
            setLoadingHistory(false);
          });
      } else {
        setLoadingHistory(false);
      }
    });
  }, [session?.user.id]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || limitReached) return;

    // Optimistically add user message
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    const { data, error } = await supabase.functions.invoke("nutrition_chat", {
      body: { message: text, chat_session_id: sessionId },
    });

    setSending(false);

    if (error || !data?.response) {
      const errMsg =
        (error as any)?.context?.error ||
        error?.message ||
        "Something went wrong. Please try again.";

      // Check if it's a rate limit error
      if (errMsg.includes("daily message limit")) {
        setLimitReached(true);
        setMessagesRemaining(0);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ ${errMsg}`,
        },
      ]);
      return;
    }

    // Update session ID (first message creates a new session)
    if (data.chat_session_id && !sessionId) {
      setSessionId(data.chat_session_id);
    }

    // Update remaining count for Basic users
    if (data.messages_remaining !== null && data.messages_remaining !== undefined) {
      setMessagesRemaining(data.messages_remaining);
      if (data.messages_remaining === 0) setLimitReached(true);
    }

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: data.response },
    ]);

    inputRef.current?.focus();
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loadingHistory) {
    return <div className="app-loading">Loading chat…</div>;
  }

  return (
    <div className="app-page chat-page">
      <div className="chat-inner">
        {/* ── Header ── */}
        <div className="chat-header">
          <div className="chat-header-top">
            <Link to="/dashboard" className="chat-back-link">
              ← Dashboard
            </Link>
            {tier === "basic" && (
              <span
                className={`chat-limit-badge${limitReached ? " exhausted" : ""}`}
              >
                {messagesRemaining}/{DAILY_LIMIT} messages left today
              </span>
            )}
            {tier === "premium" && (
              <span className="chat-premium-badge">✨ Premium</span>
            )}
          </div>
          <h1 className="chat-title">Nutrition Chat</h1>
          <p className="chat-subtitle">
            Ask me anything about your meal plan or dietary health
          </p>
        </div>

        {/* ── Messages ── */}
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-empty">
              <span className="chat-empty-icon">🥦</span>
              <p className="chat-empty-title">Hi, I'm your nutrition assistant!</p>
              <p className="chat-empty-sub">
                Ask me anything about your meal plan, food choices, or dietary
                health. I'm here to help you understand the{" "}
                <em>why</em> behind your nutrition.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`chat-bubble-wrap ${msg.role}`}
            >
              {msg.role === "assistant" && (
                <span className="chat-avatar">🥗</span>
              )}
              <div className={`chat-bubble ${msg.role}`}>
                <p>{msg.content}</p>
              </div>
            </div>
          ))}

          {sending && (
            <div className="chat-bubble-wrap assistant">
              <span className="chat-avatar">🥗</span>
              <div className="chat-bubble assistant chat-typing-bubble">
                <span className="chat-dot" />
                <span className="chat-dot" />
                <span className="chat-dot" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Bottom section ── */}
        <div className="chat-bottom">
          {/* Quick prompts */}
          {!limitReached && (
            <div className="chat-quick-prompts">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  className="chat-quick-prompt"
                  onClick={() => handleQuickPrompt(prompt)}
                  disabled={sending}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Limit reached banner */}
          {limitReached && tier === "basic" && (
            <div className="chat-limit-banner">
              You've used all 5 messages for today. Come back tomorrow, or
              upgrade to Premium for unlimited chat.
            </div>
          )}

          {/* Input row */}
          <div className="chat-input-row">
            <input
              ref={inputRef}
              className="chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                limitReached
                  ? "Daily limit reached"
                  : "Ask your nutrition assistant…"
              }
              disabled={sending || limitReached}
            />
            <button
              className="chat-send-btn"
              onClick={handleSend}
              disabled={sending || !input.trim() || limitReached}
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
