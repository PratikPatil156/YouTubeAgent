import sys
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")
if len(sys.argv) > 1:
    api_key = sys.argv[1]

print("--- Groq Connection Diagnostic ---")
if not api_key:
    print("❌ No API key found! Please check your .env file.")
    sys.exit(1)

clean_key = api_key.strip().strip('"').strip("'")
print(f"Key preview: {clean_key[:8]}...{clean_key[-4:]} (length: {len(clean_key)})")

from groq import Groq

try:
    client = Groq(api_key=clean_key, timeout=20.0)
    print("\n1. Fetching available models for your account...")
    model_list = client.models.list()
    available_ids = [m.id for m in model_list.data]
    print(f"✅ Found {len(available_ids)} models in your account:")
    for mid in available_ids:
        print(f"  • {mid}")

    # Prioritize chat models
    preferred = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "llama-3.1-70b-versatile",
        "llama3-8b-8192",
        "llama3-70b-8192",
        "mixtral-8x7b-32768",
        "gemma2-9b-it"
    ]
    chosen_model = None
    for p in preferred:
        if p in available_ids:
            chosen_model = p
            break
    if not chosen_model and available_ids:
        chosen_model = available_ids[0]

    print(f"\n2. Testing chat completion with: '{chosen_model}'...")
    chat_completion = client.chat.completions.create(
        messages=[{"role": "user", "content": "Say 'Groq AI is ready!'"}],
        model=chosen_model,
    )
    res = chat_completion.choices[0].message.content
    print(f"🎉 SUCCESS! Response from {chosen_model}:\n👉 {res}")

except Exception as e:
    print(f"❌ Error: {type(e).__name__}: {e}")
