import React, { useState, useEffect, useRef } from 'react';

// SVG Icons
const PlayIcon = () => (
  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
);

const SparklesIcon = () => (
  <svg className="w-4 h-4 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
);

// Fallback Markdown parser for tables, lists, headers, <br>, and bold text
function parseFallbackMarkdown(rawText) {
  if (!rawText) return '';

  const text = String(rawText).replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const out = [];
  let inTable = false;
  let tableHeaders = [];
  let tableRows = [];
  let inList = false;
  let listType = null;

  const formatInline = (str) => {
    if (!str) return '';
    return str
      .replace(/&(?!amp;|lt;|gt;)/g, '&amp;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/&lt;br\s*\/?&gt;/gi, '<br/>')
      .replace(/<br\s*\/?>/gi, '<br/>');
  };

  const flushTable = () => {
    if (!inTable) return;
    let html = '<div class="table-wrapper"><table>';
    if (tableHeaders.length > 0) {
      html += '<thead><tr>';
      tableHeaders.forEach(h => {
        html += `<th>${formatInline(h)}</th>`;
      });
      html += '</tr></thead>';
    }
    if (tableRows.length > 0) {
      html += '<tbody>';
      tableRows.forEach(row => {
        html += '<tr>';
        row.forEach(cell => {
          html += `<td>${formatInline(cell)}</td>`;
        });
        html += '</tr>';
      });
      html += '</tbody>';
    }
    html += '</table></div>';
    out.push(html);
    inTable = false;
    tableHeaders = [];
    tableRows = [];
  };

  const flushList = () => {
    if (!inList) return;
    out.push(`</${listType}>`);
    inList = false;
    listType = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if line is a table row: contains pipes and starts or ends with pipe
    const isTableRow = line.includes('|') && (line.startsWith('|') || line.endsWith('|'));
    const isSeparatorRow = isTableRow && /^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(line);

    if (isTableRow) {
      flushList();
      const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => {
        if ((idx === 0 || idx === arr.length - 1) && c === '') return false;
        return true;
      });

      if (!inTable) {
        inTable = true;
        tableHeaders = cells;
      } else if (isSeparatorRow) {
        continue;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else {
      flushTable();
    }

    // Horizontal rule
    if (/^---+$|^___+$|^\*\*\*+$/.test(line)) {
      flushList();
      out.push('<hr/>');
      continue;
    }

    // Headings
    if (line.startsWith('#### ')) {
      flushList();
      out.push(`<h4>${formatInline(line.substring(5))}</h4>`);
      continue;
    }
    if (line.startsWith('### ')) {
      flushList();
      out.push(`<h3>${formatInline(line.substring(4))}</h3>`);
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      out.push(`<h2>${formatInline(line.substring(3))}</h2>`);
      continue;
    }
    if (line.startsWith('# ')) {
      flushList();
      out.push(`<h1>${formatInline(line.substring(2))}</h1>`);
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      flushList();
      out.push(`<blockquote>${formatInline(line.substring(2))}</blockquote>`);
      continue;
    }

    // Lists
    if (/^[-*•]\s+/.test(line)) {
      if (!inList || listType !== 'ul') {
        flushList();
        inList = true;
        listType = 'ul';
        out.push('<ul>');
      }
      out.push(`<li>${formatInline(line.replace(/^[-*•]\s+/, ''))}</li>`);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      if (!inList || listType !== 'ol') {
        flushList();
        inList = true;
        listType = 'ol';
        out.push('<ol>');
      }
      out.push(`<li>${formatInline(line.replace(/^\d+\.\s+/, ''))}</li>`);
      continue;
    }

    // Empty line
    if (!line) {
      flushList();
      continue;
    }

    // Paragraph
    flushList();
    out.push(`<p>${formatInline(line)}</p>`);
  }

  flushTable();
  flushList();

  return out.join('\n');
}

// High performance Markdown & HTML Renderer
function MarkdownRenderer({ content, className = '' }) {
  const getHtml = () => {
    if (!content) return '';
    if (typeof window !== 'undefined' && window.marked) {
      try {
        window.marked.setOptions({
          gfm: true,
          breaks: true
        });
        let parsed = window.marked.parse(content);
        parsed = parsed.replace(/<table(\s*[^>]*)>/g, '<div class="table-wrapper"><table$1>').replace(/<\/table>/g, '</table></div>');
        return parsed;
      } catch (e) {
        console.warn('Marked parse error, using fallback:', e);
      }
    }
    return parseFallbackMarkdown(content);
  };

  return (
    <div
      className={`markdown-content ${className}`}
      dangerouslySetInnerHTML={{ __html: getHtml() }}
    />
  );
}

export default function App() {
  const [groqApiKey, setGroqApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('openai/gpt-oss-20b');
  const [appLanguage, setAppLanguage] = useState('en'); // 'en' | 'hi'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [testingGroq, setTestingGroq] = useState(false);
  const [testGroqResult, setTestGroqResult] = useState(null);

  // Video state
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [regeneratingQuiz, setRegeneratingQuiz] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Session data
  const [sessionData, setSessionData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Quiz state
  const [selectedAnswers, setSelectedAnswers] = useState({});

  useEffect(() => {
    const saved = localStorage.getItem('GROQ_API_KEY');
    if (saved) setGroqApiKey(saved);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const handleSaveSettings = () => {
    localStorage.setItem('GROQ_API_KEY', groqApiKey);
    setIsSettingsOpen(false);
  };

  const handleProcessVideo = async (e) => {
    if (e) e.preventDefault();
    if (!videoUrl.trim()) return;

    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/process-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url_or_id: videoUrl,
          groq_api_key: groqApiKey,
          model_name: selectedModel,
          manual_transcript: null,
          language: appLanguage
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to process video');

      setSessionData(data);
      setSelectedAnswers({});
      setChatMessages([]);
      setActiveTab('overview');
    } catch (err) {
      setErrorMsg(err.message);
      if (err.message.includes('Groq API Key')) {
        setIsSettingsOpen(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (msgText) => {
    const text = msgText || inputQuery;
    if (!text.trim() || !sessionData?.session_id || chatLoading) return;

    const updated = [...chatMessages, { role: 'user', content: text }];
    setChatMessages(updated);
    setInputQuery('');
    setChatLoading(true);

    const cleanHistory = updated.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : ''
    }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionData.session_id,
          query: text,
          groq_api_key: groqApiKey,
          model_name: selectedModel,
          chat_history: cleanHistory,
          language: appLanguage
        })
      });

      const data = await res.json();
      if (!res.ok) {
        let errorText = 'Chat query failed';
        if (typeof data.detail === 'string') {
          errorText = data.detail;
        } else if (Array.isArray(data.detail)) {
          errorText = data.detail.map(d => d.msg || JSON.stringify(d)).join(', ');
        } else if (data.detail) {
          errorText = JSON.stringify(data.detail);
        }
        throw new Error(errorText);
      }

      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.answer, citations: data.citations }
      ]);
    } catch (err) {
      setChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: appLanguage === 'en'
            ? `⚠️ Error: ${err.message}`
            : `⚠️ त्रुटि: ${err.message}`
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleRegenerateQuiz = async () => {
    if (!sessionData?.session_id) return;
    setRegeneratingQuiz(true);
    try {
      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionData.session_id,
          groq_api_key: groqApiKey,
          model_name: selectedModel,
          num_questions: 5,
          language: appLanguage
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Quiz generation failed');
      setSessionData(prev => ({ ...prev, quiz: data.quiz }));
      setSelectedAnswers({});
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setRegeneratingQuiz(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0d14]">
      
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#0a0d14]/90 backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
              <PlayIcon />
            </div>
            <div>
              <span className="font-extrabold text-lg text-white tracking-tight">YouTube AI Agent</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Switcher Toggle */}
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

            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition ${
                groqApiKey
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-700/60 text-amber-300 animate-pulse'
              }`}
            >
              <span>{groqApiKey ? '✓ Groq Active' : '⚙️ Set Groq Key'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <span>⚙️</span> {appLanguage === 'en' ? 'Settings & API Configuration' : 'सेटिंग्स और API कॉन्फ़िगरेशन'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {appLanguage === 'en'
                ? 'Enter Groq API Key (Free on console.groq.com)'
                : 'Groq API Key दर्ज करें (Free on console.groq.com)'}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  {appLanguage === 'en' ? 'Groq API Key' : 'Groq API Key'}
                </label>
                <input
                  type="password"
                  placeholder="gsk_..."
                  value={groqApiKey}
                  onChange={(e) => setGroqApiKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  {appLanguage === 'en' ? 'Model Selection (Active on your Groq)' : 'मॉडल चुनें (Groq पर सक्रिय)'}
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-red-500"
                >
                  <option value="openai/gpt-oss-20b">OpenAI GPT-OSS 20B (Recommended - Fast & High Rate Limits)</option>
                  <option value="openai/gpt-oss-120b">OpenAI GPT-OSS 120B (High Quality)</option>
                  <option value="qwen/qwen3.8-27b">Qwen 3.8 27B</option>
                </select>
              </div>

              {testGroqResult && (
                <div className={`p-2.5 rounded-xl text-xs ${testGroqResult.success ? 'bg-emerald-950/60 border border-emerald-700 text-emerald-200' : 'bg-rose-950/60 border border-rose-700 text-rose-200'}`}>
                  {testGroqResult.message}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  disabled={testingGroq || !groqApiKey}
                  onClick={async () => {
                    setTestingGroq(true);
                    setTestGroqResult(null);
                    try {
                      const r = await fetch('/api/test-groq', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ groq_api_key: groqApiKey, model_name: selectedModel })
                      });
                      const d = await r.json();
                      setTestGroqResult(d);
                    } catch (err) {
                      setTestGroqResult({ success: false, message: err.message });
                    } finally {
                      setTestingGroq(false);
                    }
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-50"
                >
                  {testingGroq
                    ? (appLanguage === 'en' ? 'Testing...' : 'जाँच हो रही है...')
                    : (appLanguage === 'en' ? '⚡ Test Connection' : '⚡ कनेक्शन जाँचें')}
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                  >
                    {appLanguage === 'en' ? 'Close' : 'बंद करें'}
                  </button>
                  <button
                    onClick={handleSaveSettings}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30"
                  >
                    {appLanguage === 'en' ? 'Save Settings' : 'सेव करें'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6">
        
        {/* Hero */}
        {!sessionData && (
          <div className="text-center max-w-3xl mx-auto mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/40 border border-red-800/40 text-red-400 text-xs font-semibold mb-3">
              <SparklesIcon /> YouTube AI Intelligent Agent
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-3">
              {appLanguage === 'en' ? (
                <>Understand Any Video & <span className="gradient-text">Test Your Learning</span></>
              ) : (
                <>वीडियो में क्या पढ़ाया है समझें & <span className="gradient-text">सीख की जाँच करें</span></>
              )}
            </h1>
            <p className="text-sm text-slate-400">
              {appLanguage === 'en'
                ? 'Paste any YouTube URL — The Agent breaks down what was taught, quizzes you on core concepts, and answers any question!'
                : 'किसी भी YouTube वीडियो का URL दें — Agent बताएगा कि क्या पढ़ाया गया है, आपसे प्रश्न पूछेगा, और आपके हर सवाल का सटीक जवाब देगा!'}
            </p>
          </div>
        )}

        {/* Video Input Bar */}
        <div className="max-w-4xl mx-auto mb-6">
          <form onSubmit={handleProcessVideo} className="flex flex-col sm:flex-row gap-2 p-2 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl focus-within:border-red-500/50">
            <input
              type="text"
              placeholder="Paste YouTube Video URL (e.g. https://www.youtube.com/watch?v=...)"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !videoUrl.trim()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-sm shadow-lg shadow-red-600/30 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Processing Video...' : '⚡ Process Video'}
            </button>
          </form>
        </div>

        {errorMsg && (
          <div className="max-w-4xl mx-auto mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex justify-between">
            <span>⚠️ {errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="underline">Dismiss</button>
          </div>
        )}

        {/* Split Screen View */}
        {sessionData && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left: Video Player */}
            <div className="lg:col-span-6 space-y-4 sticky top-20">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="relative pt-[56.25%] bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${sessionData.video_id}?rel=0`}
                    title="YouTube Player"
                    className="absolute inset-0 w-full h-full border-0"
                    allowFullScreen
                  />
                </div>
                <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-400">ID: {sessionData.video_id}</span>
                </div>
              </div>
            </div>

            {/* Right: Tabs */}
            <div className="lg:col-span-6">
              
              {/* Tab Selector with Universal Reload Button */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 mb-5 text-xs font-semibold">
                
                {/* Left: 3 Tabs (1. Overview -> 2. Chat With Video -> 3. Agent Quiz) */}
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-2.5 rounded-xl transition ${activeTab === 'overview' ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'text-slate-400 hover:text-white'}`}
                  >
                    {appLanguage === 'en' ? '📚 What Was Taught (Overview)' : '📚 क्या सिखाया गया है (Overview)'}
                  </button>

                  {/* 2nd Place: Chat With Video */}
                  <button
                    onClick={() => setActiveTab('chat')}
                    className={`px-4 py-2.5 rounded-xl transition ${activeTab === 'chat' ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'text-slate-400 hover:text-white'}`}
                  >
                    {appLanguage === 'en' ? '💬 Chat With Video' : '💬 वीडियो से चैट करें'}
                  </button>

                  {/* 3rd Place: Agent Quiz */}
                  <button
                    onClick={() => setActiveTab('quiz')}
                    className={`px-4 py-2.5 rounded-xl transition ${activeTab === 'quiz' ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'text-slate-400 hover:text-white'}`}
                  >
                    {appLanguage === 'en' ? `🧠 Agent Quiz (${sessionData.quiz?.length || 0})` : `🧠 सीख की जाँच (${sessionData.quiz?.length || 0})`}
                  </button>
                </div>

                {/* Right: Universal Reload Button */}
                <button
                  onClick={handleProcessVideo}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/90 border border-slate-700 text-xs text-red-400 hover:text-red-300 font-semibold shadow transition whitespace-nowrap disabled:opacity-50"
                  title={appLanguage === 'en' ? 'Re-analyze video in current language' : 'वर्तमान भाषा में पुनः विश्लेषण करें'}
                >
                  <span>{loading ? '⏳' : '🔄'}</span>
                  <span>{appLanguage === 'en' ? 'Reload / Re-analyze' : 'हिन्दी में पुनः विश्लेषण करें'}</span>
                </button>
              </div>

              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4 text-sm leading-relaxed text-slate-200">
                  <div className="pb-2 border-b border-slate-800">
                    <h2 className="text-base font-bold text-white">
                      {appLanguage === 'en' ? '🎯 Video Content Breakdown (What Was Taught)' : '🎯 वीडियो का सम्पूर्ण विश्लेषण (कंटेंट व सीख)'}
                    </h2>
                  </div>
                  <MarkdownRenderer content={sessionData.overview} />
                </div>
              )}

              {/* Quiz Tab */}
              {activeTab === 'quiz' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <span className="text-xs text-slate-400">
                      {appLanguage === 'en' ? 'Questions Generated by Agent:' : 'Agent द्वारा पूछे गए प्रश्न:'}
                    </span>
                    <button
                      onClick={handleRegenerateQuiz}
                      disabled={regeneratingQuiz}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50"
                    >
                      {regeneratingQuiz ? (appLanguage === 'en' ? 'Generating...' : 'बना रहे हैं...') : (appLanguage === 'en' ? '🔄 New Questions' : '🔄 नए प्रश्न बनाएँ')}
                    </button>
                  </div>

                  {sessionData.quiz?.map((q, idx) => {
                    const userAns = selectedAnswers[q.id];
                    const answered = Boolean(userAns);
                    const isCorrect = answered && userAns.trim().startsWith(q.correct_answer.charAt(0));

                    return (
                      <div key={q.id || idx} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                        <p className="font-semibold text-slate-100 text-sm mb-3">
                          {idx + 1}. {q.question}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                          {q.options.map((opt, oIdx) => {
                            const selected = userAns === opt;
                            const isThisCorrect = opt.trim().startsWith(q.correct_answer.charAt(0));

                            let cls = 'p-2.5 rounded-lg border text-left bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700';
                            if (answered) {
                              if (isThisCorrect) cls = 'p-2.5 rounded-lg border text-left bg-emerald-950/60 border-emerald-600 text-emerald-200 font-bold';
                              else if (selected) cls = 'p-2.5 rounded-lg border text-left bg-rose-950/60 border-rose-600 text-rose-200';
                              else cls = 'p-2.5 rounded-lg border text-left bg-slate-950/40 border-slate-800 opacity-50';
                            }

                            return (
                              <button
                                key={oIdx}
                                type="button"
                                onClick={() => setSelectedAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                className={cls}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {answered && (
                          <div className="mt-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px] text-slate-300">
                            <strong>
                              {isCorrect
                                ? (appLanguage === 'en' ? '✅ Correct Answer!' : '✅ सही उत्तर!')
                                : (appLanguage === 'en' ? `❌ Incorrect! Correct: ${q.correct_answer}` : `❌ गलत! सही उत्तर: ${q.correct_answer}`)}
                            </strong>
                            <p className="mt-1 text-slate-400">{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Chat Tab */}
              {activeTab === 'chat' && (
                <div className="flex flex-col h-[580px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="p-3 border-b border-slate-800 flex justify-between items-center text-xs">
                    <span className="font-bold text-white">Ask Anything About Video</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                      RAG Ready
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col">
                    {chatMessages.length === 0 && (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 text-xs">
                        <span className="text-2xl mb-2">💬</span>
                        <p className="text-slate-400 font-medium">
                          {appLanguage === 'en'
                            ? 'Ask anything about what was taught in this video'
                            : 'इस वीडियो में क्या सिखाया गया है, इसके बारे में कोई भी प्रश्न पूछें'}
                        </p>
                      </div>
                    )}
                    {chatMessages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-xl text-xs leading-relaxed ${
                          m.role === 'user'
                            ? 'bg-red-600 text-white rounded-tr-none'
                            : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none'
                        }`}>
                          <MarkdownRenderer content={m.content} />
                          {m.citations && (
                            <div className="mt-2 pt-2 border-t border-slate-800 flex flex-wrap gap-1">
                              {m.citations.map((c, ci) => (
                                <span key={ci} className="px-1.5 py-0.5 rounded bg-slate-900 text-[10px] text-slate-400 border border-slate-700">
                                  ⏱ {c.timestamp}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 w-fit">
                        ⏳ Agent is thinking...
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="p-2 border-t border-slate-800 flex gap-2 bg-slate-950">
                    <input
                      type="text"
                      placeholder={appLanguage === 'en' ? "Ask anything about what was said or taught in this video..." : "वीडियो के बारे में कोई भी प्रश्न पूछें..."}
                      value={inputQuery}
                      onChange={(e) => setInputQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                    />
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={chatLoading || !inputQuery.trim()}
                      className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
