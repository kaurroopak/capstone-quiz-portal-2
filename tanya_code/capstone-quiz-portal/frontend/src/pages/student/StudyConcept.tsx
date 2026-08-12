import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import client from '../../api/client';

interface TopicContent {
  learnText: string;
  notes: string;
  examples: string;
  formula: string;
}

interface TopicDetail {
  id: string;
  name: string;
  chapter: { name: string };
  quizzes: { id: string; title: string }[];
}

export const StudyConcept: React.FC = () => {
  const { topicId } = useParams();
  const navigate = useNavigate();
  
  const [content, setContent] = useState<TopicContent | null>(null);
  const [topicDetail, setTopicDetail] = useState<TopicDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'LEARN' | 'NOTES' | 'EXAMPLES' | 'FORMULA'>('LEARN');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStudyData = async () => {
      try {
        const [contentRes, chaptersRes] = await Promise.all([
          client.get(`/study/${topicId}`),
          client.get('/chapters')
        ]);
        
        setContent(contentRes.data);

        // Find current topic details in chapters lists
        let foundTopic: any = null;
        for (const ch of chaptersRes.data) {
          const t = ch.topics.find((x: any) => x.id === topicId);
          if (t) {
            foundTopic = {
              id: t.id,
              name: t.name,
              chapter: { name: ch.name },
              quizzes: t.quizzes
            };
            break;
          }
        }
        setTopicDetail(foundTopic);
      } catch (err) {
        console.error(err);
        setError('Failed to load study material.');
      } finally {
        setLoading(false);
      }
    };
    fetchStudyData();
  }, [topicId]);

  if (loading) {
    return <div style={{ fontWeight: 600, padding: '40px', color: 'var(--color-text-light)' }}>Loading study materials...</div>;
  }

  if (error || !content) {
    return <div className="alert alert-danger" style={{ margin: '40px' }}>{error || 'No content found.'}</div>;
  }

  const handleExplainAgain = () => {
    navigate('/student/ai-tutor', {
      state: {
        initialPrompt: `Can you explain the topic "${topicDetail?.name || 'Class 10'}" in simpler terms? Please provide a visual analogy.`
      }
    });
  };

  const handleStartQuiz = async (quizId: string) => {
    try {
      const res = await client.post('/attempts/start', { quizId });
      navigate(`/student/quiz/${quizId}`, { state: { attempt: res.data.attempt, cachedProgress: res.data.cachedProgress } });
    } catch (err) {
      console.error(err);
      alert('Failed to start quiz attempt.');
    }
  };

  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, idx) => (
      <p key={idx} style={{ marginBottom: '12px', lineHeight: 1.6, fontSize: '14.5px' }}>
        {line}
      </p>
    ));
  };

  return (
    <div style={{ padding: '20px', maxWidth: '850px', margin: '0 auto' }}>
      {/* Navigation breadcrumbs */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {topicDetail?.chapter.name}
          </span>
          <h1 className="header-title" style={{ fontSize: '24px', marginTop: '4px' }}>
            Study: {topicDetail?.name}
          </h1>
        </div>
        <Link to="/student/chapters" className="btn" style={{ padding: '8px 16px', fontSize: '13px', textTransform: 'none' }}>
          Back to Quizzes
        </Link>
      </div>

      {/* Main Tabbed Study Window */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '28px', boxShadow: 'var(--shadow-md)' }}>
        {/* Tab Headers */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: '#fafafa'
        }}>
          {(['LEARN', 'NOTES', 'EXAMPLES', 'FORMULA'] as const).map((tab) => {
            const isActive = activeTab === tab;
            const labels = {
              LEARN: 'Core Concept',
              NOTES: 'Quick Notes',
              EXAMPLES: 'Solved Examples',
              FORMULA: 'Formulas'
            };

            return (
              <button
                key={tab}
                style={{
                  flex: 1,
                  padding: '16px 20px',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  border: 'none',
                  cursor: 'pointer',
                  borderBottom: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                  backgroundColor: isActive ? 'white' : 'transparent',
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-light)',
                  transition: 'all 0.15s ease'
                }}
                onClick={() => setActiveTab(tab)}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div style={{ padding: '32px', minHeight: '300px' }}>
          {activeTab === 'LEARN' && (
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--color-text-dark)' }}>
                Conceptual Introduction
              </h2>
              {renderFormattedText(content.learnText)}
            </div>
          )}

          {activeTab === 'NOTES' && (
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--color-text-dark)' }}>
                Key Study Notes
              </h2>
              {renderFormattedText(content.notes)}
            </div>
          )}

          {activeTab === 'EXAMPLES' && (
            <div style={{ borderLeft: '3px solid var(--color-primary)', paddingLeft: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--color-text-dark)' }}>
                Worked Problems
              </h2>
              <div style={{ fontFamily: 'var(--font-sans)', whiteSpace: 'pre-line', fontSize: '14px', lineHeight: 1.6 }}>
                {content.examples}
              </div>
            </div>
          )}

          {activeTab === 'FORMULA' && (
            <div style={{ backgroundColor: 'var(--color-primary-light)', border: '1px dashed var(--color-primary)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--color-primary-dark)' }}>
                Essential Equations
              </h2>
              <div style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 700, whiteSpace: 'pre-line', color: 'var(--color-text-dark)' }}>
                {content.formula}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action CTA Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Tutor assist */}
        <div className="card" style={{ borderLeft: '4px solid var(--color-accent)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px', boxShadow: 'var(--shadow-sm)' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-dark)' }}>Doubt Clearing Assistant</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-light)', marginTop: '4px', lineHeight: 1.4 }}>
              Instantly ask our tutor to explain this concept using simpler terms or practical everyday examples.
            </p>
          </div>
          <button
            className="btn btn-accent"
            style={{ textTransform: 'none', width: '100%', boxShadow: 'none' }}
            onClick={handleExplainAgain}
          >
            Ask Tutor for Help
          </button>
        </div>

        {/* Test competency */}
        <div className="card" style={{ borderLeft: '4px solid var(--color-primary)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px', boxShadow: 'var(--shadow-sm)' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-dark)' }}>Ready to Practice?</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-light)', marginTop: '4px', lineHeight: 1.4 }}>
              Take a self-assessment quiz on this topic to evaluate your level of conceptual understanding.
            </p>
          </div>
          {topicDetail?.quizzes && topicDetail.quizzes.length > 0 ? (
            <button
              className="btn btn-primary"
              style={{ textTransform: 'none', width: '100%', boxShadow: 'none' }}
              onClick={() => handleStartQuiz(topicDetail.quizzes[0].id)}
            >
              Take Practice Quiz
            </button>
          ) : (
            <button
              className="btn btn-primary"
              style={{ textTransform: 'none', width: '100%' }}
              disabled
            >
              No Quizzes Published
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
