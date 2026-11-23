# 🎬 YouTube AI Agent

An intelligent YouTube assistant that breaks down video lessons, quizzes your comprehension, and answers questions using Groq LLM and Hugging Face vector embeddings.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Set Up API Key
Add your Groq API key in `.env` (or enter it directly in the app's Settings ⚙️):
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
```

### 3. Run the Application

#### Option A: Quick Run (Single Command)
```bash
python server.py
```
👉 Open browser: **`http://127.0.0.1:8000`**


#### Option B: Vite React Dev Server (`npm run dev`)
1. **Terminal 1 (Backend):**
   ```bash
   python server.py
   ```
2. **Terminal 2 (Frontend):**
   ```bash
   cd frontend
   npm run dev
   ```
👉 Open browser: **`http://localhost:5173`**

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

---

## 📁 Project Structure

```
youtubeAgent/
├── agent.py              # AI agent logic (Groq, RAG, FAISS, Transcripts)
├── server.py             # FastAPI backend & static file server
├── static/index.html     # Standalone React frontend
├── frontend/             # Modular Vite React app
├── requirements.txt      # Python dependencies
└── .env                  # Groq API key configuration
```
