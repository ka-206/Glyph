# Glyph

A local PDF chat app built with React/Vite frontend and FastAPI backend.

## Prerequisites

- Python 3.10+
- Node.js 18+ / npm
- Internet access for Groq API calls

## Backend setup

1. Open a terminal and go to `backend/`
2. Create and activate a Python virtual environment:

   ```bash
   python -m venv .venv
   source .venv/bin/activate      # macOS/Linux
   .\.venv\Scripts\activate     # Windows PowerShell
   ```

3. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Copy `.env.example` to `.env` and set your Groq credentials:

   ```bash
   copy .env.example .env         # Windows
   cp .env.example .env           # macOS/Linux
   ```

5. Edit `.env`:

   ```env
   GROQ_API_KEY=your_groq_api_key_here
   GROQ_MODEL_NAME=llama-3.3-70b-versatile
   ```

## Frontend setup

1. Open a terminal and go to `frontend/`
2. Install frontend dependencies:

   ```bash
   npm install
   ```

## Running locally

1. Start the backend from `backend/`:

   ```bash
   uvicorn main:app --reload
   ```

2. Start the frontend from `frontend/`:

   ```bash
   npm run dev
   ```

3. Open the URL shown by Vite (usually `http://localhost:5173`).

## Notes

- The frontend expects the backend at `http://127.0.0.1:8000`.
- Upload limits are enforced in the backend:
  - Maximum 3 PDF files per upload
  - Maximum 10 MB per file
  - Maximum 30 MB total per upload
- Sessions are stored in memory and will reset when the backend restarts.

## Troubleshooting

- If the backend fails on startup, confirm `.env` exists and contains valid `GROQ_API_KEY` and `GROQ_MODEL_NAME`.
- If the frontend cannot reach the backend, check that `uvicorn` is running and the backend URL is correct.
