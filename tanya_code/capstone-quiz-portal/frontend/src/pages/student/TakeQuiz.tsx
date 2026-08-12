import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';

interface Question {
  id: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  imageUrl?: string;
  difficulty: string;
}

interface QuizData {
  id: string;
  title: string;
  description: string;
  duration: number; // in seconds
  questions: Question[];
  topic: {
    name: string;
    chapter: { name: string };
  };
}

// 5 Palette Status Types (JEE Mains standard)
type PaletteState = 'NOT_VISITED' | 'NOT_ANSWERED' | 'ANSWERED' | 'MARKED_FOR_REVIEW' | 'ANSWERED_AND_MARKED';

interface QuestionStatus {
  selectedOption: string | null;
  state: PaletteState;
  timeSpent: number; // in seconds
  answerChanges: number;
}

export const TakeQuiz: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [qStatuses, setQStatuses] = useState<Record<string, QuestionStatus>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [showFormulaDrawer, setShowFormulaDrawer] = useState(false);
  const [showAiDrawer, setShowAiDrawer] = useState(false);
  const [aiHintText, setAiHintText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSources, setAiSources] = useState<any[]>([]);

  const questionTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const startQuizSession = async () => {
      try {
        const res = await client.get(`/quizzes/${id}`);
        const quizData: QuizData = res.data;
        setQuiz(quizData);
        setTimeLeft(quizData.duration);

        // Start attempt in backend
        const attemptRes = await client.post(`/quizzes/${id}/start`);
        setAttemptId(attemptRes.data.id);

        // Initialize statuses
        const initialMap: Record<string, QuestionStatus> = {};
        quizData.questions.forEach((q, idx) => {
          initialMap[q.id] = {
            selectedOption: null,
            state: idx === 0 ? 'NOT_ANSWERED' : 'NOT_VISITED',
            timeSpent: 0,
            answerChanges: 0
          };
        });
        setQStatuses(initialMap);
      } catch (err: any) {
        console.error(err);
        setError('Failed to start quiz attempt session.');
      } finally {
        setLoading(false);
      }
    };

    startQuizSession();
  }, [id]);

  // Overall Countdown Timer
  useEffect(() => {
    if (timeLeft <= 0 || !quiz) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, quiz]);

  // Per-Question Time Spent Tracker
  useEffect(() => {
    if (!quiz || quiz.questions.length === 0) return;
    const currentQId = quiz.questions[currentIndex]?.id;
    if (!currentQId) return;

    // Track time for current question
    questionTimerRef.current = setInterval(() => {
      setQStatuses((prev) => {
        const existing = prev[currentQId] || { selectedOption: null, state: 'NOT_VISITED', timeSpent: 0, answerChanges: 0 };
        return {
          ...prev,
          [currentQId]: {
            ...existing,
            timeSpent: existing.timeSpent + 1
          }
        };
      });
    }, 1000);

    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, [currentIndex, quiz]);

  if (loading) return <div style={{ padding: '40px', color: '#06b6d4', fontWeight: 700 }}>Launching JEE Mains Physics Exam Portal...</div>;
  if (error || !quiz) return <div className="alert alert-danger" style={{ margin: '40px' }}>{error || 'Quiz not found'}</div>;

  const currentQ = quiz.questions[currentIndex];
  const currentStat = qStatuses[currentQ.id] || { selectedOption: null, state: 'NOT_VISITED', timeSpent: 0, answerChanges: 0 };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOptionSelect = (optionKey: string) => {
    setQStatuses((prev) => {
      const existing = prev[currentQ.id];
      const isChange = existing.selectedOption !== null && existing.selectedOption !== optionKey;
      return {
        ...prev,
        [currentQ.id]: {
          ...existing,
          selectedOption: optionKey,
          state: existing.state === 'MARKED_FOR_REVIEW' || existing.state === 'ANSWERED_AND_MARKED' ? 'ANSWERED_AND_MARKED' : 'ANSWERED',
          answerChanges: isChange ? existing.answerChanges + 1 : existing.answerChanges
        }
      };
    });
  };

  const handleClearResponse = () => {
    setQStatuses((prev) => ({
      ...prev,
      [currentQ.id]: {
        ...prev[currentQ.id],
        selectedOption: null,
        state: 'NOT_ANSWERED'
      }
    }));
  };

  const handleMarkForReview = () => {
    setQStatuses((prev) => {
      const existing = prev[currentQ.id];
      const newState: PaletteState = existing.selectedOption ? 'ANSWERED_AND_MARKED' : 'MARKED_FOR_REVIEW';
      return {
        ...prev,
        [currentQ.id]: {
          ...existing,
          state: newState
        }
      };
    });

    if (currentIndex < quiz.questions.length - 1) {
      handleNavigateQuestion(currentIndex + 1);
    }
  };

  const handleSaveAndNext = () => {
    if (currentIndex < quiz.questions.length - 1) {
      handleNavigateQuestion(currentIndex + 1);
    }
  };

  const handleNavigateQuestion = (targetIndex: number) => {
    // Mark target question as NOT_ANSWERED if it was NOT_VISITED
    const targetQId = quiz.questions[targetIndex].id;
    setQStatuses((prev) => {
      const targetStat = prev[targetQId];
      if (targetStat && targetStat.state === 'NOT_VISITED') {
        return {
          ...prev,
          [targetQId]: { ...targetStat, state: 'NOT_ANSWERED' }
        };
      }
      return prev;
    });
    setCurrentIndex(targetIndex);
  };

  const handleTriggerAiHint = async () => {
    setShowAiDrawer(true);
    setAiLoading(true);
    try {
      const res = await client.post('/ai/ask', {
        message: `I need a hint for this Physics question: ${currentQ.text}`,
        topicId: quiz.topic?.chapter?.name || 'Physics',
        questionText: currentQ.text
      });
      setAiHintText(res.data.aiMessage.message);
      setAiSources(res.data.sources || []);
    } catch (e) {
      setAiHintText("Recall the relevant Physics formula for this question and check your units!");
    } finally {
      setAiLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!attemptId) return;

    // Convert qStatuses to payload format
    const answersPayload: Record<string, { selectedAnswer: string | null; timeSpent: number; answerChanges: number }> = {};
    Object.entries(qStatuses).forEach(([qId, stat]) => {
      answersPayload[qId] = {
        selectedAnswer: stat.selectedOption,
        timeSpent: stat.timeSpent,
        answerChanges: stat.answerChanges
      };
    });

    try {
      await client.post(`/quizzes/attempt/${attemptId}/submit`, { answers: answersPayload });
      navigate(`/student/results/${attemptId}`);
    } catch (e) {
      console.error(e);
      alert('Error submitting quiz attempt. Redirecting...');
      navigate('/student/dashboard');
    }
  };

  // Compute Palette Count Summary
  const countAnswered = Object.values(qStatuses).filter((s) => s.state === 'ANSWERED').length;
  const countNotAnswered = Object.values(qStatuses).filter((s) => s.state === 'NOT_ANSWERED').length;
  const countNotVisited = Object.values(qStatuses).filter((s) => s.state === 'NOT_VISITED').length;
  const countMarked = Object.values(qStatuses).filter((s) => s.state === 'MARKED_FOR_REVIEW').length;
  const countAnsweredMarked = Object.values(qStatuses).filter((s) => s.state === 'ANSWERED_AND_MARKED').length;

  return (
    <div style={{ background: '#090d16', minHeight: '100vh', color: '#f8fafc', fontFamily: 'Plus Jakarta Sans, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header Bar (NTA JEE Style) */}
      <header style={{ background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#06b6d4', letterSpacing: '0.5px' }}>
            NTA JEE MAINS SIMULATOR • CLASS 10 PHYSICS
          </div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '2px 0 0 0', color: '#f8fafc' }}>
            {quiz.title}
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Circular Countdown Timer */}
          <div style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid #06b6d4', borderRadius: '12px', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>⏱️</span>
            <div>
              <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700 }}>TIME REMAINING</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#06b6d4' }}>{formatTimer(timeLeft)}</div>
            </div>
          </div>

          <button onClick={() => setShowFormulaDrawer(!showFormulaDrawer)} className="btn" style={{ background: 'rgba(255,255,255,0.08)', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.2)', fontSize: '12px' }}>
            📐 Formulas & Constants
          </button>

          <button onClick={handleTriggerAiHint} className="btn" style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', color: '#fff', border: 'none', fontSize: '12px' }}>
            🤖 Socratic AI Hint
          </button>
        </div>
      </header>

      {/* Main Workspace (Split View) */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Panel: Question Workspace */}
        <div style={{ flex: 1, padding: '28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            {/* Question Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#06b6d4' }}>
                Question {currentIndex + 1} of {quiz.questions.length}
              </span>
              <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', border: '1px solid #6366f1', fontSize: '11px' }}>
                Single Choice MCQ (Class 10 Physics)
              </span>
            </div>

            {/* Question Text */}
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc', lineHeight: 1.6, marginBottom: '24px' }}>
              {currentQ.text}
            </div>

            {/* Optional Image / Diagram */}
            {currentQ.imageUrl && (
              <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                <img src={currentQ.imageUrl} alt="Physics Diagram" style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)' }} />
              </div>
            )}

            {/* MCQ Options A, B, C, D */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {[
                { key: 'A', text: currentQ.optionA },
                { key: 'B', text: currentQ.optionB },
                { key: 'C', text: currentQ.optionC },
                { key: 'D', text: currentQ.optionD }
              ].map((opt) => {
                const isSelected = currentStat.selectedOption === opt.key;
                return (
                  <div
                    key={opt.key}
                    onClick={() => handleOptionSelect(opt.key)}
                    style={{
                      padding: '14px 20px',
                      borderRadius: '12px',
                      background: isSelected ? 'rgba(6, 182, 212, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                      border: isSelected ? '2px solid #06b6d4' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: isSelected ? '#06b6d4' : '#cbd5e1',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: isSelected ? '#06b6d4' : 'rgba(255,255,255,0.05)',
                      color: isSelected ? '#0f172a' : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '13px'
                    }}>
                      {opt.key}
                    </div>
                    <div style={{ fontSize: '14.5px', fontWeight: 500 }}>{opt.text}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Navigation Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleMarkForReview} className="btn" style={{ background: '#6366f1', color: '#fff', border: 'none', fontSize: '13px' }}>
                🟪 Mark for Review & Next
              </button>
              <button onClick={handleClearResponse} className="btn" style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.15)', fontSize: '13px' }}>
                Clear Response
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleSaveAndNext} className="btn btn-primary" style={{ background: '#06b6d4', border: 'none', fontSize: '13px', padding: '10px 24px' }}>
                Save & Next ➔
              </button>
              <button onClick={handleFinalSubmit} className="btn btn-danger" style={{ fontSize: '13px', padding: '10px 20px' }}>
                Submit Exam
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: Official 5-State Question Palette */}
        <div style={{ width: '320px', background: '#0f172a', borderLeft: '1px solid rgba(255,255,255,0.1)', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Question Palette
            </h3>

            {/* Legend Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px', fontSize: '11px', color: '#94a3b8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#10b981' }} /> Answered ({countAnswered})
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#ef4444' }} /> Not Answered ({countNotAnswered})
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#64748b' }} /> Not Visited ({countNotVisited})
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#a855f7' }} /> Marked ({countMarked})
              </div>
            </div>

            {/* Question Buttons Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
              {quiz.questions.map((q, idx) => {
                const stat = qStatuses[q.id] || { state: 'NOT_VISITED' };
                const isCurrent = idx === currentIndex;

                let bg = '#64748b'; // default NOT_VISITED
                if (stat.state === 'ANSWERED') bg = '#10b981';
                else if (stat.state === 'NOT_ANSWERED') bg = '#ef4444';
                else if (stat.state === 'MARKED_FOR_REVIEW') bg = '#a855f7';
                else if (stat.state === 'ANSWERED_AND_MARKED') bg = '#8b5cf6';

                return (
                  <button
                    key={q.id}
                    onClick={() => handleNavigateQuestion(idx)}
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '8px',
                      background: bg,
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '13px',
                      border: isCurrent ? '2px solid #ffffff' : 'none',
                      boxShadow: isCurrent ? '0 0 10px rgba(255,255,255,0.5)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
            <button onClick={handleFinalSubmit} className="btn btn-danger" style={{ width: '100%', padding: '12px', fontWeight: 700, fontSize: '13px' }}>
              Finish & Submit Exam
            </button>
          </div>
        </div>
      </div>

      {/* Physics Formula Drawer Overlay */}
      {showFormulaDrawer && (
        <div style={{ position: 'fixed', top: 0, right: 0, width: '380px', height: '100vh', background: '#0f172a', borderLeft: '1px solid rgba(255,255,255,0.2)', padding: '24px', zIndex: 1000, overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', color: '#06b6d4' }}>📐 Class 10 Physics Formulas</h3>
            <button onClick={() => setShowFormulaDrawer(false)} className="btn" style={{ padding: '4px 10px' }}>✕</button>
          </div>
          <div style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6 }}>
            <h4 style={{ color: '#f8fafc', marginTop: '12px' }}>⚡ Electricity</h4>
            <p>• Ohm's Law: <code>V = I × R</code></p>
            <p>• Resistance in Series: <code>R_s = R₁ + R₂ + R₃</code></p>
            <p>• Resistance in Parallel: <code>1/R_p = 1/R₁ + 1/R₂</code></p>
            <p>• Electric Power: <code>P = V × I = I²R = V²/R</code></p>
            <p>• Joule's Heating: <code>H = I² × R × t</code></p>

            <h4 style={{ color: '#f8fafc', marginTop: '16px' }}>💡 Optics</h4>
            <p>• Mirror Formula: <code>1/f = 1/v + 1/u</code></p>
            <p>• Lens Formula: <code>1/f = 1/v - 1/u</code></p>
            <p>• Power of Lens: <code>P = 1 / f (in meters)</code></p>
            <p>• Refractive Index: <code>n = c / v</code></p>
          </div>
        </div>
      )}

      {/* Socratic AI Tutor Drawer Overlay */}
      {showAiDrawer && (
        <div style={{ position: 'fixed', top: 0, right: 0, width: '420px', height: '100vh', background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(16px)', borderLeft: '1px solid #6366f1', padding: '24px', zIndex: 1000, overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🤖</span>
                <h3 style={{ fontSize: '16px', color: '#a5b4fc', margin: 0 }}>Socratic AI Physics Tutor</h3>
              </div>
              <button onClick={() => setShowAiDrawer(false)} className="btn" style={{ padding: '4px 10px' }}>✕</button>
            </div>

            {aiLoading ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#a5b4fc' }}>
                Consulting NCERT Physics Vector Knowledge Base...
              </div>
            ) : (
              <div>
                <div style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '12px', padding: '16px', fontSize: '13.5px', color: '#f8fafc', lineHeight: 1.6, marginBottom: '20px' }}>
                  {aiHintText}
                </div>

                {aiSources.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
                      📌 Grounded NCERT Textbook Sources
                    </h4>
                    {aiSources.map((src, i) => (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#cbd5e1', marginBottom: '8px', borderLeft: '3px solid #06b6d4' }}>
                        <div style={{ fontWeight: 700, color: '#06b6d4' }}>{src.title}</div>
                        <div style={{ fontStyle: 'italic', margin: '4px 0' }}>"{src.excerpt}"</div>
                        {src.page && <div style={{ fontSize: '10px', color: '#64748b' }}>{src.page}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
