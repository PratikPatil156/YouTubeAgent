import os
import re
import json
from typing import List, Dict, Any, Tuple, Optional
from urllib.parse import urlparse, parse_qs

from youtube_transcript_api import (
    YouTubeTranscriptApi,
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable,
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.documents import Document


def extract_video_id(url_or_id: str) -> str:
    """
    Extracts the 11-character YouTube video ID from various YouTube URL formats or plain ID.
    Supports:
    - https://www.youtube.com/watch?v=VIDEO_ID
    - https://youtu.be/VIDEO_ID
    - https://www.youtube.com/shorts/VIDEO_ID
    - https://www.youtube.com/embed/VIDEO_ID
    - Plain 11-char ID
    """
    if not url_or_id:
        return ""
    text = url_or_id.strip()

    # If it's already an 11-character ID
    if len(text) == 11 and re.match(r"^[a-zA-Z0-9_-]{11}$", text):
        return text

    patterns = [
        r"(?:v=|\/v\/|youtu\.be\/|\/embed\/|\/shorts\/)([a-zA-Z0-9_-]{11})",
        r"[\?&]v=([a-zA-Z0-9_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1)

    return ""


def format_timestamp(seconds: float) -> str:
    """Convert seconds into MM:SS or HH:MM:SS format."""
    total_sec = int(seconds)
    hours = total_sec // 3600
    minutes = (total_sec % 3600) // 60
    secs = total_sec % 60
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


def fetch_youtube_transcript(
    video_id: str,
    preferred_languages: Optional[List[str]] = None
) -> Tuple[str, List[Dict[str, Any]], str]:
    """
    Fetches transcript for a given YouTube video ID.
    Works across youtube-transcript-api v1.0+ and older releases.
    Returns:
        (full_text, formatted_snippets, detected_language)
    """
    if preferred_languages is None:
        preferred_languages = ["en", "hi", "en-US", "en-GB", "es", "fr"]

    raw_snippets = []
    detected_lang = "en"

    # Attempt fetching using modern v1.2+ API
    try:
        api = YouTubeTranscriptApi()
        try:
            transcript_list = api.list(video_id)
            found_transcript = None
            try:
                found_transcript = transcript_list.find_transcript(preferred_languages)
            except Exception:
                # If preferred languages not matched, pick first available
                for t in transcript_list:
                    found_transcript = t
                    break

            if found_transcript:
                detected_lang = getattr(found_transcript, "language", "en")
                fetched = found_transcript.fetch()
                if hasattr(fetched, "to_raw_data"):
                    raw_snippets = fetched.to_raw_data()
                else:
                    raw_snippets = list(fetched)
        except Exception:
            # Direct fetch fallback
            fetched = api.fetch(video_id, languages=preferred_languages)
            if hasattr(fetched, "to_raw_data"):
                raw_snippets = fetched.to_raw_data()
            else:
                raw_snippets = list(fetched)
            detected_lang = getattr(fetched, "language", "en")

    except Exception:
        # Fallback to legacy class method if available
        if hasattr(YouTubeTranscriptApi, "get_transcript"):
            raw_snippets = YouTubeTranscriptApi.get_transcript(
                video_id, languages=preferred_languages
            )
            detected_lang = "auto"
        else:
            raise

    # Normalize snippet items
    formatted_snippets = []
    text_chunks = []
    for item in raw_snippets:
        if isinstance(item, dict):
            text = item.get("text", "").strip()
            start = float(item.get("start", 0.0))
            duration = float(item.get("duration", 0.0))
        else:
            # Dataclass or object snippet
            text = getattr(item, "text", "").strip()
            start = float(getattr(item, "start", 0.0))
            duration = float(getattr(item, "duration", 0.0))

        if text:
            time_str = format_timestamp(start)
            formatted_snippets.append({
                "text": text,
                "start": start,
                "duration": duration,
                "timestamp": time_str
            })
            text_chunks.append(f"[{time_str}] {text}")

    full_text = " ".join(item["text"] for item in formatted_snippets)
    return full_text, formatted_snippets, detected_lang


def get_huggingface_embeddings():
    """
    Initializes HuggingFaceEmbeddings using sentence-transformers/all-MiniLM-L6-v2.
    Uses cached weights locally if available to eliminate internet latency.
    """
    try:
        return HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={"local_files_only": True}
        )
    except Exception:
        return HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )


def build_vector_store(snippets: List[Dict[str, Any]], chunk_size: int = 800, chunk_overlap: int = 120) -> FAISS:
    """
    Splits transcript snippets with timestamps into documents and indexes them in FAISS.
    """
    documents = []
    # Group every ~5-8 consecutive snippets to preserve timestamp context
    group_text = []
    start_time = "00:00"

    for i, snip in enumerate(snippets):
        if not group_text:
            start_time = snip["timestamp"]
        group_text.append(snip["text"])

        # Create a document every 6 snippets or at the end
        if len(group_text) >= 6 or i == len(snippets) - 1:
            content = " ".join(group_text)
            doc = Document(
                page_content=content,
                metadata={"timestamp": start_time}
            )
            documents.append(doc)
            group_text = []

    # If documents are very few or if plain text fallback is used
    if not documents and snippets:
        full_content = " ".join(s["text"] for s in snippets)
        documents = [Document(page_content=full_content, metadata={"timestamp": "00:00"})]

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    split_docs = text_splitter.split_documents(documents)

    embeddings = get_huggingface_embeddings()
    vector_store = FAISS.from_documents(split_docs, embeddings)
    return vector_store


FALLBACK_MODELS = [
    "llama-3.1-8b-instant",
    "llama-3.1-70b-versatile",
    "llama3-8b-8192",
    "mixtral-8x7b-32768",
]


PREFERRED_GROQ_MODELS = [
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "qwen/qwen3.8-27b",
    "canopylabs/orpheus-v1-english",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
]


def smart_sample_transcript(transcript_text: str, max_chars: int = 11000) -> str:
    """
    Safely samples the transcript to stay well below Groq's free-tier token limit (8000 TPM).
    11,000 characters is ~2,400 tokens, leaving ample headroom.
    """
    if len(transcript_text) <= max_chars:
        return transcript_text

    part = max_chars // 3
    start = transcript_text[:part]
    mid_idx = (len(transcript_text) // 2) - (part // 2)
    mid = transcript_text[mid_idx:mid_idx + part]
    end = transcript_text[-part:]

    return f"{start}\n\n... [वीडियो का मध्य भाग] ...\n\n{mid}\n\n... [वीडियो का अंतिम भाग] ...\n\n{end}"


def resolve_groq_model(api_key: str, requested_model: Optional[str] = None) -> str:
    """
    Finds the best active chat model available in the user's Groq account.
    """
    clean_key = str(api_key).strip().strip('"').strip("'")
    try:
        from groq import Groq
        client = Groq(api_key=clean_key, timeout=8.0)
        models_data = client.models.list().data
        available_ids = [m.id for m in models_data]

        # If user explicitly requested a model that exists, use it
        if requested_model and requested_model in available_ids:
            return requested_model

        # Otherwise pick the first preferred model that exists in their account
        for pref in PREFERRED_GROQ_MODELS:
            if pref in available_ids:
                return pref

        # Filter out whisper / guard models
        chat_candidates = [
            mid for mid in available_ids
            if "whisper" not in mid.lower() and "guard" not in mid.lower()
        ]
        if chat_candidates:
            return chat_candidates[0]
    except Exception:
        pass

    return "openai/gpt-oss-20b"


def get_groq_llm(api_key: str, model_name: Optional[str] = None, temperature: float = 0.2) -> ChatGroq:
    """
    Creates and returns a ChatGroq LLM instance with an automatically verified active model.
    """
    if not api_key:
        raise ValueError("Groq API Key is missing. Please provide it in Settings or .env file.")
    
    clean_key = api_key.strip().strip('"').strip("'")
    active_model = resolve_groq_model(clean_key, model_name)

    return ChatGroq(
        groq_api_key=clean_key,
        model_name=active_model,
        temperature=temperature,
        timeout=45.0,
        max_retries=3
    )


def invoke_with_fallback(llm: ChatGroq, chain_or_prompt, input_dict: dict, api_key: str):
    """
    Invokes LLM with automatic dynamic fallback for 404 (model_not_found) and 413 (token limit exceeded).
    """
    try:
        return chain_or_prompt.invoke(input_dict)
    except Exception as e:
        err_str = str(e).lower()
        clean_key = str(api_key).strip().strip('"').strip("'")

        # If token limit or request too large (413 / rate_limit_exceeded)
        if "413" in err_str or "too large" in err_str or "tokens per minute" in err_str or "rate_limit" in err_str:
            if "transcript" in input_dict:
                shorter_text = input_dict["transcript"][:5000]
                trimmed_input = dict(input_dict)
                trimmed_input["transcript"] = shorter_text
                # Switch to 20b model which has higher TPM
                fallback_llm = ChatGroq(
                    groq_api_key=clean_key,
                    model_name="openai/gpt-oss-20b",
                    temperature=0.2,
                    timeout=45.0,
                    max_retries=2
                )
                if hasattr(chain_or_prompt, "first"):
                    new_chain = chain_or_prompt.first | fallback_llm
                    return new_chain.invoke(trimmed_input)
                return fallback_llm.invoke(trimmed_input)

        if "model_not_found" in err_str or "404" in err_str or "does not exist" in err_str:
            current_model = getattr(llm, "model_name", "")

            for fallback_model in PREFERRED_GROQ_MODELS:
                if fallback_model != current_model:
                    try:
                        fallback_llm = ChatGroq(
                            groq_api_key=clean_key,
                            model_name=fallback_model,
                            temperature=0.2,
                            timeout=45.0,
                            max_retries=3
                        )
                        if hasattr(chain_or_prompt, "first") and hasattr(chain_or_prompt, "last"):
                            new_chain = chain_or_prompt.first | fallback_llm
                            return new_chain.invoke(input_dict)
                        return fallback_llm.invoke(input_dict)
                    except Exception:
                        continue
        raise e


def clean_promotional_fluff(text: str) -> str:
    """
    Strips promotional fluff, YouTube calls-to-action ('drop a comment', 'check description', etc.),
    'Next steps for viewers', and outro sign-offs ('Happy building!', etc.).
    """
    if not text:
        return ""
    patterns = [
        r"(?i)\n+(-{3,}|\*{3,})?\s*\n*(\*\*|#+)?\s*(Next Steps?|What to do next|Next steps for viewers|अगले कदम|Action items)[^\n]*[\s\S]*$",
        r"(?i)\n*(\*\*|#+)?\s*(Next step:)[^\n]*[\s\S]*$",
        r"(?i)\n*(\*\*|#+)?\s*(Drop a comment|Leave a comment|कमेंट करें|Subscribe|सब्सक्राइब)[^\n]*[\s\S]*$",
        r"(?i)\n*The speaker offers[^.\n]*drop a comment[^\n]*",
        r"(?i)\n*(Happy building!?|Happy learning!?|Happy coding!?|Thanks for watching!?|देखने के लिए धन्यवाद!?).*$",
    ]
    cleaned = text
    for p in patterns:
        cleaned = re.sub(p, "", cleaned)
    return cleaned.strip()


def analyze_video_content(llm: ChatGroq, transcript_text: str, language: str = "en") -> str:
    """
    Analyzes what is being discussed/taught in the video in the requested language (en or hi):
    - Quick Summary
    - What was taught / Core Concepts
    - Key Discussion Points
    - Practical Takeaways
    """
    # Safely sample transcript to stay well within Groq TPM limit (~2000 tokens)
    safe_transcript = smart_sample_transcript(transcript_text, max_chars=9000)

    is_hindi = str(language).lower().startswith("hi")

    if is_hindi:
        lang_rule = "Provide a well-structured, insightful, and comprehensive analysis in Hindi / Hinglish with emojis."
        s1 = "### 1. 🎬 संक्षिप्त सार (Quick Summary)\nGive a crisp 2-3 sentence overview in Hindi of what this video is about."
        s2 = "### 2. 📚 क्या-क्या सिखाया/पढ़ाया गया है (What Was Taught?)\nBreak down the main lessons, concepts, tools, or techniques taught in the video with bullet points or clean markdown tables in Hindi."
        s3 = "### 3. 🔍 मुख्य चर्चा के बिंदु (Key Discussion Points)\nHighlight major themes, arguments, problems discussed, or solutions in Hindi."
        s4 = "### 4. 💡 मुख्य निष्कर्ष (Key Takeaways)\nWhat are the top 3-5 key takeaways a viewer should remember in Hindi?"
    else:
        lang_rule = "Provide a well-structured, insightful, and comprehensive analysis strictly in clear, professional English with emojis."
        s1 = "### 1. 🎬 Quick Summary\nGive a crisp 2-3 sentence overview of what this video is about and its main purpose."
        s2 = "### 2. 📚 What Was Taught? (Core Lessons & Concepts)\nBreak down the main lessons, concepts, theories, tools, or techniques taught in the video with bullet points or a clean markdown table."
        s3 = "### 3. 🔍 Key Discussion Points & Topics\nHighlight the major themes, arguments, problems discussed, or solutions presented."
        s4 = "### 4. 💡 Key Takeaways & Actionable Insights\nWhat are the top 3-5 key takeaways a viewer should remember after watching this?"

    formatting_rule = (
        "STRICT CONTENT & FORMATTING RULES:\n"
        "- Focus strictly on the educational concepts, lessons, and content taught in the video.\n"
        "- NEVER include 'Next step:', 'Next Steps', or recommendations on what the viewer should do next.\n"
        "- NEVER include YouTube promotional fluff, calls-to-action, or channel outro remarks (e.g. 'drop a comment', 'check description', 'subscribe', 'happy building!').\n"
        "- Conclude immediately after Section 4 (Key Takeaways). Do NOT add any extra sections, concluding advice, or sign-offs.\n"
        "- Write strictly in clean, beautiful GitHub Flavored Markdown with headers (##, ###), bold highlights (**term**), and bullet lists (- or •).\n"
        "- If using tables, keep table cells readable and use standard markdown table syntax."
    )

    prompt = PromptTemplate(
        template=f"""
You are an expert AI YouTube Content Analyst & Educator.
A user wants to understand what is being discussed and taught in this YouTube video.

Here is the transcript of the video:
---
{{transcript}}
---

Language requirement: {lang_rule}

{formatting_rule}

{s1}

{s2}

{s3}

{s4}

Write in an engaging, easy-to-read, beautifully structured markdown format with emojis. Stop after Section 4.
""",
        input_variables=["transcript"]
    )

    chain = prompt | llm
    api_key = getattr(llm, "groq_api_key", None)
    if api_key and hasattr(api_key, "get_secret_value"):
        api_key_str = api_key.get_secret_value()
    else:
        api_key_str = str(api_key or "")
    res = invoke_with_fallback(llm, chain, {"transcript": safe_transcript}, api_key_str)
    return clean_promotional_fluff(res.content)


def generate_video_quiz(llm: ChatGroq, transcript_text: str, num_questions: int = 5, language: str = "en") -> List[Dict[str, Any]]:
    """
    Generates interactive quiz/assessment questions to test the user on what was taught in the video.
    Returns a list of questions with options, correct answer, and explanation in requested language.
    """
    # Safely sample transcript to stay well within Groq TPM limit
    safe_transcript = smart_sample_transcript(transcript_text, max_chars=8000)

    is_hindi = str(language).lower().startswith("hi")
    if is_hindi:
        lang_instruction = "Generate the questions, options, and explanations in Hindi / Hinglish."
    else:
        lang_instruction = "Generate all questions, options, and explanations strictly in English."

    prompt = PromptTemplate(
        template=f"""
You are an expert educator. Based on the following YouTube video transcript, generate {{num_questions}} high-quality questions to test what was taught in this video.

Language Instruction: {lang_instruction}

Include:
- Multiple Choice Questions (MCQs) that test understanding of key concepts taught in the video.
- For each question provide:
  - id: integer
  - question: string (in the required language)
  - options: list of 4 options (A, B, C, D)
  - correct_answer: string (e.g. "B) ...")
  - explanation: string explaining why this is correct based on what was taught in the video.

Transcript:
---
{{transcript}}
---

IMPORTANT: Output ONLY valid JSON array with no extra markdown formatting or backticks around it.
Format:
[
  {{{{
    "id": 1,
    "question": "Question text here?",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "correct_answer": "B) Option 2",
    "explanation": "Explanation based on video content"
  }}}}
]
""",
        input_variables=["transcript", "num_questions"]
    )

    chain = prompt | llm
    api_key = getattr(llm, "groq_api_key", None)
    if api_key and hasattr(api_key, "get_secret_value"):
        api_key_str = api_key.get_secret_value()
    else:
        api_key_str = str(api_key or "")
    res = invoke_with_fallback(llm, chain, {"transcript": safe_transcript, "num_questions": num_questions}, api_key_str)
    content = res.content.strip()

    # Clean backticks if any
    if content.startswith("```json"):
        content = content[7:]
    elif content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()

    try:
        data = json.loads(content)
        if isinstance(data, list):
            return data
    except Exception:
        match = re.search(r"\[\s*\{.*\}\s*\]", content, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except Exception:
                pass

    fallback_q = "What is the primary topic discussed in this video?" if not is_hindi else "वीडियो का मुख्य विषय क्या है?"
    fallback_a = "Main Concept 1" if not is_hindi else "मुख्य विषय 1"
    fallback_exp = "This topic was discussed comprehensively in the video." if not is_hindi else "वीडियो में इसके बारे में विस्तार से चर्चा की गई है।"

    return [
        {
            "id": 1,
            "question": fallback_q,
            "options": [f"A) {fallback_a}", "B) Alternative 2", "C) Alternative 3", "D) Alternative 4"],
            "correct_answer": f"A) {fallback_a}",
            "explanation": fallback_exp
        }
    ]


def answer_video_query(
    llm: ChatGroq,
    vector_store: FAISS,
    query: str,
    chat_history: Optional[List[Dict[str, Any]]] = None,
    language: str = "en"
) -> Dict[str, Any]:
    """
    Answers user queries about the video using RAG with timestamps and quotes in English or Hindi.
    If the question is not discussed in the video, explicitly informs the user and omits timestamps.
    """
    retriever = vector_store.as_retriever(search_type="similarity", search_kwargs={"k": 4})
    relevant_docs = retriever.invoke(query)

    context_parts = []
    citations = []
    for doc in relevant_docs:
        ts = doc.metadata.get("timestamp", "00:00")
        context_parts.append(f"[{ts}] {doc.page_content}")
        citations.append({"timestamp": ts, "content": doc.page_content})

    context_text = "\n\n".join(context_parts)

    history_str = ""
    if chat_history:
        for turn in chat_history[-4:]:
            role = turn.get("role", "user")
            content = turn.get("content", "")
            if isinstance(content, str):
                history_str += f"{role.capitalize()}: {content}\n"

    is_hindi = str(language).lower().startswith("hi")
    if is_hindi:
        not_discussed_phrase = "इस वीडियो में इस विषय पर कोई चर्चा नहीं की गई है।"
        lang_rule = "Reply in natural, easy-to-understand Hindi or Hinglish."
    else:
        not_discussed_phrase = "This topic is not discussed in this video."
        lang_rule = "Reply strictly in fluent, clear, and professional English."

    prompt = PromptTemplate(
        template=f"""
You are an intelligent YouTube AI Assistant.
A user is asking a question about a YouTube video.
Answer strictly and accurately based ONLY on the provided video transcript context below.

CRITICAL INSTRUCTIONS:
1. First, check whether the user's question is actually discussed or mentioned in the transcript.
2. If the topic or question is NOT discussed in this video:
   - Clearly and explicitly state: "{not_discussed_phrase}" and briefly mention what the video actually explains.
   - Do NOT make up any answer from outside knowledge.
   - At the very end of your response, append the exact tag: [NOT_FOUND]
3. If the topic IS discussed in the video:
   - Provide a helpful, clear, and accurate answer based on the transcript.
   - Include timestamp references like [MM:SS] where it was mentioned.
   - Do NOT include promotional fluff, calls to action (e.g. 'drop a comment', 'check description'), or outro sign-offs.

Language Requirement: {lang_rule}

Chat History:
{{history}}

Video Transcript Context:
---
{{context}}
---

User Question: {{question}}

Helpful Answer:
""",
        input_variables=["history", "context", "question"]
    )

    chain = prompt | llm
    api_key = getattr(llm, "groq_api_key", None)
    if api_key and hasattr(api_key, "get_secret_value"):
        api_key_str = api_key.get_secret_value()
    else:
        api_key_str = str(api_key or "")
    res = invoke_with_fallback(llm, chain, {
        "history": history_str,
        "context": context_text,
        "question": query
    }, api_key_str)

    raw_answer = res.content.strip()

    # Detect if topic is not discussed in video
    is_not_found = (
        "[NOT_FOUND]" in raw_answer
        or "not discussed in this video" in raw_answer.lower()
        or "video does not discuss" in raw_answer.lower()
        or "चर्चा नहीं की गई" in raw_answer
        or "चर्चा नहीं है" in raw_answer
    )

    clean_answer = raw_answer.replace("[NOT_FOUND]", "").strip()
    clean_answer = clean_promotional_fluff(clean_answer)

    # If topic is not in the video, omit citations so no misleading timestamps appear
    final_citations = [] if is_not_found else citations

    return {
        "answer": clean_answer,
        "citations": final_citations
    }
