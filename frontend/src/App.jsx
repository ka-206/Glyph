import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";

// The URL of your FastAPI backend. In development it's your local
// uvicorn server; when you deploy, you'll change this (see .env.example).
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// --- Small inline icons (kept dependency-free, same approach as the
// original hand-drawn glyph mark) ---

function GlyphMark({ active }) {
  return (
    <svg
      className={`glyph-mark ${active ? "active" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 2 L14.5 9.5 L22 12 L14.5 14.5 L12 22 L9.5 14.5 L2 12 L9.5 9.5 Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkleMark() {
  return (
    <svg
      className="sparkle-mark"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 2 L14.5 9.5 L22 12 L14.5 14.5 L12 22 L9.5 14.5 L2 12 L9.5 9.5 Z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      className="file-icon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M6 2h9l5 5v15H6V2z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M15 2v5h5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      className={`chevron ${open ? "open" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M22 2 L11 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M22 2 L15 22 L11 13 L2 9 Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// A small manuscript-style divider: a line, three dots, a line.
function Divider() {
  return (
    <div className="divider" aria-hidden="true">
      <span className="divider-line" />
      <span className="divider-dots">
        <i />
        <i />
        <i />
      </span>
      <span className="divider-line" />
    </div>
  );
}

// Fixed help button, bottom-right, with a small popover of usage tips.
function HelpButton() {
  const [open, setOpen] = useState(false);
  return (
    <div className="help-wrap">
      {open && (
        <div className="help-popover">
          <p>
            <strong>Glyph</strong> reads your PDFs and answers questions about them.
          </p>
          <ul>
            <li>Drag &amp; drop PDFs, or use "Choose PDFs"</li>
            <li>Click "Process documents" to index them</li>
            <li>↵ to send · Shift+↵ for a newline</li>
          </ul>
        </div>
      )}
      <button
        className="help-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label="Help"
        aria-expanded={open}
      >
        ?
      </button>
    </div>
  );
}

// Three-dot "thinking" indicator, shown in place of the assistant's
// reply while a /chat request is in flight.
function TypingDots() {
  return (
    <div className="message assistant typing">
      <span className="typing-dots" aria-label="Glyph is thinking">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

function formatTime(date) {
  if (!date) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function App() {
  // --- React state ---

  const [files, setFiles] = useState([]); // PDFs chosen but not yet uploaded
  const [processed, setProcessed] = useState(false); // has /upload succeeded?
  const [processing, setProcessing] = useState(false); // is /upload in flight?
  const [uploadStatus, setUploadStatus] = useState(""); // status/error text
  const [uploadError, setUploadError] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [zoneOpen, setZoneOpen] = useState(true); // upload zone expanded vs collapsed summary

  const [messages, setMessages] = useState([]); // [{role, content}, ...]
  const [messageTimes, setMessageTimes] = useState([]); // parallel array of Date, client-side only
  const [question, setQuestion] = useState(""); // current text input value
  const [asking, setAsking] = useState(false); // is /chat in flight?

  const [processProgress, setProcessProgress] = useState(0); // simulated 0-100 while indexing
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const fileInputRef = useRef(null);
  const chatAreaRef = useRef(null);
  const progressTimerRef = useRef(null);

  // Simulate indexing progress: the backend doesn't stream progress
  // events, so this eases toward 90% while the request is in flight and
  // is snapped to 100% right when the response comes back.
  useEffect(() => {
    if (processing) {
      setProcessProgress(4);
      progressTimerRef.current = setInterval(() => {
        setProcessProgress((p) => {
          if (p >= 90) return p;
          const increment = p < 50 ? 6 : p < 75 ? 3 : 1;
          return Math.min(p + increment, 90);
        });
      }, 350);
    } else if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }
    return () => clearInterval(progressTimerRef.current);
  }, [processing]);

  function scrollChatToBottom(behavior = "smooth") {
    const el = chatAreaRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }

  function handleChatScroll() {
    const el = chatAreaRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distanceFromBottom > 80);
  }

  // Auto-scroll on new messages / the typing indicator, but only if the
  // person is already near the bottom — don't yank them away from
  // history they've scrolled up to read.
  useEffect(() => {
    const el = chatAreaRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 150) {
      scrollChatToBottom();
    }
  }, [messages, asking]);

  // --- File selection / drag & drop ---

  function addFiles(newFiles) {
    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const additions = newFiles.filter((f) => !existingNames.has(f.name));
      return [...prev, ...additions];
    });
    setProcessed(false);
    setUploadStatus("");
    setZoneOpen(true);
  }

  function handleFileChange(e) {
    addFiles([...e.target.files]);
    // Allow re-selecting the same file later (e.g. after removing it).
    e.target.value = "";
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const dropped = [...e.dataTransfer.files].filter(
      (f) => f.type === "application/pdf"
    );
    if (dropped.length > 0) addFiles(dropped);
  }

  async function handleProcess() {
    if (files.length === 0) {
      setUploadError(true);
      setUploadStatus("Choose at least one PDF first.");
      return;
    }

    setProcessing(true);
    setUploadError(false);
    setUploadStatus("Reading and indexing your documents…");

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Upload failed.");
      }

      setProcessProgress(100);
      setProcessed(true);
      setUploadStatus(data.message);
      setZoneOpen(false); // collapse into the "N documents indexed" summary bar

      // Fresh document set = fresh conversation. Seed it with a short
      // greeting so the chat area isn't empty right after processing.
      const greeting = {
        role: "assistant",
        content: `I have ingested **${files.length} document${
          files.length > 1 ? "s" : ""
        }** — ${files.map((f) => f.name).join(", ")}. Ask me anything about their contents.`,
      };
      setMessages([greeting]);
      setMessageTimes([new Date()]);
    } catch (err) {
      setProcessProgress(0);
      setUploadError(true);
      setUploadStatus(err.message);
    } finally {
      setProcessing(false);
      // Let the 100% fill be visible for a beat before it disappears.
      setTimeout(() => setProcessProgress(0), 600);
    }
  }

  async function handleAsk(e) {
    e.preventDefault(); // stop the browser from doing a full page reload
    const trimmed = question.trim();
    if (!trimmed || asking) return;

    // Optimistically show the user's message immediately.
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setMessageTimes((prev) => [...prev, new Date()]);
    setQuestion("");
    setAsking(true);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Something went wrong.");
      }

      // Replace with the server's full history so it stays in sync,
      // but keep our client-side timestamps aligned to the new length.
      setMessages(data.chat_history);
      setMessageTimes((prev) => {
        const diff = data.chat_history.length - prev.length;
        if (diff <= 0) return prev.slice(0, data.chat_history.length);
        return [...prev, ...Array.from({ length: diff }, () => new Date())];
      });
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠ ${err.message}` },
      ]);
      setMessageTimes((prev) => [...prev, new Date()]);
    } finally {
      setAsking(false);
    }
  }

  function handleInputKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk(e);
    }
  }

  return (
    <div className="app">
      <div className="top-fixed">
        <div className="header">
          <GlyphMark active={processing || asking} />
          <h1>Glyph</h1>
        </div>
        <p className="tagline">Ask your documents anything.</p>
        <Divider />

        <div
          className={`upload-zone ${dragOver ? "drag-over" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {processed && (
            <button
              className={`zone-summary ${zoneOpen ? "open" : ""}`}
              onClick={() => setZoneOpen((o) => !o)}
              aria-expanded={zoneOpen}
            >
              <span>
                <span className="spark-char">✦</span> {files.length} document
                {files.length > 1 ? "s" : ""} indexed
              </span>
              <ChevronIcon open={zoneOpen} />
            </button>
          )}

          <div className={`zone-panel ${!processed || zoneOpen ? "open" : "closed"}`}>
            <div className="zone-panel-inner">
              <div className="upload-row centered">
                <p className="drop-text">
                  {files.length > 0 ? "Drop more PDFs, or" : "Drop PDF files here, or"}
                </p>
                <label className="upload-label">
                  Choose PDFs
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    multiple
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              {files.length > 0 && (
                <ul className="file-list">
                  {files.map((f, idx) => (
                    <li key={f.name}>
                      <span className="file-index">{String(idx + 1).padStart(2, "0")}</span>
                      <FileIcon />
                      <span className="file-name">{f.name}</span>
                    </li>
                  ))}
                </ul>
              )}

              {files.length > 0 && !processing && (
                <button
                  className="process-btn full"
                  onClick={handleProcess}
                  disabled={processing}
                >
                  Process documents
                </button>
              )}

              {(processing || processProgress > 0) && (
                <div className="progress-block">
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${processProgress}%` }} />
                  </div>
                  <div className="progress-row">
                    <span>Indexing documents…</span>
                    <span>{Math.round(processProgress)}%</span>
                  </div>
                </div>
              )}

              {uploadStatus && !processing && (
                <p className={`status-line ${uploadError ? "error" : ""}`}>{uploadStatus}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="chat-area-wrap">
        <div className="chat-area" ref={chatAreaRef} onScroll={handleChatScroll}>
          {messages.length === 0 && (
            <div className="empty-state">
              <SparkleMark />
              <p>{processed ? "Ask your first question below." : "// no documents indexed"}</p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`message ${m.role}`}>
              {m.role === "user" && messageTimes[i] && (
                <span className="msg-time">{formatTime(messageTimes[i])}</span>
              )}

              <div className="message-body">
                {m.role === "assistant" ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                ) : (
                  m.content
                )}
              </div>

              {m.role === "assistant" && messageTimes[i] && (
                <span className="msg-time msg-time-below">{formatTime(messageTimes[i])}</span>
              )}
            </div>
          ))}

          {asking && <TypingDots />}
        </div>

        {showScrollBtn && (
          <button
            className="scroll-bottom-btn"
            onClick={() => scrollChatToBottom()}
            aria-label="Scroll to latest message"
          >
            <ChevronIcon open={false} />
          </button>
        )}
      </div>

      <form className="input-row" onSubmit={handleAsk}>
        <textarea
          rows={1}
          placeholder={
            processed ? "Ask a question about your documents…" : "Index documents above to begin"
          }
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleInputKeyDown}
          disabled={!processed || asking}
        />
        <button
          type="submit"
          className="ask-btn"
          disabled={!processed || asking || !question.trim()}
        >
          Ask <SendIcon />
        </button>
      </form>
      <p className="input-hint">↵ SEND · SHIFT+↵ NEWLINE</p>

      <HelpButton />
    </div>
  );
}
