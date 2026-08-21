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
        setAttemptId(attemptRes.data.attempt.id);

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

  if (loading) return <div className="loading animate-fade-in">Launching JEE Mains Physics Exam Portal...</div>;
  if (error || !quiz) return <div className="alert alert-danger animate-fade-in" style={{ margin: '40px' }}>{error || 'Quiz not found'}</div>;

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
      await client.post(`/attempts/${attemptId}/submit`, { responses: answersPayload });
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
    <div className="animate-fade-in" style={{ background: 'var(--color-bg)', minHeight: '100vh', color: 'var(--color-text)', fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header Bar (NTA JEE Style) */}
      <header style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-accent-dark)', letterSpacing: '0.5px' }}>
            NTA JEE MAINS SIMULATOR • CLASS 10 PHYSICS
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '2px 0 0 0', color: 'var(--color-text-dark)' }}>
            {quiz.title}
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Circular Countdown Timer */}
          <div style={{ background: 'var(--color-accent-light)', border: '1px solid var(--color-accent)', borderRadius: '12px', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>⏱️</span>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--color-text-light)', fontWeight: 700 }}>TIME REMAINING</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-accent-dark)' }}>{formatTimer(timeLeft)}</div>
            </div>
          </div>

          <button onClick={() => setShowFormulaDrawer(!showFormulaDrawer)} className="btn btn-outline" style={{ fontSize: '13px' }}>
            📐 Formulas & Constants
          </button>

          <button onClick={handleTriggerAiHint} className="btn btn-primary" style={{ fontSize: '13px' }}>
            🤖 Socratic AI Hint
          </button>
        </div>
      </header>

      {/* Main Workspace (Split View) */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Panel: Question Workspace */}
        <div style={{ flex: 1, padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            {/* Question Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-accent-dark)' }}>
                Question {currentIndex + 1} of {quiz.questions.length}
              </span>
              <span className="badge" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)', border: '1px solid var(--color-primary-light)', fontSize: '11px' }}>
                Single Choice MCQ (Class 10 Physics)
              </span>
            </div>

            {/* Question Text */}
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-dark)', lineHeight: 1.6, marginBottom: '28px' }}>
              {currentQ.text}
            </div>

            {/* Optional Image / Diagram */}
            {currentQ.imageUrl && (
              <div style={{ marginBottom: '28px', textAlign: 'center' }}>
                <img src={currentQ.imageUrl} alt="Physics Diagram" style={{ maxWidth: '100%', maxHeight: '240px', borderRadius: '16px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)' }} />
              </div>
            )}

            {/* MCQ Options A, B, C, D */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '32px' }}>
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
                      padding: '16px 20px',
                      borderRadius: '16px',
                      background: isSelected ? 'var(--color-accent-light)' : 'var(--color-surface)',
                      border: isSelected ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                      color: isSelected ? 'var(--color-accent-dark)' : 'var(--color-text)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      transition: 'all 0.2s ease',
                      boxShadow: isSelected ? 'var(--shadow-sm)' : 'inset 0 1px 2px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isSelected ? 'var(--color-accent)' : 'var(--color-bg)',
                      color: isSelected ? 'var(--color-text-inverse)' : 'var(--color-text-light)',
                      border: isSelected ? 'none' : '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '14px'
                    }}>
                      {opt.key}
                    </div>
                    <div style={{ fontSize: '15.5px', fontWeight: 600 }}>{opt.text}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Navigation Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={handleMarkForReview} className="btn" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)', border: '1px solid var(--color-primary)', fontSize: '14px' }}>
                🟪 Mark for Review & Next
              </button>
              <button onClick={handleClearResponse} className="btn btn-outline" style={{ fontSize: '14px' }}>
                Clear Response
              </button>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={handleSaveAndNext} className="btn btn-primary" style={{ fontSize: '14px', padding: '12px 28px' }}>
                Save & Next ➔
              </button>
              <button onClick={handleFinalSubmit} className="btn btn-danger" style={{ fontSize: '14px', padding: '12px 24px' }}>
                Submit Exam
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: Official 5-State Question Palette */}
        <div style={{ width: '340px', background: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '-4px 0 16px rgba(0,0,0,0.02)' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-dark)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Question Palette
            </h3>

            {/* Legend Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px', fontSize: '12px', color: 'var(--color-text-light)', fontWeight: 500 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: 'var(--color-success)' }} /> Answered ({countAnswered})
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: 'var(--color-danger)' }} /> Not Answered ({countNotAnswered})
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: 'var(--color-text-light)', opacity: 0.5 }} /> Not Visited ({countNotVisited})
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: 'var(--color-eye)' }} /> Marked ({countMarked})
              </div>
            </div>

            {/* Question Buttons Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
              {quiz.questions.map((q, idx) => {
                const stat = qStatuses[q.id] || { state: 'NOT_VISITED' };
                const isCurrent = idx === currentIndex;

                let bg = 'var(--color-bg)'; // default NOT_VISITED
                let textColor = 'var(--color-text-light)';
                if (stat.state === 'ANSWERED') { bg = 'var(--color-success)'; textColor = 'var(--color-text-inverse)'; }
                else if (stat.state === 'NOT_ANSWERED') { bg = 'var(--color-danger)'; textColor = 'var(--color-text-inverse)'; }
                else if (stat.state === 'MARKED_FOR_REVIEW') { bg = 'var(--color-eye)'; textColor = 'var(--color-text-inverse)'; }
                else if (stat.state === 'ANSWERED_AND_MARKED') { bg = 'var(--color-primary)'; textColor = 'var(--color-text-inverse)'; }

                return (
                  <button
                    key={q.id}
                    onClick={() => handleNavigateQuestion(idx)}
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '10px',
                      background: bg,
                      color: textColor,
                      fontWeight: 800,
                      fontSize: '14px',
                      border: isCurrent ? '2px solid var(--color-text-dark)' : '1px solid var(--color-border)',
                      boxShadow: isCurrent ? 'var(--shadow-md)' : 'none',
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

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
            <button onClick={handleFinalSubmit} className="btn btn-danger" style={{ width: '100%', padding: '14px', fontWeight: 800, fontSize: '14px' }}>
              Finish & Submit Exam
            </button>
          </div>
        </div>
      </div>

      {/* Physics Formula Drawer Overlay */}
      {showFormulaDrawer && (
        <div style={{ position: 'fixed', top: 0, right: 0, width: '400px', height: '100vh', background: 'var(--glass-bg)', borderLeft: '1px solid var(--color-border)', padding: '32px', zIndex: 1000, overflowY: 'auto', backdropFilter: 'blur(24px)', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)' }} className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', color: 'var(--color-accent-dark)', fontWeight: 800 }}>📐 Class 10 Physics Formulas</h3>
            <button onClick={() => setShowFormulaDrawer(false)} className="btn btn-outline" style={{ padding: '6px 12px' }}>✕</button>
          </div>
          <div style={{ fontSize: '14px', color: 'var(--color-text)', lineHeight: 1.8 }}>
            <h4 style={{ color: 'var(--color-text-dark)', marginTop: '16px', fontWeight: 700 }}>⚡ Electricity</h4>
            <p>• Ohm's Law: <code style={{background:'var(--color-surface)', padding:'2px 6px', borderRadius:'4px'}}>V = I × R</code></p>
            <p>• Resistance in Series: <code style={{background:'var(--color-surface)', padding:'2px 6px', borderRadius:'4px'}}>R_s = R₁ + R₂ + R₃</code></p>
            <p>• Resistance in Parallel: <code style={{background:'var(--color-surface)', padding:'2px 6px', borderRadius:'4px'}}>1/R_p = 1/R₁ + 1/R₂</code></p>
            <p>• Electric Power: <code style={{background:'var(--color-surface)', padding:'2px 6px', borderRadius:'4px'}}>P = V × I = I²R = V²/R</code></p>
            <p>• Joule's Heating: <code style={{background:'var(--color-surface)', padding:'2px 6px', borderRadius:'4px'}}>H = I² × R × t</code></p>

            <h4 style={{ color: 'var(--color-text-dark)', marginTop: '24px', fontWeight: 700 }}>💡 Optics</h4>
            <p>• Mirror Formula: <code style={{background:'var(--color-surface)', padding:'2px 6px', borderRadius:'4px'}}>1/f = 1/v + 1/u</code></p>
            <p>• Lens Formula: <code style={{background:'var(--color-surface)', padding:'2px 6px', borderRadius:'4px'}}>1/f = 1/v - 1/u</code></p>
            <p>• Power of Lens: <code style={{background:'var(--color-surface)', padding:'2px 6px', borderRadius:'4px'}}>P = 1 / f (in m)</code></p>
            <p>• Refractive Index: <code style={{background:'var(--color-surface)', padding:'2px 6px', borderRadius:'4px'}}>n = c / v</code></p>
          </div>
        </div>
      )}

      {/* Socratic AI Tutor Drawer Overlay */}
      {showAiDrawer && (
        <div style={{ position: 'fixed', top: 0, right: 0, width: '440px', height: '100vh', background: 'var(--glass-bg)', backdropFilter: 'blur(24px)', borderLeft: '2px solid var(--color-primary)', padding: '32px', zIndex: 1000, overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '-10px 0 30px rgba(79, 70, 229, 0.15)' }} className="animate-fade-in">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>🤖</span>
                <h3 style={{ fontSize: '18px', color: 'var(--color-primary-dark)', margin: 0, fontWeight: 800 }}>Socratic AI Physics Tutor</h3>
              </div>
              <button onClick={() => setShowAiDrawer(false)} className="btn btn-outline" style={{ padding: '6px 12px' }}>✕</button>
            </div>

            {aiLoading ? (
              <div className="loading" style={{ padding: '60px 0', textAlign: 'center', color: 'var(--color-primary-dark)' }}>
                Consulting NCERT Physics Vector Knowledge Base...
              </div>
            ) : (
              <div>
                <div style={{ background: 'var(--color-primary-light)', border: '1px solid var(--color-primary)', borderRadius: '16px', padding: '20px', fontSize: '14.5px', color: 'var(--color-text-dark)', lineHeight: 1.6, marginBottom: '24px', boxShadow: 'var(--shadow-sm)' }}>
                  {aiHintText}
                </div>

                {aiSources.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '12.5px', color: 'var(--color-text-light)', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 800 }}>
                      📌 Grounded NCERT Textbook Sources
                    </h4>
                    {aiSources.map((src, i) => (
                      <div key={i} style={{ background: 'var(--color-surface)', borderRadius: '12px', padding: '14px 16px', fontSize: '13px', color: 'var(--color-text)', marginBottom: '12px', borderLeft: '4px solid var(--color-accent)', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ fontWeight: 800, color: 'var(--color-accent-dark)' }}>{src.title}</div>
                        <div style={{ fontStyle: 'italic', margin: '6px 0', lineHeight: 1.5 }}>"{src.excerpt}"</div>
                        {src.page && <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 600 }}>{src.page}</div>}
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
