import React, { useEffect, useState } from 'react';
import client from '../../api/client';

interface Topic {
  id: string;
  name: string;
}

interface Chapter {
  id: string;
  name: string;
  topics: Topic[];
}

interface Question {
  id: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  imageUrl?: string;
  difficulty: string;
}

interface Quiz {
  id: string;
  title: string;
  description?: string;
  isActive: boolean;
  duration: number;
  difficulty: string;
  topicId: string;
  topicName?: string;
  questions: Question[];
}

export const QuizManagement: React.FC = () => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 1. Create Quiz State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('EASY');
  const [shuffle, setShuffle] = useState(false);

  // 2. Add Question State
  const [activeQuizId, setActiveQuizId] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [questionDifficulty, setQuestionDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('EASY');
  const [questionImageFile, setQuestionImageFile] = useState<File | null>(null);

  // 3. Smart Linker State
  const [smartZipFile, setSmartZipFile] = useState<File | null>(null);
  const [linkingLogs, setLinkingLogs] = useState<string[]>([]);
  const [linkingSuccess, setLinkingSuccess] = useState('');
  const [linkingError, setLinkingError] = useState('');
  const [linkingProgress, setLinkingProgress] = useState(false);

  // Action feedbacks
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    setLoading(true);
    try {
      const [chaptersRes, quizzesRes] = await Promise.all([
        client.get('/chapters'),
        client.get('/quizzes')
      ]);

      setChapters(chaptersRes.data);
      setQuizzes(quizzesRes.data);

      if (chaptersRes.data.length > 0 && chaptersRes.data[0].topics.length > 0) {
        setSelectedTopicId(chaptersRes.data[0].topics[0].id);
      }
      if (quizzesRes.data.length > 0) {
        setActiveQuizId(quizzesRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch quizzes metadata.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionSuccess('');
    setActionError('');
    if (!title.trim() || !selectedTopicId) return;

    try {
      const res = await client.post('/quizzes/create', {
        title,
        description,
        topicId: selectedTopicId,
        duration: durationMinutes * 60,
        difficulty,
        shuffle
      });

      setQuizzes(prev => [...prev, { ...res.data.quiz, questions: [] }]);
      setTitle('');
      setDescription('');
      setActionSuccess('Quiz created successfully.');
      if (!activeQuizId) {
        setActiveQuizId(res.data.quiz.id);
      }
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to create quiz.');
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionSuccess('');
    setActionError('');
    if (!activeQuizId || !questionText.trim()) return;

    try {
      // 1. Create question text first
      const res = await client.post(`/quizzes/${activeQuizId}/questions`, {
        text: questionText,
        optionA,
        optionB,
        optionC,
        optionD,
        correctAnswer,
        difficulty: questionDifficulty
      });

      const questionId = res.data.question.id;

      // 2. Upload image if selected
      if (questionImageFile) {
        const formData = new FormData();
        formData.append('image', questionImageFile);
        await client.post(`/quizzes/questions/${questionId}/image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setActionSuccess('Question added successfully.');
      
      // Clear forms
      setQuestionText('');
      setOptionA('');
      setOptionB('');
      setOptionC('');
      setOptionD('');
      setQuestionImageFile(null);
      const imgInput = document.getElementById('questionImageInput') as HTMLInputElement;
      if (imgInput) imgInput.value = '';

      fetchMetadata();
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to add question.');
    }
  };

  const handleSmartLinking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkingSuccess('');
    setLinkingError('');
    setLinkingLogs([]);
    if (!smartZipFile) return;

    setLinkingProgress(true);
    const formData = new FormData();
    formData.append('image', smartZipFile); // Backend uses requireTeacher, upload.single('image')

    try {
      const res = await client.post('/quizzes/questions/smart-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setLinkingSuccess('Smart image linker run completed.');
      setLinkingLogs(res.data.logs || []);
      setSmartZipFile(null);
      const zipInput = document.getElementById('smartZipInput') as HTMLInputElement;
      if (zipInput) zipInput.value = '';
      fetchMetadata();
    } catch (err: any) {
      setLinkingError(err.response?.data?.error || 'Smart linking run failed.');
      setLinkingLogs(err.response?.data?.logs || []);
    } finally {
      setLinkingProgress(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 className="header-title">Quiz and Assessment Builder</h1>
        <p className="header-subtitle">Publish practice examinations, write individual questions, and run the Smart image reference linker.</p>
      </div>

      {actionSuccess && <div className="alert alert-success">{actionSuccess}</div>}
      {actionError && <div className="alert alert-danger">{actionError}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
        
        {/* Left Column: Create Quiz Form */}
        <div className="card">
          <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: 'var(--color-text-dark)' }}>
            Publish New Quiz Title
          </h2>
          
          <form onSubmit={handleCreateQuiz} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Quiz Title</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Chemical Balancing Test"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Description (Optional)</label>
              <textarea
                className="input-field"
                placeholder="Brief assessment guidelines"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Select Syllabus Topic</label>
              <select
                className="input-field"
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                required
              >
                {chapters.length === 0 && <option value="">No chapters or topics found</option>}
                {chapters.map(c =>
                  c.topics.map(t => (
                    <option key={t.id} value={t.id}>
                      {c.name} - {t.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Duration (Minutes)</label>
                <input
                  type="number"
                  className="input-field"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 1)}
                  min={1}
                  required
                />
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">General Difficulty</label>
                <select
                  className="input-field"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                >
                  <option value="EASY">EASY</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HARD">HARD</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <input
                type="checkbox"
                id="shuffleCheck"
                checked={shuffle}
                onChange={(e) => setShuffle(e.target.checked)}
              />
              <label htmlFor="shuffleCheck" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-dark)' }}>
                Shuffle question order for students
              </label>
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '12px', marginTop: '12px', boxShadow: 'none' }}>
              Create Quiz
            </button>
          </form>
        </div>

        {/* Right Column: Add Question Form */}
        <div className="card">
          <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: 'var(--color-text-dark)' }}>
            Add Question to Existing Quiz
          </h2>

          <form onSubmit={handleAddQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Select Quiz</label>
              <select
                className="input-field"
                value={activeQuizId}
                onChange={(e) => setActiveQuizId(e.target.value)}
                required
              >
                {quizzes.length === 0 && <option value="">No quizzes published yet</option>}
                {quizzes.map(q => (
                  <option key={q.id} value={q.id}>{q.title}</option>
                ))}
              </select>
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Question Text</label>
              <input
                type="text"
                className="input-field"
                placeholder="Question text"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Option A</label>
                <input type="text" className="input-field" value={optionA} onChange={(e) => setOptionA(e.target.value)} required />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Option B</label>
                <input type="text" className="input-field" value={optionB} onChange={(e) => setOptionB(e.target.value)} required />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Option C</label>
                <input type="text" className="input-field" value={optionC} onChange={(e) => setOptionC(e.target.value)} required />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Option D</label>
                <input type="text" className="input-field" value={optionD} onChange={(e) => setOptionD(e.target.value)} required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Correct Option</label>
                <select className="input-field" value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value as any)}>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Difficulty</label>
                <select className="input-field" value={questionDifficulty} onChange={(e) => setQuestionDifficulty(e.target.value as any)}>
                  <option value="EASY">EASY</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HARD">HARD</option>
                </select>
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Diagram Image (Optional)</label>
              <input
                id="questionImageInput"
                type="file"
                className="input-field"
                accept="image/*"
                onChange={(e) => setQuestionImageFile(e.target.files ? e.target.files[0] : null)}
                style={{ padding: '8px' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '12px', boxShadow: 'none' }} disabled={quizzes.length === 0}>
              Save Question
            </button>
          </form>
        </div>
      </div>

      {/* Zip smart images upload */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
        <div className="card">
          <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: 'var(--color-text-dark)' }}>
            Smart Image Linker
          </h2>
          <p style={{ fontSize: '12.5px', color: 'var(--color-text-light)', marginBottom: '20px', lineHeight: 1.5 }}>
            Upload a single image or a compressed zip folder of images named to match Excel diagram placeholders. 
            The system will scan existing questions and automatically bind their paths.
          </p>

          {linkingSuccess && <div className="alert alert-success">{linkingSuccess}</div>}
          {linkingError && <div className="alert alert-danger">{linkingError}</div>}

          <form onSubmit={handleSmartLinking} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <input
                id="smartZipInput"
                type="file"
                className="input-field"
                accept="image/*, .zip"
                onChange={(e) => setSmartZipFile(e.target.files ? e.target.files[0] : null)}
                style={{ padding: '8px' }}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', boxShadow: 'none' }}
              disabled={linkingProgress || !smartZipFile}
            >
              {linkingProgress ? 'Analyzing and linking files...' : 'Run Smart Image Binder'}
            </button>
          </form>
        </div>

        {linkingLogs.length > 0 && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Linker Execution Logs
            </h3>
            <div style={{
              flex: 1,
              maxHeight: '180px',
              overflowY: 'auto',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border-dark)',
              fontFamily: 'monospace',
              fontSize: '11.5px',
              lineHeight: 1.5,
              color: 'var(--color-text)'
            }}>
              {linkingLogs.map((log, idx) => (
                <div key={idx} style={{ marginBottom: '4px' }}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quizzes and questions overview card */}
      <div className="card">
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-dark)', marginBottom: '20px' }}>
          Published Quizzes Structure Overview
        </h2>
        {quizzes.length === 0 ? (
          <p style={{ color: 'var(--color-text-light)', fontSize: '13.5px', fontStyle: 'italic' }}>No quizzes exist.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {quizzes.map((q) => (
              <div key={q.id} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {q.title} ({q.questions.length} questions)
                </h3>
                {q.questions.length === 0 ? (
                  <p style={{ fontSize: '12.5px', color: 'var(--color-text-light)', fontStyle: 'italic', margin: '8px 0 0 12px' }}>
                    No questions written yet.
                  </p>
                ) : (
                  <ol style={{ paddingLeft: '24px', marginTop: '10px' }}>
                    {q.questions.map((quest) => (
                      <li key={quest.id} style={{ fontSize: '13.5px', marginBottom: '8px', color: 'var(--color-text)' }}>
                        <strong>{quest.text}</strong>
                        {quest.imageUrl && <span style={{ fontSize: '11px', color: 'var(--color-accent-dark)', marginLeft: '8px' }}>(Diagram linked)</span>}
                        <div style={{ fontSize: '12px', color: 'var(--color-text-light)', marginTop: '4px' }}>
                          A: {quest.optionA} | B: {quest.optionB} | C: {quest.optionC} | D: {quest.optionD} | Correct: {quest.correctAnswer}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
