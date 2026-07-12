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
# Streamlit gave you st.session_state for free. FastAPI doesn't have that
# concept — a "server" just handles requests, it doesn't inherently
# remember anything between them. For a simple single-user demo, a plain
# global variable is enough. (For multiple simultaneous users you'd need
# a session-id system or a database — a good "phase 2" upgrade, not needed
# to get started.)
conversation_chain = None


# --- Request/response shapes ---
# Pydantic models define what JSON a request body must look like.
# FastAPI uses this to validate incoming data automatically and to
# generate the /docs page.
class Question(BaseModel):
    question: str


@app.get("/health")
async def health():
    """Simple endpoint to check the server is alive."""
    return {"status": "ok"}


@app.post("/upload")
async def upload_pdfs(files: list[UploadFile] = File(...)):
    """
    Accepts one or more PDF files, processes them into a vector store,
    and builds a fresh conversation chain.
    """
    global conversation_chain

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

    return {
        "message": f"Processed {len(files)} file(s) into {len(text_chunks)} chunks.",
        "chunks": len(text_chunks),
    }


@app.post("/chat")
async def chat(payload: Question):
    """
    Accepts a question, runs it through the conversation chain, and
    returns the answer plus the full chat history.
    """
    global conversation_chain

    if conversation_chain is None:
        raise HTTPException(
            status_code=400,
            detail="Please upload and process PDFs first.",
        )

    try:
        response = conversation_chain.invoke({"question": payload.question})
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
async def reset():
    """Clears the current conversation, so a user can start over."""
    global conversation_chain
    conversation_chain = None
    return {"message": "Conversation reset."}
