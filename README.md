# 🎬 YouTube AI Agent

An intelligent YouTube assistant that breaks down video lessons, quizzes your comprehension, and answers questions using Groq LLM and Hugging Face vector embeddings.

---

## 📁 Project Structure

```text
youtubeAgent/
├── backend/                  # FastAPI & AI Agent Backend
│   ├── agent.py              # AI agent logic (Groq, RAG, FAISS, Transcripts)
│   ├── server.py             # FastAPI REST API endpoints
│   └── requirements.txt      # Python dependencies
├── frontend/                 # React 18 + Vite Frontend UI
│   ├── src/
│   │   ├── App.jsx           # Main React component
│   │   ├── index.css         # Tailwind & Markdown styles
│   │   └── main.jsx          # React DOM entry point
│   ├── package.json          # Frontend dependencies & scripts
│   └── vite.config.js        # Vite build & API proxy configuration
├── .env.example              # Environment variables template
├── .gitignore                # Git exclusions
└── README.md                 # Project documentation
```

---

## 🚀 Quick Start

### 1. Backend Setup (Terminal 1)
```bash
cd backend
pip install -r requirements.txt
python server.py
```
Backend runs at `http://127.0.0.1:8000` (FastAPI JSON API).

### 2. Frontend Setup (Terminal 2)
```bash
cd frontend
npm install
npm run dev
```
👉 Open browser: **`http://localhost:5173`**

### 3. API Key Configuration
Add your Groq API key in `.env` in the root folder (or enter it directly in the UI Settings ⚙️):
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
```

---

## ✨ Features

- **Content Breakdown**: Outlines what was taught, core lessons, and takeaways with clean tables (no promotional fluff).
- **Chat With Video**: Grounded Q&A with exact `[MM:SS]` timestamp citations.
- **Agent Quiz**: 5 interactive MCQs with instant feedback and explanations.
- **Bilingual**: Instant toggle between English 🇬🇧 and Hindi 🇮🇳.
- **Rate-Limit Safe**: Smart transcript sampling to stay safely within Groq TPM limits.

---

## 🛠️ Tech Stack

- **LLM**: Groq Cloud (`openai/gpt-oss-20b`, `openai/gpt-oss-120b`, `qwen/qwen3.8-27b`)
- **Embeddings**: Hugging Face `sentence-transformers/all-MiniLM-L6-v2`
- **Vector Search**: In-memory FAISS
- **Backend**: FastAPI, LangChain, Uvicorn
- **Frontend**: React 18, Tailwind CSS, Marked.js
