import React, { useState } from 'react';
import { HelpCircle, CheckCircle2, XCircle, RotateCw, Award, Loader2, Sparkles, ChevronRight } from 'lucide-react';

export default function QuizTab({ quiz, onRegenerateQuiz, regenerating }) {
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  if (!quiz || quiz.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        No quiz questions available. Please process a video first.
      </div>
    );
  }

  const handleSelectOption = (questionId, option) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  // Calculate score
  const correctCount = quiz.reduce((acc, q) => {
    const userSelected = selectedAnswers[q.id];
    if (userSelected && q.correct_answer && userSelected.trim().startsWith(q.correct_answer.charAt(0))) {
      return acc + 1;
    }
    return acc;
  }, 0);

  const resetQuiz = () => {
    setSelectedAnswers({});
    setShowResults(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-400" />
            Agent Assessment Quiz (सीख की जाँच)
          </h2>
          <p className="text-xs text-slate-400">
            Agent ने वीडियो में पढ़ाए गए महत्वपूर्ण विषयों पर ये प्रश्न तैयार किए हैं
          </p>
        </div>

        <div className="flex items-center gap-2">
          {Object.keys(selectedAnswers).length > 0 && (
            <button
              onClick={resetQuiz}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white transition"
            >
              Reset Answers
            </button>
          )}

          <button
            onClick={onRegenerateQuiz}
            disabled={regenerating}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition"
          >
            {regenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCw className="w-3.5 h-3.5" />
            )}
            <span>{regenerating ? 'Generating...' : 'New Questions'}</span>
          </button>
        </div>
      </div>

      {/* Score Banner if user answered questions */}
      {Object.keys(selectedAnswers).length === quiz.length && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Award className="w-8 h-8 text-amber-400" />
            <div>
              <h3 className="font-bold text-white text-sm">Quiz Completed!</h3>
              <p className="text-xs text-indigo-200">
                You scored <span className="font-extrabold text-amber-300">{correctCount}</span> out of <span className="font-extrabold">{quiz.length}</span> correct
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {Math.round((correctCount / quiz.length) * 100)}% Accuracy
          </span>
        </div>
      )}

      {/* Quiz Questions List */}
      <div className="space-y-5">
        {quiz.map((item, index) => {
          const selected = selectedAnswers[item.id];
          const hasAnswered = Boolean(selected);
          const isCorrect = hasAnswered && selected.trim().startsWith(item.correct_answer.charAt(0));

          return (
            <div
              key={item.id || index}
              className={`p-5 rounded-2xl border transition-all ${
                hasAnswered
                  ? isCorrect
                    ? 'bg-slate-900/90 border-emerald-800/60 shadow-lg shadow-emerald-950/20'
                    : 'bg-slate-900/90 border-rose-800/60 shadow-lg shadow-rose-950/20'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Question Title */}
              <div className="flex items-start gap-3 mb-4">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 shrink-0">
                  {index + 1}
                </span>
                <h3 className="font-semibold text-slate-100 text-sm leading-snug">
                  {item.question}
                </h3>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
                {item.options.map((opt, optIdx) => {
                  const isThisSelected = selected === opt;
                  const isThisCorrect = opt.trim().startsWith(item.correct_answer.charAt(0));

                  let buttonStyle = 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-600 hover:bg-slate-800/40';

                  if (hasAnswered) {
                    if (isThisCorrect) {
                      buttonStyle = 'bg-emerald-950/50 border-emerald-700 text-emerald-200 font-medium';
                    } else if (isThisSelected) {
                      buttonStyle = 'bg-rose-950/50 border-rose-700 text-rose-200';
                    } else {
                      buttonStyle = 'bg-slate-950/40 border-slate-800/60 text-slate-500 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectOption(item.id, opt)}
                      className={`p-3 rounded-xl border text-left text-xs transition flex items-center justify-between ${buttonStyle}`}
                    >
                      <span className="flex-1 pr-2">{opt}</span>
                      {hasAnswered && isThisCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      {hasAnswered && isThisSelected && !isThisCorrect && (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation Card upon answering */}
              {hasAnswered && (
                <div className="mt-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs animate-fadeIn">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    {isCorrect ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> सही उत्तर!
                      </span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> गलत उत्तर! सही जवाब: {item.correct_answer}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    <span className="font-semibold text-slate-300">Explanation:</span> {item.explanation}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
