import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SettingsModal from './components/SettingsModal';
import VideoInput from './components/VideoInput';
import VideoPlayer from './components/VideoPlayer';
import OverviewTab from './components/OverviewTab';
import QuizTab from './components/QuizTab';
import ChatTab from './components/ChatTab';
import {
  BookOpen,
  HelpCircle,
  MessageSquare,
  Sparkles,
  Zap,
  Cpu,
  BrainCircuit,
  AlertTriangle
} from 'lucide-react';

export default function App() {
  const [groqApiKey, setGroqApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('openai/gpt-oss-20b');
  const [appLanguage, setAppLanguage] = useState('en'); // 'en' | 'hi'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Video State
  const [videoUrl, setVideoUrl] = useState('');
  const [manualTranscript, setManualTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [regeneratingQuiz, setRegeneratingQuiz] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Active Processed Session
  const [sessionData, setSessionData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'quiz' | 'chat' | 'transcript'

  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('GROQ_API_KEY');
    if (savedKey) {
      setGroqApiKey(savedKey);
    }
  }, []);

  const handleProcessVideo = async () => {
    setErrorMsg('');
    setLoading(true);

    try {
      const response = await fetch('/api/process-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url_or_id: videoUrl,
          groq_api_key: groqApiKey,
          model_name: selectedModel,
          manual_transcript: manualTranscript,
          language: appLanguage
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to process YouTube video');
      }

      setSessionData(data);
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

  const handleSendMessage = async (userMessage) => {
    if (!sessionData?.session_id) return;

    const newMessages = [...chatMessages, { role: 'user', content: userMessage }];
    setChatMessages(newMessages);
    setChatLoading(true);

    const cleanHistory = newMessages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : ''
    }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionData.session_id,
          query: userMessage,
          groq_api_key: groqApiKey,
          model_name: selectedModel,
          chat_history: cleanHistory,
          language: appLanguage
        })
      });

      const data = await response.json();
      if (!response.ok) {
        let errorText = 'Error getting answer from Agent';
        if (typeof data.detail === 'string') errorText = data.detail;
        else if (Array.isArray(data.detail)) errorText = data.detail.map(d => d.msg || JSON.stringify(d)).join(', ');
        else if (data.detail) errorText = JSON.stringify(data.detail);
        throw new Error(errorText);
      }

      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer,
          citations: data.citations
        }
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ क्षमा करें, उत्तर प्राप्त करने में समस्या आई: ${err.message}`
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
      const response = await fetch('/api/generate-quiz', {
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

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Error generating new quiz');
      }

      setSessionData((prev) => ({
        ...prev,
        quiz: data.quiz
      }));
    } catch (err) {
      alert(`Quiz generation error: ${err.message}`);
    } finally {
      setRegeneratingQuiz(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col font-sans">
      
      {/* Navbar */}
      <Navbar
        groqApiKey={groqApiKey}
        onOpenSettings={() => setIsSettingsOpen(true)}
        appLanguage={appLanguage}
        setAppLanguage={setAppLanguage}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        groqApiKey={groqApiKey}
        setGroqApiKey={setGroqApiKey}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
      />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Hero Section */}
        {!sessionData && (
          <div className="text-center max-w-3xl mx-auto mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/40 border border-red-800/40 text-red-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> YouTube AI Intelligent Agent
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

        {/* Video Input Box */}
        <VideoInput
          videoUrl={videoUrl}
          setVideoUrl={setVideoUrl}
          onProcess={handleProcessVideo}
          loading={loading}
          manualTranscript={manualTranscript}
          setManualTranscript={setManualTranscript}
        />

        {/* Error Notification */}
        {errorMsg && (
          <div className="max-w-4xl mx-auto mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg('')}
              className="text-slate-400 hover:text-white text-xs underline ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Content Display Area */}
        {sessionData ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Video Player & Meta */}
            <div className="lg:col-span-6 space-y-4">
              <VideoPlayer
                videoId={sessionData.video_id}
                sessionData={sessionData}
              />
            </div>

            {/* Right Column: Tab Navigation & Content */}
            <div className="lg:col-span-6">
              {/* Tab Selector with Universal Reload Button */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 mb-5">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {/* 1st: Overview */}
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                      activeTab === 'overview'
                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>{appLanguage === 'en' ? 'What Was Taught (Overview)' : 'क्या सिखाया गया है (Overview)'}</span>
                  </button>

                  {/* 2nd Place: Chat With Video */}
                  <button
                    onClick={() => setActiveTab('chat')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                      activeTab === 'chat'
                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{appLanguage === 'en' ? 'Chat With Video' : 'वीडियो से चैट करें'}</span>
                  </button>

                  {/* 3rd Place: Agent Quiz */}
                  <button
                    onClick={() => setActiveTab('quiz')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                      activeTab === 'quiz'
                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>{appLanguage === 'en' ? `Agent Quiz (${sessionData.quiz?.length || 0})` : `Agent Quiz (${sessionData.quiz?.length || 0})`}</span>
                  </button>
                </div>

                {/* Universal Reload Button (Visible from all 3 tabs) */}
                <button
                  onClick={handleProcessVideo}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-red-400 hover:text-red-300 font-semibold shadow transition whitespace-nowrap disabled:opacity-50"
                  title={appLanguage === 'en' ? 'Re-analyze in current language' : 'पुनः विश्लेषण करें'}
                >
                  <span>{loading ? '⏳' : '🔄'}</span>
                  <span>{appLanguage === 'en' ? 'Reload in English' : 'हिन्दी में पुनः विश्लेषण करें'}</span>
                </button>
              </div>

              {/* Tab Views */}
              <div className="bg-transparent">
                {activeTab === 'overview' && (
                  <OverviewTab overview={sessionData.overview} />
                )}

                {activeTab === 'quiz' && (
                  <QuizTab
                    quiz={sessionData.quiz}
                    onRegenerateQuiz={handleRegenerateQuiz}
                    regenerating={regeneratingQuiz}
                  />
                )}

                {activeTab === 'chat' && (
                  <ChatTab
                    chatMessages={chatMessages}
                    onSendMessage={handleSendMessage}
                    loading={chatLoading}
                    sessionId={sessionData.session_id}
                  />
                )}
              </div>
            </div>

          </div>
        )}

      </main>

    </div>
  );
}
