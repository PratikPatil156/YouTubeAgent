import React from 'react';
import { Youtube, Sparkles, Settings, Key, Cpu, ShieldCheck, AlertCircle } from 'lucide-react';

export default function Navbar({ groqApiKey, onOpenSettings, appLanguage, setAppLanguage }) {
  const isKeyConfigured = Boolean(groqApiKey && groqApiKey.trim().length > 5);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#0a0d14]/90 backdrop-blur-md">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 shadow-lg shadow-red-500/20 text-white">
            <Youtube className="w-6 h-6" />
            <Sparkles className="w-3.5 h-3.5 text-amber-300 absolute -top-1 -right-1 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white">YouTube AI Agent</span>
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                PRO
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Content Breakdown • Interactive Quiz • RAG Q&A</p>
          </div>
        </div>

        {/* Status Indicators & Settings */}
        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold shadow-inner">
            <button
              type="button"
              onClick={() => setAppLanguage('en')}
              className={`px-3 py-1 rounded-lg transition-all ${
                appLanguage === 'en'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🇬🇧 English
            </button>
            <button
              type="button"
              onClick={() => setAppLanguage('hi')}
              className={`px-3 py-1 rounded-lg transition-all ${
                appLanguage === 'hi'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🇮🇳 हिन्दी
            </button>
          </div>

          {/* Groq Key Status */}
          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              isKeyConfigured
                ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300 hover:bg-emerald-900/40'
                : 'bg-amber-950/40 border-amber-700/60 text-amber-300 hover:bg-amber-900/50 animate-pulse'
            }`}
          >
            {isKeyConfigured ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Groq Connected</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>Add Groq API Key</span>
              </>
            )}
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition"
            title="Configure API Keys & Models"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
}
