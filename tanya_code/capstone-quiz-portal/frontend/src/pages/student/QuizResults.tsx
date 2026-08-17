import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../../api/client';

import ReactMarkdown from 'react-markdown';

interface ResponseItem {
  id: string;
  selectedAnswer: 'A' | 'B' | 'C' | 'D' | null;
  timeSpent: number;
  answerChanges: number;
  question: {
    text: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: 'A' | 'B' | 'C' | 'D';
    imageUrl?: string;
  };
}

interface AttemptResult {
  id: string;
  score: number;
  timeSpent: number;
  quiz: {
    title: string;
    questions: { id: string }[];
  };
  responses: ResponseItem[];
  studentStanding?: {
    theta: number;
    xp: number;
    masteryProbability: number;
    prerequisiteGaps: { id: string; name: string; chapterName: string }[];
  };
}

export const QuizResults: React.FC = () => {
  const { attemptId } = useParams();
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [evaluations, setEvaluations] = useState<Record<string, string> | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await client.get(`/attempts/${attemptId}/results`);
        setResult(res.data);
      } catch (err) {
        console.error(err);
        setError('Failed to retrieve quiz grading results.');
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [attemptId]);

  useEffect(() => {
    if (result && !evaluations && !evalLoading) {
      setEvalLoading(true);
      client.get(`/attempts/${attemptId}/evaluations`)
        .then(res => setEvaluations(res.data.evaluations))
        .catch(err => console.error("Failed to load evaluations", err))
        .finally(() => setEvalLoading(false));
    }
  }, [result, attemptId, evaluations, evalLoading]);

  if (loading) {
    return <div style={{ fontWeight: 600, padding: '40px', color: 'var(--color-text-light)' }}>Grading your answers...</div>;
  }

  if (error || !result) {
    return <div className="alert alert-danger" style={{ margin: '40px' }}>{error || 'Results not found.'}</div>;
  }

  const totalQuestions = result.quiz.questions.length;
  const scorePercent = Math.round((result.score / totalQuestions) * 100);

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const totalAnswerChanges = result.responses.reduce((sum, r) => sum + r.answerChanges, 0);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Results Summary
          </span>
          <h1 className="header-title" style={{ fontSize: '24px', marginTop: '4px' }}>{result.quiz.title}</h1>
        </div>
        <Link to="/student/dashboard" className="btn btn-accent" style={{ padding: '8px 16px', fontSize: '13px' }}>
          Back to Dashboard
        </Link>
      </div>

      <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', padding: '32px', marginBottom: '32px' }}>
        {/* Left Side Score Indicator */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--color-border)', paddingRight: '16px' }}>
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            border: '6px solid var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            marginBottom: '16px'
          }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-text-dark)' }}>{result.score}</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-light)' }}>out of {totalQuestions}</span>
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary-dark)', margin: 0 }}>
            {scorePercent}% Accuracy
          </h2>
          <p style={{ fontSize: '12.5px', color: 'var(--color-text-light)', marginTop: '6px' }}>
            {scorePercent >= 75 ? 'Excellent understanding!' : scorePercent >= 40 ? 'Good effort, keep practicing!' : 'Needs immediate concept review.'}
          </p>
        </div>

        {/* Right Side Stats Details */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
            <span style={{ fontWeight: 600, color: 'var(--color-text-light)' }}>Time Spent:</span>
            <span style={{ fontWeight: 700, color: 'var(--color-text-dark)' }}>{formatTime(result.timeSpent)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
            <span style={{ fontWeight: 600, color: 'var(--color-text-light)' }}>Average Time per Q:</span>
            <span style={{ fontWeight: 700, color: 'var(--color-text-dark)' }}>
              {Math.round(result.timeSpent / (totalQuestions || 1))}s
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
            <span style={{ fontWeight: 600, color: 'var(--color-text-light)' }}>Answer Modifications:</span>
            <span style={{ fontWeight: 700, color: 'var(--color-text-dark)' }}>{totalAnswerChanges} times</span>
          </div>
        </div>
      </div>

      {result.studentStanding && (
        <div className="card" style={{ padding: '24px', marginBottom: '32px', backgroundColor: 'var(--color-surface)', borderLeft: '6px solid var(--color-primary)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-dark)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🧠</span> Concept Mastery & Growth
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-light)' }}>BKT Mastery Probability</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-text-dark)' }}>{Math.round(result.studentStanding.masteryProbability * 100)}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.round(result.studentStanding.masteryProbability * 100)}%`, height: '100%', backgroundColor: result.studentStanding.masteryProbability >= 0.8 ? 'var(--color-success)' : result.studentStanding.masteryProbability >= 0.5 ? 'var(--color-warning)' : 'var(--color-danger)' }} />
                </div>
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-light)' }}>IRT Ability (θ)</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-text-dark)' }}>{result.studentStanding.theta > 0 ? '+' : ''}{result.studentStanding.theta.toFixed(2)}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>
                  {result.studentStanding.theta >= 1.0 ? 'Advanced Level' : result.studentStanding.theta >= 0.0 ? 'Intermediate Level' : 'Beginner Level'}
                </div>
              </div>
            </div>

            <div style={{ paddingLeft: '24px', borderLeft: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-dark)', marginBottom: '12px' }}>Knowledge Graph Tracing</h3>
              {result.studentStanding.prerequisiteGaps && result.studentStanding.prerequisiteGaps.length > 0 ? (
                <div>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '12px' }}>Based on your performance, you may want to review these foundational concepts first:</p>
                  <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13.5px', fontWeight: 500 }}>
                    {result.studentStanding.prerequisiteGaps.map(gap => (
                      <li key={gap.id} style={{ color: 'var(--color-primary-dark)', marginBottom: '6px' }}>
                        {gap.name} <span style={{ color: 'var(--color-text-light)', fontSize: '12px', fontWeight: 400 }}>({gap.chapterName})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-success-dark)', fontSize: '13px', fontWeight: 500, backgroundColor: 'var(--color-success-bg)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <span>✓</span> You have a solid foundation for this topic. No prerequisite gaps detected!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-dark)', marginBottom: '20px' }}>
        Question-by-Question Analysis
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {result.responses.map((resp, idx) => {
          const isCorrect = resp.selectedAnswer === resp.question.correctAnswer;
          
          return (
            <div key={resp.id} className="card" style={{ borderLeft: `6px solid ${isCorrect ? 'var(--color-success)' : 'var(--color-danger)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', fontSize: '13px' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-text-dark)' }}>Question {idx + 1}</span>
                <span className={`badge ${isCorrect ? 'badge-easy' : 'badge-hard'}`}>
                  {isCorrect ? 'Correct' : 'Incorrect'}
                </span>
              </div>

              {resp.question.imageUrl && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  <img
                    src={`http://localhost:5000${resp.question.imageUrl}`}
                    alt="Question Diagram"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '200px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)'
                    }}
                  />
                </div>
              )}

              <p style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--color-text-dark)', marginBottom: '16px' }}>
                {resp.question.text}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                {['A', 'B', 'C', 'D'].map((opt) => {
                  const textKey = `option${opt}` as keyof typeof resp.question;
                  const isUserSel = resp.selectedAnswer === opt;
                  const isCorrectSel = resp.question.correctAnswer === opt;

                  let border = '1px solid var(--color-border)';
                  let background = 'var(--color-surface)';
                  let color = 'var(--color-text)';

                  if (isCorrectSel) {
                    border = '2px solid var(--color-success)';
                    background = 'var(--color-success-bg)';
                    color = 'var(--color-success-text)';
                  } else if (isUserSel && !isCorrect) {
                    border = '2px solid var(--color-danger)';
                    background = 'var(--color-danger-bg)';
                    color = 'var(--color-danger-text)';
                  }

                  return (
                    <div
                      key={opt}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        border,
                        backgroundColor: background,
                        color,
                        fontSize: '13.5px',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <span style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '8px',
                        backgroundColor: isCorrectSel ? 'var(--color-success)' : isUserSel ? 'var(--color-danger)' : 'var(--color-bg)',
                        color: isCorrectSel || isUserSel ? 'white' : 'var(--color-text)',
                        fontSize: '11px',
                        fontWeight: 700
                      }}>
                        {opt}
                      </span>
                      {resp.question[textKey]}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--color-text-light)', fontWeight: 600, borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
                <span>Time Spent: {resp.timeSpent}s</span>
                <span>Answer Modifications: {resp.answerChanges} times</span>
              </div>

              {/* Detailed Evaluation Section */}
              <div style={{ marginTop: '16px', background: 'var(--color-primary-light)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-primary)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '20px' }}>🤖</span>
                <div style={{ width: '100%' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', color: 'var(--color-primary-dark)', fontWeight: 800 }}>Personalized AI Evaluation</h4>
                  <div style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-dark)', lineHeight: 1.5, display: 'block' }}>
                    {evaluations ? (
                      evaluations[resp.question.id] ? (
                        <ReactMarkdown>{evaluations[resp.question.id]}</ReactMarkdown>
                      ) : (
                        "No detailed evaluation available."
                      )
                    ) : (
                      "Generating personalized evaluation..."
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
