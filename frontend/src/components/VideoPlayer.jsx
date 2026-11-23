import React from 'react';
import { ExternalLink, Film, Globe, Hash } from 'lucide-react';

export default function VideoPlayer({ videoId, sessionData }) {
  if (!videoId) return null;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl sticky top-20">
      {/* 16:9 Embedded YouTube Iframe */}
      <div className="relative w-full pt-[56.25%] bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0&enablejsapi=1`}
          title="YouTube Video Player"
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* Video Details Card */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Film className="w-3.5 h-3.5 text-red-400" />
            <span className="font-semibold">Active Video:</span>
            <span className="font-mono text-slate-400">{videoId}</span>
          </div>

          <a
            href={`https://www.youtube.com/watch?v=s${videoId}`}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1"
          >
            Open on YouTube <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
          {sessionData?.language && (
            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 flex items-center gap-1 border border-slate-700">
              <Globe className="w-3 h-3 text-emerald-400" />
              <span>Lang: {sessionData.language}</span>
            </span>
          )}
          {sessionData?.snippets_count && (
            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 flex items-center gap-1 border border-slate-700">
              <Hash className="w-3 h-3 text-indigo-400" />
              <span>{sessionData.snippets_count} Transcripts Chunks</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
