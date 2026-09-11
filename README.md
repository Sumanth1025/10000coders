# CrisisIQ 🚨

**From chaos to actionable intelligence.**

CrisisIQ is an AI-powered crisis intelligence and emergency response platform. Citizens submit unstructured emergency reports, Gemini converts them into structured incident intelligence, and the backend priority engine ranks incidents for responders.

## Architecture

```text
Citizen report
     ↓
React + Vite
     ↓
FastAPI
     ↓
Gemini structured analysis
     ↓
SQLite + SQLAlchemy
     ↓
Priority Engine (P1–P4)
     ↓
Responder Dashboard
```

## Features

- AI incident classification
- Severity and 0–100 risk scoring
- People-affected and rescue-required flags
- Recommended emergency actions
- Backend P1/P2/P3/P4 priority engine
- Priority score for deterministic queue ordering
- Responder status workflow
- Search and priority/type/status filters
- Incident deletion
- Responsive dashboard
- Swagger API documentation

## Backend setup

From `backend/`:

```bash
python -m venv venv
```

Windows:

```bash
venv\Scripts\activate
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and put your Gemini API key in it:

```env
GEMINI_API_KEY=your_key_here
```

Start FastAPI:

```bash
uvicorn main:app --reload
```

API: `http://127.0.0.1:8000`
Swagger: `http://127.0.0.1:8000/docs`

## Frontend setup

From `frontend/`:

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal.

Optional frontend environment variable:

```env
VITE_API_URL=http://127.0.0.1:8000
```

## Important

Never commit `.env`, API keys, `crisis.db`, `venv`, or `node_modules` to GitHub. The repository `.gitignore` already excludes them.
