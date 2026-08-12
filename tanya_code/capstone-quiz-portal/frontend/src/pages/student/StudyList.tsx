import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';

interface TopicInfo {
  id: string;
  name: string;
}

interface ChapterInfo {
  id: string;
  name: string;
  topics: TopicInfo[];
}

export const StudyList: React.FC = () => {
  const [chapters, setChapters] = useState<ChapterInfo[]>([]);
  const [expandedChapters, setExpandedChapters] = useState<{ [id: string]: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const res = await client.get('/chapters');
        setChapters(res.data);
        if (res.data.length > 0) {
          setExpandedChapters({ [res.data[0].id]: true });
        }
      } catch (err) {
        console.error(err);
        setError('Failed to fetch chapters list.');
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

  if (loading) {
    return <div style={{ fontWeight: 600, padding: '40px', color: 'var(--color-text-light)' }}>Loading study index...</div>;
  }

  if (error) {
    return <div className="alert alert-danger" style={{ margin: '40px' }}>{error}</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 className="header-title">Study Material</h1>
        <p className="header-subtitle">Select a Class 10 topic below to study the core concepts, read notes, and view solved textbook examples.</p>
      </div>

      {chapters.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-light)', fontSize: '13.5px' }}>
          No syllabus materials have been published by teachers yet. Please check back later!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {chapters.map((chapter) => {
            const isExpanded = expandedChapters[chapter.id];
            return (
              <div key={chapter.id} className="accordion">
                <div className="accordion-header" onClick={() => toggleChapter(chapter.id)}>
                  <span style={{ fontWeight: 700, color: 'var(--color-text-dark)', fontSize: '15px' }}>
                    {chapter.name}
                  </span>
                  <span style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', fontWeight: 700, fontSize: '12px' }}>
                    ▶
                  </span>
                </div>

                {isExpanded && (
                  <div className="accordion-body" style={{ padding: '24px' }}>
                    {chapter.topics.length === 0 ? (
                      <p style={{ fontStyle: 'italic', color: 'var(--color-text-light)', fontSize: '13px' }}>
                        No topics under this chapter yet.
                      </p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                        {chapter.topics.map((topic) => (
                          <div key={topic.id} className="card card-hover" style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '16px',
                            padding: '20px',
                            boxShadow: 'var(--shadow-sm)'
                          }}>
                            <div>
                              <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--color-text-dark)', marginBottom: '8px' }}>
                                {topic.name}
                              </h3>
                              <p style={{ fontSize: '12.5px', color: 'var(--color-text-light)', lineHeight: 1.4 }}>
                                Read conceptual summaries, quick notes, formulas, and textbook solutions.
                              </p>
                            </div>
                            <Link
                              to={`/student/study/${topic.id}`}
                              className="btn btn-primary"
                              style={{ padding: '8px 16px', fontSize: '12.5px', textTransform: 'none', alignSelf: 'flex-start', width: '100%', boxShadow: 'none' }}
                            >
                              Read Notes
                            </Link>
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
    </div>
  );
};
