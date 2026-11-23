import os
import uuid
import logging
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from agent import (
    extract_video_id,
    fetch_youtube_transcript,
    build_vector_store,
    get_groq_llm,
    analyze_video_content,
    generate_video_quiz,
    answer_video_query,
)

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("youtube-agent")

app = FastAPI(title="YouTube AI Agent API", version="1.0.0")

# Enable CORS for React frontend (both Vite dev port 5173 and standard web ports)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for active video sessions
# session_id -> { "video_id": str, "vector_store": FAISS, "transcript_text": str, "snippets": list }
active_sessions: Dict[str, Dict[str, Any]] = {}


class TestGroqRequest(BaseModel):
    groq_api_key: Optional[str] = None
    model_name: Optional[str] = "openai/gpt-oss-20b"


class ProcessVideoRequest(BaseModel):
    url_or_id: str
    groq_api_key: Optional[str] = None
    model_name: Optional[str] = "openai/gpt-oss-20b"
    manual_transcript: Optional[str] = None
    language: Optional[str] = "en"


class ChatRequest(BaseModel):
    session_id: str
    query: str
    groq_api_key: Optional[str] = None
    model_name: Optional[str] = "openai/gpt-oss-20b"
    chat_history: Optional[List[Dict[str, Any]]] = []
    language: Optional[str] = "en"


class QuizRequest(BaseModel):
    session_id: str
    groq_api_key: Optional[str] = None
    model_name: Optional[str] = "openai/gpt-oss-20b"
    num_questions: Optional[int] = 5
    language: Optional[str] = "en"


@app.get("/")
def serve_index():
    index_path = os.path.join(os.path.dirname(__file__), "static", "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "YouTube AI Agent API is running. Build frontend or open static/index.html."}

# Mount static folder if exists
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "YouTube AI Agent is operational"}


@app.post("/api/test-groq")
def test_groq_connection(req: TestGroqRequest):
    """
    Diagnostic endpoint to test connection to api.groq.com.
    """
    key = (req.groq_api_key or os.getenv("GROQ_API_KEY", "")).strip().strip('"').strip("'")
    if not key:
        return {"success": False, "message": "Groq API Key is missing. Please provide it."}

    try:
        from groq import Groq
        client = Groq(api_key=key, timeout=15.0, max_retries=2)
        resp = client.chat.completions.create(
            messages=[{"role": "user", "content": "Ping test: respond with 'OK'"}],
            model=req.model_name or "llama-3.1-8b-instant"
        )
        return {
            "success": True,
            "message": f"Connection verified! Model replied: {resp.choices[0].message.content.strip()}"
        }
    except Exception as e:
        err_str = str(e)
        logger.error(f"Groq connection test failed: {err_str}")
        return {
            "success": False,
            "message": f"Connection failed: {err_str}"
        }


@app.post("/api/process-video")
def process_video(req: ProcessVideoRequest):
    """
    1. Extracts video ID
    2. Fetches transcript or uses manual transcript
    3. Builds FAISS vector store with HuggingFaceEmbeddings
    4. Generates Overview (What was taught / Summary) using Groq LLM
    5. Generates Initial Quiz questions to test learning
    """
    raw_key = req.groq_api_key or os.getenv("GROQ_API_KEY") or ""
    api_key = raw_key.strip().strip('"').strip("'")
    if api_key.startswith("GROQ_API_KEY="):
        api_key = api_key.replace("GROQ_API_KEY=", "").strip().strip('"').strip("'")

    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="Groq API Key is required. Please set it in Settings or your .env file."
        )

    if not api_key.startswith("gsk_"):
        logger.warning(f"Groq API key does not start with 'gsk_': {api_key[:6]}...")

    video_id = extract_video_id(req.url_or_id)
    if not video_id:
        raise HTTPException(
            status_code=400,
            detail="Invalid YouTube URL or Video ID. Please provide a valid link."
        )

    full_transcript = ""
    snippets = []
    detected_lang = "unknown"

    # If user provided a manual transcript
    if req.manual_transcript and req.manual_transcript.strip():
        full_transcript = req.manual_transcript.strip()
        snippets = [{"text": full_transcript, "start": 0.0, "duration": 0.0, "timestamp": "00:00"}]
        detected_lang = "manual"
    else:
        try:
            full_transcript, snippets, detected_lang = fetch_youtube_transcript(video_id)
        except Exception as e:
            logger.error(f"Error fetching transcript: {e}")
            raise HTTPException(
                status_code=422,
                detail=f"Could not retrieve captions/transcript for this video: {str(e)}. You can paste the transcript manually in the Manual Input tab."
            )

    if not full_transcript.strip():
        raise HTTPException(
            status_code=422,
            detail="The video transcript was empty or could not be decoded."
        )

    try:
        # Build Vector Store with Hugging Face Embeddings
        vector_store = build_vector_store(snippets)
    except Exception as e:
        logger.error(f"Error building vector store: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error embedding transcript with Hugging Face: {str(e)}"
        )

    try:
        # Initialize Groq LLM (resolves dynamically to active model in user's account)
        llm = get_groq_llm(api_key=api_key, model_name=req.model_name)
        
        target_lang = req.language or "en"

        # 1. Analyze video content (What is taught) in requested language
        overview = analyze_video_content(llm, full_transcript, language=target_lang)

        # 2. Generate initial assessment quiz in requested language
        quiz = generate_video_quiz(llm, full_transcript, num_questions=5, language=target_lang)

    except Exception as e:
        logger.error(f"Error with Groq LLM: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error running Groq LLM inference: {str(e)}"
        )

    # Save session
    session_id = str(uuid.uuid4())
    active_sessions[session_id] = {
        "video_id": video_id,
        "vector_store": vector_store,
        "transcript_text": full_transcript,
        "snippets": snippets,
        "overview": overview,
        "quiz": quiz,
        "detected_lang": detected_lang
    }

    return {
        "session_id": session_id,
        "video_id": video_id,
        "language": detected_lang,
        "overview": overview,
        "quiz": quiz,
        "snippets_count": len(snippets),
        "transcript_preview": full_transcript[:1200] + ("..." if len(full_transcript) > 1200 else ""),
        "snippets": snippets[:150]  # First 150 snippets for display
    }


@app.post("/api/chat")
def chat(req: ChatRequest):
    """
    RAG Chat endpoint: Asks questions about the video content.
    """
    session = active_sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found. Please process a video first.")

    raw_key = req.groq_api_key or os.getenv("GROQ_API_KEY") or ""
    api_key = raw_key.strip().strip('"').strip("'")
    if api_key.startswith("GROQ_API_KEY="):
        api_key = api_key.replace("GROQ_API_KEY=", "").strip().strip('"').strip("'")
    if not api_key:
        raise HTTPException(status_code=400, detail="Groq API Key is required.")

    try:
        llm = get_groq_llm(api_key=api_key, model_name=req.model_name)
        vector_store = session["vector_store"]
        result = answer_video_query(
            llm=llm,
            vector_store=vector_store,
            query=req.query,
            chat_history=req.chat_history,
            language=req.language or "en"
        )
        return result
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")


@app.post("/api/generate-quiz")
def generate_quiz(req: QuizRequest):
    """
    Regenerates fresh quiz questions for the active video.
    """
    session = active_sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    raw_key = req.groq_api_key or os.getenv("GROQ_API_KEY") or ""
    api_key = raw_key.strip().strip('"').strip("'")
    if api_key.startswith("GROQ_API_KEY="):
        api_key = api_key.replace("GROQ_API_KEY=", "").strip().strip('"').strip("'")
    if not api_key:
        raise HTTPException(status_code=400, detail="Groq API Key is required.")

    try:
        llm = get_groq_llm(api_key=api_key, model_name=req.model_name)
        quiz = generate_video_quiz(
            llm=llm,
            transcript_text=session["transcript_text"],
            num_questions=req.num_questions or 5,
            language=req.language or "en"
        )
        return {"quiz": quiz}
    except Exception as e:
        logger.error(f"Quiz error: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating quiz: {str(e)}")


@app.get("/api/session/{session_id}/transcript")
def get_full_transcript(session_id: str):
    """
    Returns the complete list of transcript snippets with timestamps.
    """
    session = active_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return {
        "video_id": session["video_id"],
        "snippets": session["snippets"],
        "full_text": session["transcript_text"]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
