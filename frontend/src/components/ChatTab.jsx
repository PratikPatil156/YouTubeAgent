import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Clock, Loader2, Sparkles, Copy, Check } from 'lucide-react';

export default function ChatTab({
  chatMessages,
  onSendMessage,
  loading,
  sessionId
}) {
  const [inputQuery, setInputQuery] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);

  const suggestedQuestions = [
    'इस वीडियो का मुख्य निष्कर्ष (Conclusion) क्या है?',
    'वीडियो में कौन-कौन से मुख्य टूल्स या कॉन्सेप्ट्स सिखाए गए हैं?',
    'क्या इस वीडियो में कोई प्रैक्टिकल उदाहरण या कोड है?',
    'Who are the speakers and what are their key arguments?'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputQuery.trim() && !loading) {
      onSendMessage(inputQuery);
      setInputQuery('');
    }
  };

  const handleChipClick = (question) => {
    if (!loading) {
      onSendMessage(question);
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex flex-col h-[650px] bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Ask Video Agent</h3>
            <p className="text-[11px] text-slate-400">Grounded strictly in video transcripts using Groq + FAISS</p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-[10px] font-semibold text-emerald-400">
          RAG Active
        </span>
      </div>

      {/* Suggested Prompt Chips (if few messages) */}
      {chatMessages.length <= 1 && (
        <div className="p-3 bg-slate-950/60 border-b border-slate-800/80">
          <p className="text-[11px] text-slate-400 mb-2 flex items-center gap-1 font-medium">
            <Sparkles className="w-3 h-3 text-amber-300" /> Suggested questions:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleChipClick(q)}
                disabled={loading}
                className="text-left px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-white transition disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={index}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {/* Bot Avatar */}
              {!isUser && (
                <div className="w-7 h-7 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`max-w-[82%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                  isUser
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-tr-none shadow-md shadow-red-900/20'
                    : 'bg-slate-950/90 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Citations / Timestamps if present */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Context Citations:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.citations.map((c, cIdx) => (
                        <span
                          key={cIdx}
                          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80 text-[10px] text-slate-300 flex items-center gap-1"
                        >
                          <Clock className="w-2.5 h-2.5 text-red-400" />
                          <span>{c.timestamp}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Copy Bot Response */}
                {!isUser && (
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => handleCopy(msg.content, index)}
                      className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition"
                    >
                      {copiedIndex === index ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* User Avatar */}
              {isUser && (
                <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Bubble */}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3.5 rounded-2xl rounded-tl-none bg-slate-950 border border-slate-800 flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
              <span>Agent is thinking & searching transcript...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          placeholder="Ask anything about what was said or taught in this video..."
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500"
        />
        <button
          type="submit"
          disabled={loading || !inputQuery.trim()}
          className="p-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white disabled:opacity-40 transition shadow-md shadow-red-600/20"
          title="Send Question"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
