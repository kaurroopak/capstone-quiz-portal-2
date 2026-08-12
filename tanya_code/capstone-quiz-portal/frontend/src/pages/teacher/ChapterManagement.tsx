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

export const ChapterManagement: React.FC = () => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Manual additions state
  const [newChapterName, setNewChapterName] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  
  // Excel upload state
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadLogs, setUploadLogs] = useState<string[]>([]);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Actions feedbacks
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    fetchChapters();
  }, []);

  const fetchChapters = async () => {
    setLoading(true);
    try {
      const res = await client.get('/chapters');
      setChapters(res.data);
      if (res.data.length > 0) {
        setSelectedChapterId(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch chapters list.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionSuccess('');
    setActionError('');
    if (!newChapterName.trim()) return;

    try {
      const res = await client.post('/chapters/manual', { name: newChapterName });
      setChapters(prev => [...prev, { id: res.data.chapter.id, name: res.data.chapter.name, topics: [] }]);
      setNewChapterName('');
      setActionSuccess('Chapter added successfully.');
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to add chapter.');
    }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionSuccess('');
    setActionError('');
    if (!newTopicName.trim() || !selectedChapterId) return;

    try {
      const res = await client.post('/topics/manual', {
        name: newTopicName,
        chapterId: selectedChapterId
      });

      setChapters(prev =>
        prev.map(c => {
          if (c.id === selectedChapterId) {
            return {
              ...c,
              topics: [...c.topics, { id: res.data.topic.id, name: res.data.topic.name }]
            };
          }
          return c;
        })
      );
      setNewTopicName('');
      setActionSuccess('Topic added successfully.');
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to add topic.');
    }
  };

  const handleExcelUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadSuccess('');
    setUploadError('');
    setUploadLogs([]);
    if (!excelFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', excelFile);

    try {
      const res = await client.post('/chapters/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadSuccess('Excel sheet imported successfully.');
      setUploadLogs(res.data.logs || []);
      setExcelFile(null);
      // Clear file input
      const fileInput = document.getElementById('excelFileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      fetchChapters();
    } catch (err: any) {
      setUploadError(err.response?.data?.error || 'Excel import failed.');
      setUploadLogs(err.response?.data?.logs || []);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 className="header-title">Chapter and Topic Management</h1>
        <p className="header-subtitle">Build your Class 10 syllabus structure manually or perform bulk imports using spreadsheets.</p>
      </div>

      {actionSuccess && <div className="alert alert-success">{actionSuccess}</div>}
      {actionError && <div className="alert alert-danger">{actionError}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
        
        {/* Left Card: Manual Setup forms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card">
            <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: 'var(--color-text-dark)' }}>
              Add New Chapter
            </h2>
            <form onSubmit={handleCreateChapter} style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Science - Life Processes"
                value={newChapterName}
                onChange={(e) => setNewChapterName(e.target.value)}
                style={{ flex: 1 }}
                required
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '10px 16px', boxShadow: 'none' }}>
                Add
              </button>
            </form>
          </div>

          <div className="card">
            <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: 'var(--color-text-dark)' }}>
              Add Topic to Chapter
            </h2>
            <form onSubmit={handleCreateTopic} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Select Chapter</label>
                <select
                  className="input-field"
                  value={selectedChapterId}
                  onChange={(e) => setSelectedChapterId(e.target.value)}
                  disabled={chapters.length === 0}
                  required
                >
                  {chapters.length === 0 && <option value="">No chapters created yet</option>}
                  {chapters.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Topic Title</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Respiration and Transport"
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                    style={{ flex: 1 }}
                    required
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '10px 16px', boxShadow: 'none' }} disabled={chapters.length === 0}>
                    Add
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Right Card: Excel Import form */}
        <div className="card">
          <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: 'var(--color-text-dark)' }}>
            Import from Excel Spreadsheet
          </h2>
          <p style={{ fontSize: '12.5px', color: 'var(--color-text-light)', marginBottom: '20px', lineHeight: 1.5 }}>
            Upload a spreadsheet containing your syllabus chapters, topics, difficulty levels, options, and study contents.
            You can download the template here:{' '}
            <a
              href="http://localhost:5000/uploads/sample_template.xlsx"
              className="link"
              style={{ fontWeight: 700, color: 'var(--color-primary)', textDecoration: 'none' }}
              download
            >
              sample_template.xlsx
            </a>
          </p>

          {uploadSuccess && <div className="alert alert-success">{uploadSuccess}</div>}
          {uploadError && <div className="alert alert-danger">{uploadError}</div>}

          <form onSubmit={handleExcelUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <input
                id="excelFileInput"
                type="file"
                className="input-field"
                accept=".xlsx, .xls"
                onChange={(e) => setExcelFile(e.target.files ? e.target.files[0] : null)}
                style={{ padding: '8px' }}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', boxShadow: 'none' }}
              disabled={uploading || !excelFile}
            >
              {uploading ? 'Analyzing and importing...' : 'Upload and Import'}
            </button>
          </form>

          {/* Upload and validation logs */}
          {uploadLogs.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Import Validation Logs
              </h3>
              <div style={{
                maxHeight: '160px',
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
                {uploadLogs.map((log, idx) => (
                  <div key={idx} style={{ marginBottom: '4px' }}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chapters list visualizer */}
      <div className="card">
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-dark)', marginBottom: '20px' }}>
          Active Syllabus Layout
        </h2>
        {loading ? (
          <p style={{ color: 'var(--color-text-light)', fontSize: '13.5px' }}>Loading chapters...</p>
        ) : chapters.length === 0 ? (
          <p style={{ color: 'var(--color-text-light)', fontSize: '13.5px', fontStyle: 'italic' }}>No chapters exist in the database.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {chapters.map(c => (
              <div key={c.id} style={{
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px',
                backgroundColor: 'var(--color-bg)'
              }}>
                <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--color-text-dark)', borderBottom: '1px solid var(--color-border-dark)', paddingBottom: '8px', marginBottom: '12px' }}>
                  {c.name}
                </h3>
                {c.topics.length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
                    No topics created.
                  </p>
                ) : (
                  <ul style={{ listStyleType: 'none', paddingLeft: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {c.topics.map(t => (
                      <li key={t.id} style={{ fontSize: '13px', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>•</span> {t.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
