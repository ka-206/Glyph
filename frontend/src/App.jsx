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

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 2c1.66 0 3 1.34 3 3v6c0 1.66-1.34 3-3 3s-3-1.34-3-3V5c0-1.66 1.34-3 3-3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M19 11v2c0 3.31-2.69 6-6 6s-6-2.69-6-6v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 19v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 23h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function PrintIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M6 8V4h12v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 8h12v8H6V8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 16V18H15V16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M6 6l12 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const [speechActive, setSpeechActive] = useState(false);
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [printing, setPrinting] = useState(false);

  const [processProgress, setProcessProgress] = useState(0); // simulated 0-100 while indexing
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const fileInputRef = useRef(null);
  const chatAreaRef = useRef(null);
  const progressTimerRef = useRef(null);
  const recognitionRef = useRef(null);

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

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ");
      setQuestion((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setSpeechActive(false);
    };

    recognition.onerror = () => {
      setSpeechActive(false);
    };

    recognition.onend = () => {
      setSpeechActive(false);
    };

    recognitionRef.current = recognition;
    setSpeechAvailable(true);
  }, []);

  function handleSpeechToggle() {
    if (!recognitionRef.current) return;

    if (speechActive) {
      recognitionRef.current.stop();
      setSpeechActive(false);
      return;
    }

    try {
      recognitionRef.current.start();
      setSpeechActive(true);
    } catch (err) {
      setSpeechActive(false);
    }
  }

  async function handleEndChat() {
    try {
      await fetch(`${API_URL}/reset`, { method: "POST" });
    } catch (err) {
      console.warn("Failed to reset backend state", err);
    }

    setFiles([]);
    setProcessed(false);
    setProcessing(false);
    setUploadStatus("");
    setUploadError(false);
    setZoneOpen(true);
    setMessages([]);
    setMessageTimes([]);
    setQuestion("");
    setAsking(false);
    setProcessProgress(0);
    setShowPdfDialog(false);

    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
  }

  function parseInlineMarkdown(text) {
    const segments = [];
    let remaining = text;
    const boldRegex = /(\*\*([^*]+)\*\*)/;

    while (remaining.length) {
      const match = remaining.match(boldRegex);
      if (!match) {
        segments.push({ text: remaining });
        break;
      }

      const [fullMatch, , innerText] = match;
      const index = match.index || 0;
      if (index > 0) {
        segments.push({ text: remaining.slice(0, index) });
      }

      segments.push({ text: innerText, bold: true });
      remaining = remaining.slice(index + fullMatch.length);
    }

    return segments;
  }

  function parseMarkdownToPdf(content) {
    const lines = content.split("\n");
    const body = [];
    let tableLines = [];
    let listItems = [];

    const flushTable = () => {
      if (!tableLines.length) return;
      const rows = tableLines
        .filter(Boolean)
        .map((line) => line.replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()));

      if (rows.length >= 2 && rows[1].every((cell) => /^:?-+:?$/.test(cell))) {
        const header = rows[0];
        const bodyRows = rows.slice(2);
        const tableBody = [
          header.map((cell) => ({ text: cell || "", style: "tableHeader" })),
          ...bodyRows.map((row) => row.map((cell) => ({ text: cell || "", style: "tableCell" }))),
        ];
        body.push({
          table: { widths: header.map(() => "*"), body: tableBody },
          layout: "lightHorizontalLines",
          margin: [0, 6, 0, 12],
        });
      }
      tableLines = [];
    };

    const flushList = () => {
      if (!listItems.length) return;
      body.push({ ul: listItems, margin: [0, 0, 0, 10] });
      listItems = [];
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        tableLines.push(trimmed);
        continue;
      }

      if (tableLines.length) {
        flushTable();
      }

      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const itemText = trimmed.slice(2).trim();
        listItems.push({ text: parseInlineMarkdown(itemText) });
        continue;
      }

      if (listItems.length) {
        flushList();
      }

      if (!trimmed) {
        body.push({ text: "", margin: [0, 4, 0, 4] });
        continue;
      }

      body.push({ text: parseInlineMarkdown(trimmed), margin: [0, 0, 0, 6] });
    }

    if (tableLines.length) {
      flushTable();
    }
    flushList();
    return body;
  }

  async function handlePrintPdf() {
    if (printing) return;
    setPrinting(true);

    try {
      const fileNames = files.length ? files.map((f) => f.name).join(", ") : "No indexed PDF files.";
      const content = [
        { text: "Glyph PDF Export", style: "header" },
        { text: `Generated: ${new Date().toLocaleString()}`, style: "subheader" },
        { text: `Indexed files: ${fileNames}
`, margin: [0, 0, 0, 10] },
        ...messages.flatMap((message) => [
          { text: `${message.role === "user" ? "You" : "Glyph"}:`, style: "messageRole" },
          ...parseMarkdownToPdf(message.content),
        ]),
      ];

      const docDefinition = {
        content,
        styles: {
          header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
          subheader: { fontSize: 10, italics: true, margin: [0, 0, 0, 12] },
          messageRole: { bold: true, margin: [0, 10, 0, 4] },
          tableHeader: { bold: true, fillColor: "#f2f2f2", margin: [0, 4, 0, 4] },
          tableCell: { margin: [0, 4, 0, 4] },
        },
        defaultStyle: {
          fontSize: 11,
          lineHeight: 1.4,
        },
        pageMargins: [40, 40, 40, 40],
      };

      const pdfMakeInstance = window.pdfMake;
      if (!pdfMakeInstance) {
        throw new Error("pdfMake is not available. Make sure the CDN scripts are loaded.");
      }

      const blob = await new Promise((resolve, reject) => {
        pdfMakeInstance.createPdf(docDefinition).getBlob((result) => {
          if (result instanceof Blob) resolve(result);
          else reject(new Error("Failed to generate PDF blob."));
        });
      });

      const url = URL.createObjectURL(blob);
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
      setPdfBlobUrl(url);
      setShowPdfDialog(true);
    } catch (err) {
      console.error("PDF generation failed", err);
    } finally {
      setPrinting(false);
    }
  }

  function handleDragOver(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk(e);
    }
  }

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

        <div className="top-actions">
          <button
            type="button"
            className="top-action-btn"
            onClick={handlePrintPdf}
            disabled={printing}
          >
            <PrintIcon /> {printing ? "Preparing PDF…" : "Print PDF"}
          </button>
          <button type="button" className="top-action-btn danger" onClick={handleEndChat}>
            End chat
          </button>
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
        {speechAvailable && (
          <button
            type="button"
            className={`mic-btn ${speechActive ? "active" : ""}`}
            onClick={handleSpeechToggle}
            disabled={!processed || asking}
            aria-label={speechActive ? "Stop speech input" : "Start speech input"}
          >
            <MicIcon />
          </button>
        )}

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

      {showPdfDialog && (
        <div className="pdf-dialog-backdrop">
          <div className="pdf-dialog" role="dialog" aria-modal="true">
            <button
              type="button"
              className="dialog-close"
              aria-label="Close PDF ready dialog"
              onClick={() => setShowPdfDialog(false)}
            >
              <CloseIcon />
            </button>
            <p className="dialog-title">Your PDF is ready.</p>
            <p className="dialog-text">Download your export using the button below.</p>
            <div className="dialog-actions">
              <a className="download-btn" href={pdfBlobUrl} download="glyph-export.pdf">
                Download PDF
              </a>
              <button
                type="button"
                className="dialog-secondary"
                onClick={() => setShowPdfDialog(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <HelpButton />
    </div>
  );
}
