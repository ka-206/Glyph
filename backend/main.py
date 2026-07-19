"""
This is the FastAPI app. Think of it as a set of "doors" (endpoints) that
a frontend (React, curl, Postman, whatever) can knock on.

Each door is defined with a decorator like @app.post("/upload") — this
tells FastAPI "when someone sends a POST request to /upload, run this
function."

Run this locally with:
    uvicorn main:app --reload

Then visit http://127.0.0.1:8000/docs — FastAPI auto-generates an
interactive API tester for you. This is one of the best ways to learn
what your API does before you even touch the frontend.
"""

import time
import uuid
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from rag import (
    get_pdf_text,
    get_text_chunks,
    get_vector_store,
    get_conversation_chain,
)

app = FastAPI(title="PDF Chat API")

# --- CORS ---
# Your React frontend will run on a different origin (e.g. localhost:5173)
# than your FastAPI backend (e.g. localhost:8000). Browsers block requests
# between different origins by default for security. CORSMiddleware tells
# the browser "it's OK, allow this." allow_origins=["*"] is fine for
# development; tighten it to your real frontend URL in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- State ---
# A single global `conversation_chain` variable would mean every visitor
# shares the same documents and chat history — fine for a solo local demo,
# but broken the moment two people use the deployed app at once (one
# person's questions would get answered from someone else's PDFs).
#
# Instead, each browser session gets its own entry in this dict, keyed by
# a session_id the frontend generates on upload and sends back with every
# /chat and /reset call. This is still in-memory (lost on server restart —
# see the FAISS-persistence note in rag.py if you want that to survive
# restarts too), but it's now isolated per user instead of shared.
sessions: dict[str, dict] = {}
# Each entry: {"chain": ConversationalRetrievalChain, "last_used": float}

# How long an idle session is kept before it's swept away, so memory
# doesn't grow forever from people who close the tab without hitting
# "End chat". Not a hard timeout on activity — every /chat call refreshes
# last_used, so an active conversation is never evicted mid-use.
SESSION_TTL_SECONDS = 60 * 60  # 1 hour


def _cleanup_sessions() -> None:
    """Drop sessions that have been idle longer than SESSION_TTL_SECONDS."""
    now = time.time()
    stale_ids = [
        sid
        for sid, data in sessions.items()
        if now - data["last_used"] > SESSION_TTL_SECONDS
    ]
    for sid in stale_ids:
        del sessions[sid]


# --- Request/response shapes ---
# Pydantic models define what JSON a request body must look like.
# FastAPI uses this to validate incoming data automatically and to
# generate the /docs page.
class Question(BaseModel):
    session_id: str
    question: str


class SessionRequest(BaseModel):
    session_id: str


@app.get("/health")
async def health():
    """Simple endpoint to check the server is alive."""
    return {"status": "ok"}


@app.post("/upload")
async def upload_pdfs(files: list[UploadFile] = File(...)):
    """
    Accepts one or more PDF files, processes them into a vector store,
    and builds a fresh conversation chain under a brand-new session_id.

    Each call to /upload starts a new session — processing documents is
    already "start fresh" from the user's point of view, so there's no
    need to accept an existing session_id here.
    """
    _cleanup_sessions()

    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    # UploadFile wraps the uploaded file; .file gives the raw file-like
    # object that PdfReader expects.
    raw_text = get_pdf_text([f.file for f in files])

    if not raw_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Could not extract any text from the uploaded PDF(s).",
        )

    text_chunks = get_text_chunks(raw_text)
    vector_store = get_vector_store(text_chunks)
    conversation_chain = get_conversation_chain(vector_store)

    session_id = uuid.uuid4().hex
    sessions[session_id] = {"chain": conversation_chain, "last_used": time.time()}

    return {
        "session_id": session_id,
        "message": f"Processed {len(files)} file(s) into {len(text_chunks)} chunks.",
        "chunks": len(text_chunks),
    }


@app.post("/chat")
async def chat(payload: Question):
    """
    Accepts a session_id + question, runs it through that session's
    conversation chain, and returns the answer plus the full chat history.
    """
    _cleanup_sessions()

    session = sessions.get(payload.session_id)
    if session is None:
        raise HTTPException(
            status_code=400,
            detail="Session not found or expired. Please upload and process PDFs again.",
        )

    session["last_used"] = time.time()

    try:
        response = session["chain"].invoke({"question": payload.question})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # response["chat_history"] is a list of LangChain message objects
    # (the same ones chat_ui.py used to loop over). We convert them to
    # plain dictionaries here because JSON doesn't know what a LangChain
    # message object is — only plain data types (str, int, list, dict).
    history = [
        {"role": "user" if m.type == "human" else "assistant", "content": m.content}
        for m in response["chat_history"]
    ]

    return {"answer": response["answer"], "chat_history": history}


@app.post("/reset")
async def reset(payload: Optional[SessionRequest] = None):
    """
    Clears one session so its user can start over. Accepts an optional
    body so a stray /reset call without a session_id (e.g. right after
    page load, before anything's been processed) doesn't error out.
    """
    if payload is not None:
        sessions.pop(payload.session_id, None)
    return {"message": "Conversation reset."}
