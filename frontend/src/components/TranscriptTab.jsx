import React, { useState } from 'react';
import { FileText, Search, Copy, Download, Check, Clock } from 'lucide-react';

export default function TranscriptTab({ snippets, fullTranscript, videoId }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const filteredSnippets = (snippets || []).filter((s) =>
    s.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyAll = () => {
    navigator.clipboard.writeText(fullTranscript || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([fullTranscript || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `youtube_transcript_${videoId || 'export'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search within transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy All'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white transition"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Download .txt</span>
          </button>
        </div>
      </div>

      {/* Snippet List */}
      <div className="max-h-[550px] overflow-y-auto space-y-2 p-2 bg-slate-900/40 rounded-2xl border border-slate-800">
        {filteredSnippets.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No transcript matching your search.
          </div>
        ) : (
          filteredSnippets.map((snippet, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 text-xs flex items-start gap-3 transition"
            >
              <span className="px-2 py-0.5 rounded bg-slate-900 text-red-400 font-mono text-[11px] font-semibold shrink-0 flex items-center gap-1 border border-slate-800">
                <Clock className="w-3 h-3" />
                {snippet.timestamp}
              </span>
              <p className="text-slate-300 leading-relaxed">
                {snippet.text}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
