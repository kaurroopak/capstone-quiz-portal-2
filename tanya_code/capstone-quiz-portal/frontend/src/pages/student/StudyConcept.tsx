import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// ── Types ─────────────────────────────────────
interface TopicContent { learnText: string; notes: string; examples: string; formula: string; }
interface TopicDetail {
  id: string;
  name: string;
  chapter: { name: string };
  quizzes: { id: string; title: string; difficulty: string; duration: number; _count: { questions: number } }[];
}
interface ChatMsg { id: string; message: string; sender: 'USER' | 'AI'; sources?: { title: string; excerpt: string; page?: string }[]; }

// ── Helpers ───────────────────────────────────
function masteryColor(pct: number): string {
  if (pct >= 80) return 'var(--mastery-100)';
  if (pct >= 60) return 'var(--mastery-80)';
  if (pct >= 40) return 'var(--mastery-60)';
  if (pct >= 20) return 'var(--mastery-40)';
  if (pct > 0)   return 'var(--mastery-20)';
  return 'var(--mastery-0)';
}

function renderContent(text: string) {
  return text.split('\n').map((line, i) => (
    <p key={i} style={{ marginBottom: '10px', lineHeight: 1.7, fontSize: '14.5px', color: 'var(--ink-soft)' }}>
      {line}
    </p>
  ));
}

// ── Component ─────────────────────────────────
export const StudyConcept: React.FC = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [content, setContent] = useState<TopicContent | null>(null);
  const [topicDetail, setTopicDetail] = useState<TopicDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'LEARN' | 'PRACTICE' | 'TUTOR'>('LEARN');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Learn tab state
  const [learned, setLearned] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(0);
  const [showXpBurst, setShowXpBurst] = useState(false);
  const [topicMastery, setTopicMastery] = useState(0);
  const [userTheta, setUserTheta] = useState(0.0);

  // Tutor chat state
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Fetch data ────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [contentRes, chaptersRes, dashRes] = await Promise.all([
          client.get(`/study/${topicId}`),
          client.get('/chapters'),
          client.get('/analytics/student')
        ]);

        setContent(contentRes.data);

        // Find topic detail
        let found: TopicDetail | null = null;
        for (const ch of chaptersRes.data) {
          const t = ch.topics.find((x: any) => x.id === topicId);
          if (t) {
            found = { id: t.id, name: t.name, chapter: { name: ch.name }, quizzes: t.quizzes };
            break;
          }
        }
        setTopicDetail(found);

        // Set learned state & mastery
        const dash = dashRes.data;
        const learnedList: string[] = dash.learnedTopics || [];
        setLearned(learnedList.includes(topicId!));
        setUserTheta(dash.theta ?? 0.0);

        const allTopics = [...(dash.strongTopics || []), ...(dash.weakTopics || []), ...(dash.improvingTopics || [])];
        const tInfo = allTopics.find((t: any) => t.topicId === topicId);
        setTopicMastery(tInfo?.averageScore ?? 0);
      } catch (err) {
        console.error(err);
        setError('Failed to load module content.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [topicId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ── Mark Learn Viewed ──────────────────────
  const handleMarkLearned = useCallback(async () => {
    if (!topicId) return;
    try {
      const res = await client.post(`/study/${topicId}/learn-viewed`);
      setLearned(true);
      if (!res.data.alreadyLearned && res.data.xpAwarded > 0) {
        setXpAwarded(res.data.xpAwarded);
        setShowXpBurst(true);
        setTimeout(() => setShowXpBurst(false), 2500);
      }
    } catch (err) {
      console.error(err);
    }
  }, [topicId]);

  // ── Start Quiz ─────────────────────────────
  const handleStartQuiz = async (quizId: string) => {
    try {
      const res = await client.post('/attempts/start', { quizId });
      navigate(`/student/quiz/${quizId}`, {
        state: { attempt: res.data.attempt, cachedProgress: res.data.cachedProgress }
      });
    } catch (err) {
      console.error(err);
      alert('Failed to start quiz.');
    }
  };

  // ── AI Tutor chat ──────────────────────────
  const handleSendTutor = async (msg?: string) => {
    const text = (msg || chatInput).trim();
    if (!text || chatSending) return;
    setChatSending(true);
    setChatInput('');

    const tempId = Math.random().toString();
    setChatMessages(prev => [...prev, { id: tempId, message: text, sender: 'USER' }]);

    // Detect "still stuck" escalation
    const isStuck = /still stuck|don.t understand|confused|again|explain more/i.test(text);
    const nextHintLevel = isStuck ? hintLevel + 1 : hintLevel;
    setHintLevel(nextHintLevel);

    try {
      const res = await client.post('/ai-tutor/chat', {
        message: text,
        topicId,
        theta: userTheta,
        topicMastery,
        hintLevel: nextHintLevel
      });
      setChatMessages(prev => [
        ...prev.filter(m => m.id !== tempId),
        res.data.userMessage,
        { ...res.data.aiMessage, sources: res.data.sources || [] }
      ]);
    } catch (err) {
      setChatMessages(prev => [...prev.filter(m => m.id !== tempId), {
        id: Math.random().toString(), message: 'Tutor unavailable. Check your network.', sender: 'AI'
      }]);
    } finally {
      setChatSending(false);
    }
  };

  // ── Loading / Error ────────────────────────
  if (loading) return <div className="loading animate-fade-in">Loading module...</div>;
  if (error || !content) return <div className="alert alert-danger" style={{ margin: '40px' }}>{error || 'No content found.'}</div>;

  const mColor = masteryColor(topicMastery);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '860px', margin: '0 auto', padding: '28px 28px 60px' }}>

      {/* ── Breadcrumb + Header ─────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
            <Link to="/student/chapters" style={{ color: 'inherit', textDecoration: 'none' }}>My Modules</Link>
            <span style={{ margin: '0 6px' }}>›</span>
            {topicDetail?.chapter.name}
          </div>
          <h1 className="display-heading">{topicDetail?.name || 'Module'}</h1>
        </div>

        {/* Mastery badge */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
            BKT Mastery
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: mColor, fontVariantNumeric: 'tabular-nums' }}>
            {topicMastery > 0 ? `${topicMastery}%` : '—'}
          </div>
          <div className="mastery-bar-track" style={{ marginTop: '5px', width: '90px' }}>
            <div className="mastery-bar-fill" style={{ width: `${topicMastery}%`, background: mColor }} />
          </div>
        </div>
      </div>

      {/* ── XP Burst ────────────────────────── */}
      {showXpBurst && (
        <div style={{
          position: 'fixed', top: '80px', right: '30px', zIndex: 9999,
          background: 'var(--ink)', color: 'var(--paper)',
          padding: '12px 20px', borderRadius: '12px',
          fontSize: '14px', fontWeight: 700,
          animation: 'fadeInUp 0.3s ease',
          boxShadow: 'var(--shadow-lg)'
        }}>
          +{xpAwarded} XP — Learn tab unlocked! 🎉
        </div>
      )}

      {/* ── Tab Bar ─────────────────────────── */}
      <div style={{ background: '#FFFFFF', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div className="tab-bar">
          {(['LEARN', 'PRACTICE', 'TUTOR'] as const).map(tab => {
            const labels = { LEARN: '📖 Learn', PRACTICE: '📝 Practice', TUTOR: '🤖 Ask Tutor' };
            const locked = tab === 'PRACTICE' && !learned;
            return (
              <button
                key={tab}
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => { if (!locked) setActiveTab(tab); }}
                style={{ opacity: locked ? 0.45 : 1, cursor: locked ? 'not-allowed' : 'pointer', position: 'relative' }}
                title={locked ? 'Complete the Learn tab first to unlock Practice' : undefined}
              >
                {labels[tab]}
                {locked && <span style={{ marginLeft: '6px', fontSize: '10px' }}>🔒</span>}
              </button>
            );
          })}
        </div>

        {/* ════ LEARN TAB ════════════════════ */}
        {activeTab === 'LEARN' && (
          <div style={{ padding: '28px' }}>
            {/* Inline sub-tabs for learn content */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
              {[
                { key: 'concept', label: '💡 Core Concept', content: content.learnText },
                { key: 'notes',   label: '📌 Notes',        content: content.notes },
                { key: 'formula', label: '∑ Formulas',      content: content.formula },
                { key: 'example', label: '🧪 Examples',     content: content.examples },
              ].map(({ key, label, content: text }) => (
                <LearnSection key={key} label={label} text={text} />
              ))}
            </div>

            {/* Mark as Learned CTA */}
            {!learned ? (
              <div style={{
                marginTop: '24px',
                background: 'linear-gradient(135deg, var(--paper-2), #FFFFFF)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '20px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap'
              }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '15px', marginBottom: '4px' }}>
                    Done reading?
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>
                    Mark this topic as learned to unlock the Practice quiz and earn +10 XP.
                  </div>
                </div>
                <button className="btn btn-primary" style={{ flexShrink: 0 }} onClick={handleMarkLearned}>
                  ✓ Mark as Learned
                </button>
              </div>
            ) : (
              <div style={{
                marginTop: '24px',
                background: 'var(--success-bg)',
                border: '1px solid rgba(5,150,105,0.2)',
                borderRadius: '12px',
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span style={{ fontSize: '16px' }}>✅</span>
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#047857' }}>
                  Learned! Practice is now unlocked.{' '}
                  <button
                    onClick={() => setActiveTab('PRACTICE')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#059669', fontWeight: 700, textDecoration: 'underline', fontSize: '13.5px' }}
                  >
                    Take Practice Quiz →
                  </button>
                </span>
              </div>
            )}
          </div>
        )}

        {/* ════ PRACTICE TAB ═════════════════ */}
        {activeTab === 'PRACTICE' && learned && (
          <div style={{ padding: '28px' }}>
            <h2 className="section-heading" style={{ marginBottom: '6px' }}>Practice Quizzes</h2>
            <p style={{ fontSize: '13.5px', color: 'var(--ink-muted)', marginBottom: '20px' }}>
              Questions adapt to your IRT ability (θ = {userTheta >= 0 ? '+' : ''}{userTheta.toFixed(2)}).
            </p>

            {topicDetail?.quizzes && topicDetail.quizzes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {topicDetail.quizzes.map(quiz => (
                  <div key={quiz.id} style={{
                    background: 'var(--paper-2)', border: '1px solid var(--border)',
                    borderRadius: '12px', padding: '18px 20px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px'
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '15px', marginBottom: '6px' }}>{quiz.title}</div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span className={`badge badge-${quiz.difficulty.toLowerCase()}`}>{quiz.difficulty}</span>
                        <span style={{ fontSize: '12px', color: 'var(--ink-muted)', fontWeight: 500 }}>
                          {quiz._count?.questions} questions · {Math.round(quiz.duration / 60)} min
                        </span>
                        <span style={{
                          fontSize: '11px', fontWeight: 700, padding: '2px 8px',
                          borderRadius: '20px', background: 'var(--accent-light)',
                          color: 'var(--accent-dark)', border: '1px solid var(--accent-border)'
                        }}>
                          Adjusted to your θ
                        </span>
                      </div>
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{ flexShrink: 0 }}
                      onClick={() => handleStartQuiz(quiz.id)}
                    >
                      Start Quiz →
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center', padding: '40px',
                background: 'var(--paper-2)', borderRadius: '12px',
                border: '1px dashed var(--border-strong)'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
                <div style={{ fontWeight: 600, color: 'var(--ink-muted)', fontSize: '14px' }}>
                  No quizzes published for this topic yet.
                </div>
                <div style={{ fontSize: '13px', color: 'var(--ink-muted)', marginTop: '6px' }}>
                  You can still study the Learn content and ask the AI Tutor questions.
                </div>
                <button
                  className="btn btn-accent"
                  style={{ marginTop: '16px' }}
                  onClick={() => setActiveTab('TUTOR')}
                >
                  🤖 Ask the Tutor instead
                </button>
              </div>
            )}
          </div>
        )}

        {/* ════ TUTOR TAB ════════════════════ */}
        {activeTab === 'TUTOR' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '520px' }}>
            {/* Header */}
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--paper-2)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '14px' }}>
                  🤖 Socratic AI Tutor — {topicDetail?.name}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                  Responses calibrated to your level (θ={userTheta.toFixed(2)}, mastery={topicMastery}%)
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['What is this topic about?', 'Give me a hint', 'Explain a formula'].map((prompt, i) => (
                  <button
                    key={i}
                    className="btn btn-outline"
                    style={{ fontSize: '11px', padding: '5px 10px' }}
                    onClick={() => handleSendTutor(prompt + ' for ' + (topicDetail?.name || 'this topic'))}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat area */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '16px 20px',
              display: 'flex', flexDirection: 'column', gap: '12px',
              background: '#FFFFFF'
            }}>
              {chatMessages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-muted)' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>🤖</div>
                  <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>Ask me anything about {topicDetail?.name}</div>
                  <div style={{ fontSize: '13px' }}>I'll guide you Socratically — more hints as you get stuck.</div>
                </div>
              )}

              {chatMessages.map(msg => {
                const isAi = msg.sender === 'AI';
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignSelf: isAi ? 'flex-start' : 'flex-end', maxWidth: '84%' }}>
                    {isAi && (
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ink-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        AI Tutor
                      </div>
                    )}
                    <div className={isAi ? 'chat-bubble-ai' : 'chat-bubble-user'}
                      style={{ whiteSpace: 'pre-line', lineHeight: 1.65 }}>
                      {msg.message}
                    </div>
                    {/* Citation chips */}
                    {isAi && msg.sources && msg.sources.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' }}>
                        {msg.sources.map((src, i) => (
                          <span key={i} className="citation-chip" title={src.excerpt}>
                            📌 {src.title.split(' - ')[1] || src.title}
                            {src.page ? `, ${src.page}` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* "Still stuck?" escalation prompt */}
                    {isAi && hintLevel < 3 && (
                      <button
                        onClick={() => handleSendTutor('Still stuck, explain more directly')}
                        style={{
                          alignSelf: 'flex-start',
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--ink-muted)', fontSize: '11px', fontWeight: 600,
                          marginTop: '4px', textDecoration: 'underline'
                        }}
                      >
                        Still stuck? Get a more direct hint →
                      </button>
                    )}
                  </div>
                );
              })}

              {chatSending && (
                <div className="chat-bubble-ai" style={{ alignSelf: 'flex-start' }}>
                  <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', fontSize: '14px' }}>⏳</span>
                  {' '}Thinking...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--paper-2)' }}>
              <form onSubmit={e => { e.preventDefault(); handleSendTutor(); }} style={{ display: 'flex', gap: '8px' }}>
                <input
                  className="form-input"
                  placeholder="Ask about this topic..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  disabled={chatSending}
                  style={{ flex: 1, fontSize: '14px', padding: '10px 14px' }}
                />
                <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }} disabled={chatSending || !chatInput.trim()}>
                  Send
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Learn Section Sub-Component ───────────────
const LearnSection: React.FC<{ label: string; text: string }> = ({ label, text }) => {
  const [open, setOpen] = useState(true);
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: '10px',
      overflow: 'hidden',
      marginBottom: '8px',
      width: '100%'
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left',
          padding: '12px 16px',
          background: open ? 'var(--paper-2)' : '#FFFFFF',
          border: 'none', cursor: 'pointer',
          fontWeight: 700, fontSize: '13.5px', color: 'var(--ink)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          transition: 'background 0.15s'
        }}
      >
        {label}
        <span style={{ color: 'var(--ink-muted)', fontSize: '12px', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>▶</span>
      </button>
      {open && (
        <div style={{ padding: '16px 18px', background: '#FFFFFF', borderTop: '1px solid var(--border)' }}>
          {label.includes('Formula') ? (
            <pre style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '14px',
              background: 'var(--paper-2)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '16px',
              whiteSpace: 'pre-wrap',
              color: 'var(--ink)',
              fontWeight: 500,
              lineHeight: 1.7
            }}>{text}</pre>
          ) : label.includes('Example') ? (
            <div style={{
              borderLeft: '3px solid var(--accent)',
              paddingLeft: '16px',
              fontFamily: 'var(--font-sans)',
              whiteSpace: 'pre-line',
              fontSize: '14px',
              lineHeight: 1.7,
              color: 'var(--ink-soft)'
            }}>{text}</div>
          ) : (
            <div>{text.split('\n').map((line, i) => (
              <p key={i} style={{ marginBottom: '9px', lineHeight: 1.7, fontSize: '14px', color: 'var(--ink-soft)' }}>{line}</p>
            ))}</div>
          )}
        </div>
      )}
    </div>
  );
};
