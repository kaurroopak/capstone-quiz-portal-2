import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../../api/client';

interface QuizInfo {
  id: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  duration: number;
  _count: { questions: number };
}

interface TopicInfo {
  id: string;
  name: string;
  quizzes: QuizInfo[];
}

interface ChapterInfo {
  id: string;
  name: string;
  topics: TopicInfo[];
}

export const StudentChapters: React.FC = () => {
  const [chapters, setChapters] = useState<ChapterInfo[]>([]);
  const [expandedChapters, setExpandedChapters] = useState<{ [id: string]: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizInfo | null>(null);
  const [startingQuiz, setStartingQuiz] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const res = await client.get('/chapters');
        setChapters(res.data);
        
        // Expand the first chapter by default if exists
        if (res.data.length > 0) {
          setExpandedChapters({ [res.data[0].id]: true });
        }
      } catch (err) {
        console.error(err);
        setError('Failed to fetch syllabus chapters.');
      } finally {
        setLoading(false);
      }
    };
    fetchChapters();
  }, []);

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }));
  };

  const handleStartRequest = (quiz: QuizInfo) => {
    setSelectedQuiz(quiz);
    setShowConfirmModal(true);
  };

  const handleConfirmStart = async () => {
    if (!selectedQuiz) return;
    setStartingQuiz(true);
    try {
      const res = await client.post('/attempts/start', { quizId: selectedQuiz.id });
      navigate(`/student/quiz/${selectedQuiz.id}`, { state: { attempt: res.data.attempt, cachedProgress: res.data.cachedProgress } });
    } catch (err) {
      console.error(err);
      alert('Failed to start quiz attempt. Please try again.');
    } finally {
      setStartingQuiz(false);
      setShowConfirmModal(false);
    }
  };

  if (loading) {
    return <div style={{ fontWeight: 600, padding: '40px', color: 'var(--color-text-light)' }}>Loading syllabus and topics...</div>;
  }

  if (error) {
    return <div className="alert alert-danger" style={{ margin: '40px' }}>{error}</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 className="header-title">Syllabus Quizzes</h1>
        <p className="header-subtitle">Select a Class 10 chapter to browse topics and practice active quizzes.</p>
      </div>

      {chapters.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-light)', fontSize: '13.5px' }}>
          No chapters or quizzes are currently published by teachers. Please check back later!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {chapters.map((chapter) => {
            const isExpanded = expandedChapters[chapter.id];
            return (
              <div key={chapter.id} className="accordion">
                <div className="accordion-header" onClick={() => toggleChapter(chapter.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-text-dark)', fontSize: '15px' }}>{chapter.name}</span>
                  </div>
                  <span style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', fontWeight: 700, fontSize: '12px' }}>
                    ▶
                  </span>
                </div>

                {isExpanded && (
                  <div className="accordion-body">
                    {chapter.topics.length === 0 ? (
                      <p style={{ fontStyle: 'italic', color: 'var(--color-text-light)', padding: '8px', fontSize: '13px' }}>
                        No topics under this chapter yet.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {chapter.topics.map((topic) => (
                          <div key={topic.id} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
                            <div style={{ marginBottom: '12px' }}>
                              <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>
                                {topic.name}
                              </h3>
                            </div>
                            {topic.quizzes.length === 0 ? (
                              <p style={{ fontStyle: 'italic', fontSize: '13px', color: 'var(--color-text-light)', marginLeft: '12px' }}>
                                No quizzes available for this topic.
                              </p>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginLeft: '12px' }}>
                                {topic.quizzes.map((quiz) => (
                                  <div key={quiz.id} className="card card-hover" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px', boxShadow: 'var(--shadow-sm)' }}>
                                    <div>
                                      <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text-dark)' }}>
                                        {quiz.title}
                                      </h4>
                                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                        <span className={`badge badge-${quiz.difficulty.toLowerCase()}`}>
                                          {quiz.difficulty}
                                        </span>
                                        <span style={{ fontSize: '12px', color: 'var(--color-text-light)', fontWeight: 500 }}>
                                          Duration: {Math.round(quiz.duration / 60)}m
                                        </span>
                                        <span style={{ fontSize: '12px', color: 'var(--color-text-light)', fontWeight: 500 }}>
                                          Questions: {quiz._count.questions}
                                        </span>
                                      </div>
                                    </div>
                                    <button
                                      className="btn btn-primary"
                                      style={{ padding: '8px 16px', fontSize: '12px', alignSelf: 'flex-start', width: '100%' }}
                                      onClick={() => handleStartRequest(quiz)}
                                    >
                                      Take Quiz
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && selectedQuiz && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', color: 'var(--color-text-dark)' }}>
              Confirm Quiz Start
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--color-text-light)', marginBottom: '24px', lineHeight: 1.6 }}>
              You are about to start <strong>{selectedQuiz.title}</strong>. This quiz contains{' '}
              <strong>{selectedQuiz._count.questions} questions</strong> and has a time limit of{' '}
              <strong>{Math.round(selectedQuiz.duration / 60)} minutes</strong>.
              <br /><br />
              Your progress will be auto-saved every 5 seconds. If you close your tab or lose connection, your quiz will automatically submit when the timer expires.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn"
                style={{ textTransform: 'none', padding: '10px 20px', boxShadow: 'none' }}
                onClick={() => setShowConfirmModal(false)}
                disabled={startingQuiz}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ textTransform: 'none', padding: '10px 20px' }}
                onClick={handleConfirmStart}
                disabled={startingQuiz}
              >
                {startingQuiz ? 'Initializing...' : 'Start Quiz'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
