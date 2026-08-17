import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';

function masteryColor(pct: number): string {
  if (pct >= 80) return 'var(--mastery-100)';
  if (pct >= 60) return 'var(--mastery-80)';
  if (pct >= 40) return 'var(--mastery-60)';
  if (pct >= 20) return 'var(--mastery-40)';
  if (pct > 0)   return 'var(--mastery-20)';
  return 'var(--mastery-0)';
}

const CHAPTER_COLORS: Record<string, string> = {
  'Light': 'var(--ch-optics)',
  'Electricity': 'var(--ch-electric)',
  'Human Eye': 'var(--ch-eye)',
  'Magnetic': 'var(--ch-magnet)',
};
function chapterColor(chName: string): string {
  for (const [key, val] of Object.entries(CHAPTER_COLORS)) {
    if (chName.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return 'var(--ink)';
}

interface QuizInfo { id: string; title: string; difficulty: string; duration: number; _count: { questions: number }; }
interface TopicInfo { id: string; name: string; quizzes: QuizInfo[]; }
interface ChapterInfo { id: string; name: string; topics: TopicInfo[]; }

export const StudentChapters: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chapters, setChapters] = useState<ChapterInfo[]>([]);
  const [expandedChapters, setExpandedChapters] = useState<{ [id: string]: boolean }>({});
  const [learnedTopics, setLearnedTopics] = useState<string[]>([]);
  const [topicMastery, setTopicMastery] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Confirm modal for quiz start
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizInfo | null>(null);
  const [startingQuiz, setStartingQuiz] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [chapRes, dashRes] = await Promise.all([
          client.get('/chapters'),
          client.get('/analytics/student')
        ]);
        const chs: ChapterInfo[] = chapRes.data;
        setChapters(chs);
        if (chs.length > 0) setExpandedChapters({ [chs[0].id]: true });

        // Learned topics & mastery from dashboard
        const dash = dashRes.data;
        setLearnedTopics(dash.learnedTopics || []);
        const mMap: Record<string, number> = {};
        [...(dash.strongTopics || []), ...(dash.weakTopics || []), ...(dash.improvingTopics || [])].forEach((t: any) => {
          mMap[t.topicId] = t.averageScore;
        });
        setTopicMastery(mMap);
      } catch (err) {
        console.error(err);
        setError('Failed to load modules.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const toggleChapter = (id: string) =>
    setExpandedChapters(prev => ({ ...prev, [id]: !prev[id] }));

  const handleStartRequest = (quiz: QuizInfo) => {
    setSelectedQuiz(quiz);
    setShowConfirmModal(true);
  };

  const handleConfirmStart = async () => {
    if (!selectedQuiz) return;
    setStartingQuiz(true);
    try {
      const res = await client.post('/attempts/start', { quizId: selectedQuiz.id });
      navigate(`/student/quiz/${selectedQuiz.id}`, {
        state: { attempt: res.data.attempt, cachedProgress: res.data.cachedProgress }
      });
    } catch (err) {
      console.error(err);
      alert('Failed to start quiz. Please try again.');
    } finally {
      setStartingQuiz(false);
      setShowConfirmModal(false);
    }
  };

  if (loading) return <div className="loading animate-fade-in">Loading modules...</div>;
  if (error) return <div className="alert alert-danger" style={{ margin: '40px' }}>{error}</div>;

  return (
    <div style={{ padding: '32px 36px', maxWidth: '1100px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 className="display-heading">My Modules</h1>
        <p style={{ color: 'var(--ink-muted)', fontSize: '14px', marginTop: '6px' }}>
          Open a module to learn the concept, then practice with a quiz, then ask the AI tutor if you're stuck.
        </p>
      </div>

      {chapters.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--ink-muted)' }}>
          No chapters published yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {chapters.map(chapter => {
            const isExpanded = expandedChapters[chapter.id];
            const chColor = chapterColor(chapter.name);
            return (
              <div key={chapter.id} className="accordion">
                <div className="accordion-header" onClick={() => toggleChapter(chapter.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: chColor, flexShrink: 0
                    }} />
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--ink)' }}>
                      {chapter.name}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--ink-muted)', fontWeight: 600 }}>
                      {chapter.topics.length} topics
                    </span>
                  </div>
                  <span style={{
                    transform: isExpanded ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.2s',
                    color: 'var(--ink-muted)', fontSize: '13px'
                  }}>▶</span>
                </div>

                {isExpanded && (
                  <div className="accordion-body">
                    {chapter.topics.length === 0 ? (
                      <p style={{ color: 'var(--ink-muted)', fontStyle: 'italic', fontSize: '13px' }}>
                        No topics added yet.
                      </p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
                        {chapter.topics.map(topic => {
                          const mastery = topicMastery[topic.id] ?? 0;
                          const learned = learnedTopics.includes(topic.id);
                          const hasQuiz = topic.quizzes.length > 0;
                          const mColor = masteryColor(mastery);

                          return (
                            <div key={topic.id} style={{
                              background: '#FFFFFF',
                              border: '1px solid var(--border)',
                              borderRadius: '12px',
                              padding: '18px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px',
                              transition: 'all 0.2s',
                              borderTop: `3px solid ${chColor}`
                            }}
                              className="card-hover"
                            >
                              {/* Topic name */}
                              <div>
                                <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ink)', marginBottom: '4px' }}>
                                  {topic.name}
                                </h3>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{
                                    fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                                    background: learned ? 'var(--success-bg)' : 'var(--paper-3)',
                                    color: learned ? '#047857' : 'var(--ink-muted)',
                                    border: `1px solid ${learned ? 'rgba(5,150,105,0.2)' : 'var(--border)'}`
                                  }}>
                                    {learned ? '✓ Learned' : '📖 Learn first'}
                                  </span>
                                  {hasQuiz && (
                                    <span style={{
                                      fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                                      background: 'var(--accent-light)', color: 'var(--accent-dark)',
                                      border: '1px solid var(--accent-border)'
                                    }}>
                                      {topic.quizzes[0].difficulty}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Mastery bar */}
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    BKT Mastery
                                  </span>
                                  <span style={{ fontSize: '12px', fontWeight: 700, color: mColor }}>
                                    {mastery > 0 ? `${mastery}%` : 'Not attempted'}
                                  </span>
                                </div>
                                <div className="mastery-bar-track">
                                  <div className="mastery-bar-fill" style={{ width: `${mastery}%`, background: mColor }} />
                                </div>
                              </div>

                              {/* CTA buttons */}
                              <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                                <button
                                  className="btn btn-primary"
                                  style={{ flex: 1, fontSize: '12.5px', padding: '8px 12px' }}
                                  onClick={() => navigate(`/student/study/${topic.id}`)}
                                >
                                  {learned ? '→ Open Module' : '📖 Start Learning'}
                                </button>
                                {hasQuiz && learned && (
                                  <button
                                    className="btn btn-outline"
                                    style={{ fontSize: '12px', padding: '8px 12px', flexShrink: 0 }}
                                    onClick={() => handleStartRequest(topic.quizzes[0])}
                                  >
                                    Practice
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm Quiz Modal */}
      {showConfirmModal && selectedQuiz && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', marginBottom: '10px', color: 'var(--ink)' }}>
              Start Practice Quiz
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--ink-muted)', lineHeight: 1.6, marginBottom: '20px' }}>
              <strong style={{ color: 'var(--ink)' }}>{selectedQuiz.title}</strong> —{' '}
              {selectedQuiz._count?.questions} questions, {Math.round(selectedQuiz.duration / 60)} minutes.
              Your progress saves automatically.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setShowConfirmModal(false)} disabled={startingQuiz}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleConfirmStart} disabled={startingQuiz}>
                {startingQuiz ? 'Starting...' : 'Begin Quiz'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
