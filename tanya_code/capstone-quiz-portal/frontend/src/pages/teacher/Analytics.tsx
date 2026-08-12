import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../../api/client';

interface QuestionPerformance {
  questionId: string;
  questionText: string;
  correctAnswer: string;
  attemptsCount: number;
  correctCount: number;
  accuracyPercent: number;
  averageTimeSpent: number;
  averageAnswerChanges: number;
}

interface QuizReport {
  quiz: {
    id: string;
    title: string;
    duration: number;
    topicName: string;
    chapterName: string;
    questionsCount: number;
  };
  stats: {
    totalAttempts: number;
    averageScore: number;
    averageTimeSpent: number;
    classAccuracyPercent: number;
  };
  questions: QuestionPerformance[];
  attempts: {
    attemptId: string;
    studentName: string;
    studentEmail: string;
    score: number;
    timeSpent: number;
    submittedAt: string;
  }[];
}

interface StudentReport {
  student: {
    id: string;
    username: string;
    email: string;
  };
  attempts: {
    attemptId: string;
    quizTitle: string;
    topicName: string;
    chapterName: string;
    score: number;
    totalQuestions: number;
    percentage: number;
    timeSpent: number;
    submittedAt: string;
    questions: {
      questionId: string;
      questionText: string;
      selectedAnswer: string | null;
      correctAnswer: string;
      isCorrect: boolean;
      timeSpent: number;
      answerChanges: number;
    }[];
  }[];
}

export const Analytics: React.FC = () => {
  const { studentId, quizId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // States for student vs quiz reports
  const [studentReport, setStudentReport] = useState<StudentReport | null>(null);
  const [quizReport, setQuizReport] = useState<QuizReport | null>(null);
  
  // Expanded student attempts list state
  const [expandedAttempts, setExpandedAttempts] = useState<{ [id: string]: boolean }>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        if (studentId) {
          const res = await client.get(`/analytics/student/${studentId}`);
          setStudentReport(res.data);
          setQuizReport(null);
        } else if (quizId) {
          const res = await client.get(`/analytics/quiz/${quizId}`);
          setQuizReport(res.data);
          setStudentReport(null);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to retrieve requested detailed analytics report.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [studentId, quizId]);

  const toggleAttemptExpand = (attemptId: string) => {
    setExpandedAttempts(prev => ({
      ...prev,
      [attemptId]: !prev[attemptId]
    }));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  if (loading) {
    return <div style={{ fontWeight: 700, padding: '40px', color: 'var(--color-text-light)' }}>Loading detailed report card...</div>;
  }

  if (error) {
    return <div className="alert alert-danger" style={{ margin: '40px' }}>{error}</div>;
  }

  // ==========================================
  // VIEW 1: STUDENT REPORT CARD
  // ==========================================
  if (studentId && studentReport) {
    const { student, attempts } = studentReport;
    
    // Aggregate stats
    const totalQuizAttempts = attempts.length;
    const avgScorePercent = totalQuizAttempts > 0
      ? Math.round(attempts.reduce((acc, curr) => acc + curr.percentage, 0) / totalQuizAttempts)
      : 0;
    const totalTimeSec = attempts.reduce((acc, curr) => acc + curr.timeSpent, 0);

    return (
      <div>
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="header-title">Student Profile: {student.username}</h1>
            <p className="header-subtitle">{student.email} • Class 10 Physics Diagnostic Report</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => window.print()} className="btn btn-primary" style={{ background: '#06b6d4', border: 'none', fontSize: '13px' }}>
              🖨️ Export PTM Report Card (PDF)
            </button>
            <Link to="/teacher/dashboard" className="btn btn-accent" style={{ textTransform: 'none' }}>
              ◀ Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Aggregate student stats card */}
        <div className="stat-grid">
          <div className="card stat-card" style={{ borderLeft: '6px solid var(--color-primary)' }}>
            <div className="stat-icon" style={{ backgroundColor: 'var(--color-primary)' }}>🎯</div>
            <div>
              <div className="stat-value">{avgScorePercent}%</div>
              <div className="stat-label">Average Accuracy</div>
            </div>
          </div>

          <div className="card stat-card" style={{ borderLeft: '6px solid var(--color-accent)' }}>
            <div className="stat-icon" style={{ backgroundColor: 'var(--color-accent)' }}>📝</div>
            <div>
              <div className="stat-value">{totalQuizAttempts}</div>
              <div className="stat-label">Completed Quizzes</div>
            </div>
          </div>

          <div className="card stat-card" style={{ borderLeft: '6px solid var(--color-secondary)' }}>
            <div className="stat-icon" style={{ backgroundColor: 'var(--color-secondary)' }}>⏳</div>
            <div>
              <div className="stat-value">{formatTime(totalTimeSec)}</div>
              <div className="stat-label">Total Time Spent</div>
            </div>
          </div>
        </div>

        {/* Detailed Quiz History List */}
        <div className="card">
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px' }}>Quiz Attempt Logs</h2>
          {attempts.length === 0 ? (
            <p style={{ fontStyle: 'italic', color: 'var(--color-text-light)' }}>This student hasn't completed any quizzes yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {attempts.map((att) => {
                const isExpanded = expandedAttempts[att.attemptId];
                return (
                  <div key={att.attemptId} style={{ border: '2px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    
                    {/* Header Row */}
                    <div style={{
                      padding: '16px 20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#fafafa',
                      cursor: 'pointer'
                    }} onClick={() => toggleAttemptExpand(att.attemptId)}>
                      <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-dark)' }}>{att.quizTitle}</h3>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-light)', fontWeight: 600 }}>
                          {att.chapterName} &gt; {att.topicName}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <span className={`badge ${att.percentage >= 75 ? 'badge-easy' : att.percentage >= 50 ? 'badge-medium' : 'badge-hard'}`}>
                          {att.score} / {att.totalQuestions} ({att.percentage}%)
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-light)', fontWeight: 600 }}>
                          ⏱ {formatTime(att.timeSpent)}
                        </span>
                        <span style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', fontWeight: 800, fontSize: '12px' }}>
                          ▶
                        </span>
                      </div>
                    </div>

                    {/* Expanded question detail breakdown */}
                    {isExpanded && (
                      <div style={{ padding: '20px', borderTop: '2px solid var(--color-border)', backgroundColor: 'white' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px', color: 'var(--color-text-dark)' }}>
                          Question-by-Question breakdown
                        </h4>

                        <div className="table-container">
                          <table>
                            <thead>
                              <tr>
                                <th>Question</th>
                                <th>Correct Ans</th>
                                <th>Student Ans</th>
                                <th>Grades</th>
                                <th>Time Taken</th>
                                <th>Changes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {att.questions.map((q, idx) => (
                                <tr key={q.questionId}>
                                  <td>
                                    <div style={{ fontWeight: 600, fontSize: '13px', maxStringLength: '200px' }}>
                                      Q{idx + 1}. {q.questionText}
                                    </div>
                                  </td>
                                  <td style={{ fontWeight: 800, color: 'var(--color-primary-dark)' }}>{q.correctAnswer}</td>
                                  <td style={{ fontWeight: 800 }}>{q.selectedAnswer || 'None'}</td>
                                  <td>
                                    <span className={`badge ${q.isCorrect ? 'badge-easy' : 'badge-hard'}`}>
                                      {q.isCorrect ? 'Correct' : 'Incorrect'}
                                    </span>
                                  </td>
                                  <td style={{ fontWeight: 600 }}>{q.timeSpent}s</td>
                                  <td style={{ fontWeight: 600, color: q.answerChanges > 1 ? 'var(--color-secondary-dark)' : 'inherit' }}>
                                    {q.answerChanges}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: QUIZ REPORT CARD
  // ==========================================
  if (quizId && quizReport) {
    const { quiz, stats, questions, attempts } = quizReport;

    return (
      <div>
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="header-title">Quiz Report: {quiz.title}</h1>
            <p className="header-subtitle">{quiz.chapterName} &gt; {quiz.topicName}</p>
          </div>
          <Link to="/teacher/quizzes" className="btn btn-accent" style={{ textTransform: 'none' }}>
            ◀ Back to Quizzes
          </Link>
        </div>

        {/* Aggregated stats */}
        <div className="stat-grid">
          <div className="card stat-card" style={{ borderLeft: '6px solid var(--color-primary)' }}>
            <div className="stat-icon" style={{ backgroundColor: 'var(--color-primary)' }}>🎯</div>
            <div>
              <div className="stat-value">{stats.classAccuracyPercent}%</div>
              <div className="stat-label">Class Average Accuracy</div>
            </div>
          </div>

          <div className="card stat-card" style={{ borderLeft: '6px solid var(--color-accent)' }}>
            <div className="stat-icon" style={{ backgroundColor: 'var(--color-accent)' }}>🏁</div>
            <div>
              <div className="stat-value">{stats.totalAttempts}</div>
              <div className="stat-label">Total Submissions</div>
            </div>
          </div>

          <div className="card stat-card" style={{ borderLeft: '6px solid var(--color-secondary)' }}>
            <div className="stat-icon" style={{ backgroundColor: 'var(--color-secondary)' }}>⏱</div>
            <div>
              <div className="stat-value">{formatTime(stats.averageTimeSpent)}</div>
              <div className="stat-label">Average Time Taken</div>
            </div>
          </div>
        </div>

        {/* Question-level analytics */}
        <div className="card" style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px' }}>❓ Question Performance Analysis</h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '16px', lineHeight: 1.5 }}>
            Analyze class-wide correctness and review confusion patterns (Average Answer Changes).
          </p>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Question Detail</th>
                  <th>Correct Ans</th>
                  <th>Correct Rate</th>
                  <th>Avg Time spent</th>
                  <th>Avg Answer Changes</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q, idx) => (
                  <tr key={q.questionId}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>
                        Q{idx + 1}. {q.questionText}
                      </div>
                    </td>
                    <td style={{ fontWeight: 800, color: 'var(--color-primary-dark)' }}>{q.correctAnswer}</td>
                    <td>
                      <span className={`badge ${q.accuracyPercent >= 75 ? 'badge-easy' : q.accuracyPercent >= 50 ? 'badge-medium' : 'badge-hard'}`}>
                        {q.correctCount} / {q.attemptsCount} ({q.accuracyPercent}%)
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{q.averageTimeSpent}s</td>
                    <td style={{ fontWeight: 600, color: q.averageAnswerChanges > 1.2 ? 'var(--color-danger)' : 'inherit' }}>
                      {q.averageAnswerChanges}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Individual attempts log */}
        <div className="card">
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px' }}>👥 Individual Student Submissions</h2>
          {attempts.length === 0 ? (
            <p style={{ fontStyle: 'italic', color: 'var(--color-text-light)' }}>No submissions recorded yet.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Email</th>
                    <th>Score</th>
                    <th>Time Spent</th>
                    <th>Submitted At</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((att) => (
                    <tr key={att.attemptId}>
                      <td style={{ fontWeight: 700 }}>{att.studentName}</td>
                      <td>{att.studentEmail}</td>
                      <td>
                        <span style={{ fontWeight: 700 }}>{att.score} / {quiz.questionsCount}</span>
                      </td>
                      <td>{formatTime(att.timeSpent)}</td>
                      <td>{new Date(att.submittedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ textAlign: 'center', padding: '48px', margin: '40px' }}>
      <h2>Report Not Found</h2>
      <Link to="/teacher/dashboard" className="btn btn-primary" style={{ marginTop: '20px' }}>Return to Dashboard</Link>
    </div>
  );
};
