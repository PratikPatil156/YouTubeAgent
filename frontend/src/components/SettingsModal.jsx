import React, { useState } from 'react';
import { X, Key, Cpu, ExternalLink, Save, Check } from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
  groqApiKey,
  setGroqApiKey,
  selectedModel,
  setSelectedModel
}) {
  const [localKey, setLocalKey] = useState(groqApiKey);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setGroqApiKey(localKey);
    localStorage.setItem('GROQ_API_KEY', localKey);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
          <Key className="w-5 h-5 text-red-500" />
          Settings & Credentials
        </h3>
        <p className="text-xs text-slate-400 mb-5">
          Configure Groq API key and Hugging Face model settings for ultra-fast processing.
        </p>

        {/* Groq API Key Input */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-200">
                Groq API Key (gsk_...)
              </label>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 font-medium"
              >
                Get Free Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              placeholder="gsk_..."
              value={localKey}
              onChange={(e) => setLocalKey(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Key is stored safely in your browser localStorage or local .env file.
            </p>
          </div>

          {/* Model Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Groq Model Selection (Active on your Account)
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-red-500"
            >
              <option value="openai/gpt-oss-20b">
                OpenAI GPT-OSS 20B (Recommended - Fast & High Rate Limits)
              </option>
              <option value="openai/gpt-oss-120b">
                OpenAI GPT-OSS 120B (High Quality)
              </option>
              <option value="qwen/qwen3.8-27b">
                Qwen 3.8 27B
              </option>
            </select>
          </div>

          {/* HF Embeddings info */}
          <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-xs text-indigo-300 flex items-start gap-2.5">
            <Cpu className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-indigo-200">Local Hugging Face Embeddings:</span>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Using <code className="text-indigo-300">sentence-transformers/all-MiniLM-L6-v2</code> with in-memory FAISS indexing. No API key needed for embeddings!
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20 transition"
            >
              {saved ? <Check className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
              {saved ? 'Saved!' : 'Save Settings'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
