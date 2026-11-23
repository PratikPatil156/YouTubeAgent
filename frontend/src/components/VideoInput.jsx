import React, { useState } from 'react';
import { Search, Loader2, Sparkles, FileText, ChevronDown, ChevronUp, PlayCircle } from 'lucide-react';

export default function VideoInput({
  videoUrl,
  setVideoUrl,
  onProcess,
  loading,
  manualTranscript,
  setManualTranscript,
}) {
  const [showManual, setShowManual] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (videoUrl.trim()) {
      onProcess();
    }
  };

  const handleSample = (id) => {
    setVideoUrl(`https://www.youtube.com/watch?v=Gfr50f6ZBvo`);
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex flex-col sm:flex-row items-center gap-2 p-2 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-md focus-within:border-red-500/50 transition">
          
          {/* Input Field */}
          <div className="relative flex-1 w-full flex items-center">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5" />
            <input
              type="text"
              placeholder="Paste any YouTube URL or Video ID (e.g. https://www.youtube.com/watch?v=...)"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              disabled={loading}
              className="w-full pl-11 pr-4 py-3 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !videoUrl.trim()}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-sm shadow-lg shadow-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all whitespace-nowrap"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Analyzing Video...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>Process Video</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
