import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";

// The URL of your FastAPI backend. In development it's your local
// uvicorn server; when you deploy, you'll change this (see .env.example).
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// A small hand-drawn "glyph" mark used as the loading indicator.
// It's just an SVG shape — React lets you write SVG directly in JSX.
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

export default function App() {
  // --- React state ---
  // `useState` gives you a variable that, when changed via its setter
  // function (e.g. setFiles), causes React to re-render the UI with the
  // new value. This replaces what st.session_state did in Streamlit.

  const [files, setFiles] = useState([]); // PDFs chosen but not yet uploaded
  const [processed, setProcessed] = useState(false); // has /upload succeeded?
  const [processing, setProcessing] = useState(false); // is /upload in flight?
  const [uploadStatus, setUploadStatus] = useState(""); // status/error text
  const [uploadError, setUploadError] = useState(false);

  const [messages, setMessages] = useState([]); // [{role, content}, ...]
  const [question, setQuestion] = useState(""); // current text input value
  const [asking, setAsking] = useState(false); // is /chat in flight?

  const fileInputRef = useRef(null);

  // --- Handlers ---

  function handleFileChange(e) {
    // e.target.files is a browser FileList; spread it into a normal array
    setFiles([...e.target.files]);
    setProcessed(false);
    setUploadStatus("");
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

    // FormData is how browsers send files over HTTP — same shape as
    // an HTML <form> file upload. FastAPI's `files: list[UploadFile]`
    // parameter expects the field name "files", repeated per file.
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
        // Note: no Content-Type header here — the browser sets the
        // correct multipart boundary automatically for FormData.
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Upload failed.");
      }

      setProcessed(true);
      setUploadStatus(data.message);
      setMessages([]); // fresh document set = fresh conversation
    } catch (err) {
      setUploadError(true);
      setUploadStatus(err.message);
    } finally {
      setProcessing(false);
    }
  }

  async function handleAsk(e) {
    e.preventDefault(); // stop the browser from doing a full page reload
    const trimmed = question.trim();
    if (!trimmed || asking) return;

    // Optimistically show the user's message immediately, before the
    // server responds — makes the UI feel instant.
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
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

      // Replace with the server's full history so it stays perfectly
      // in sync with the backend's memory.
      setMessages(data.chat_history);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠ ${err.message}` },
      ]);
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="app">
      <div className="header">
        <GlyphMark active={processing || asking} />
        <h1>Glyph</h1>
      </div>
      <p className="tagline">Ask your documents anything.</p>

      <div className="upload-zone">
        <div className="upload-row">
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

          <button
            className="process-btn"
            onClick={handleProcess}
            disabled={processing || files.length === 0}
          >
            {processing ? "Processing…" : "Process documents"}
          </button>
        </div>

        {files.length > 0 && (
          <ul className="file-list">
            {files.map((f) => (
              <li key={f.name}>{f.name}</li>
            ))}
          </ul>
        )}

        {uploadStatus && (
          <p className={`status-line ${uploadError ? "error" : ""}`}>
            {uploadStatus}
          </p>
        )}
      </div>

      <div className="chat-area">
        {messages.length === 0 && (
          <p className="empty-state">
            {processed
              ? "Documents are indexed. Ask your first question below."
              : "Upload and process a PDF to begin."}
          </p>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>
            {m.role === "assistant" ? (
              // ReactMarkdown converts markdown text (like "**bold**" or
              // "| a | b |" table syntax) into real HTML elements
              // (<strong>, <table>, <ul>, etc). remarkGfm adds support
              // for GitHub-style tables, which is what the LLM tends to
              // output for tabular data.
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {m.content}
              </ReactMarkdown>
            ) : (
              m.content
            )}
          </div>
        ))}
      </div>

      <form className="input-row" onSubmit={handleAsk}>
        <input
          type="text"
          placeholder="Ask a question about your PDFs…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={!processed || asking}
        />
        <button
          type="submit"
          className="ask-btn"
          disabled={!processed || asking || !question.trim()}
        >
          Ask
        </button>
      </form>
    </div>
  );
}
