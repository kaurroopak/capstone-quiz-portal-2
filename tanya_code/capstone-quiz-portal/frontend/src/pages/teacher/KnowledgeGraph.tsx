import React, { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape from 'cytoscape';
// @ts-ignore
import coseBilkent from 'cytoscape-cose-bilkent';
import api from '../../api/client';

cytoscape.use(coseBilkent);

interface GraphNode {
  data: {
    id: string;
    label: string;
    chapter: string;
    mastery: number | null;
    status: 'mastered' | 'learning' | 'weak' | 'unknown';
    quizCount: number;
    importance: number;
  };
}

interface GraphEdge {
  data: { id: string; source: string; target: string };
}

interface Student {
  id: string;
  username: string;
  email: string;
}

const STATUS_COLORS = {
  mastered: '#22c55e',
  learning: '#f59e0b',
  weak: '#ef4444',
  unknown: '#64748b',
};

function getNodeColor(status: string) {
  return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.unknown;
}

export const KnowledgeGraph: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<any>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedNode, setSelectedNode] = useState<GraphNode['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [weakTopics, setWeakTopics] = useState<any[]>([]);

  const fetchGraph = useCallback(async (studentId?: string) => {
    setLoading(true);
    try {
      let res;
      if (studentId) {
        res = await api.get(`/knowledge-graph/student/${studentId}`);
        setWeakTopics(res.data.weakTopics || []);
      } else {
        res = await api.get('/knowledge-graph');
        setStudents(res.data.students || []);
        setWeakTopics([]);
      }
      setNodes(res.data.nodes || []);
      setEdges(res.data.edges || []);
    } catch (err) {
      console.error('Failed to fetch graph:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: {
        nodes: nodes.map((n) => ({
          data: {
            ...n.data,
            color: getNodeColor(n.data.status),
            size: 30 + n.data.importance * 50,
          },
        })),
        edges: edges.map((e) => ({ data: e.data })),
      },
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            'label': 'data(label)',
            'width': 'data(size)',
            'height': 'data(size)',
            'font-size': 11,
            'font-weight': 'bold',
            'text-valign': 'center',
            'text-halign': 'center',
            'color': '#ffffff',
            'text-outline-color': '#0f172a',
            'text-outline-width': 2,
            'border-width': 3,
            'border-color': '#1e293b',
            'border-opacity': 0.8,
            'text-wrap': 'wrap',
            'text-max-width': '80px',
            'transition-property': 'background-color, border-color, width, height',
            'transition-duration': '200ms',
          } as any,
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': '#818cf8',
            'border-width': 5,
            'width': (ele: any) => ele.data('size') * 1.2,
            'height': (ele: any) => ele.data('size') * 1.2,
          } as any,
        },
        {
          selector: 'node.highlighted',
          style: {
            'border-color': '#f8fafc',
            'border-width': 4,
            'background-opacity': 1,
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#334155',
            'target-arrow-color': '#475569',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'opacity': 0.7,
          },
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#818cf8',
            'target-arrow-color': '#818cf8',
            'width': 3,
            'opacity': 1,
          },
        },
      ],
      layout: {
        name: 'cose-bilkent',
        randomize: true,
        nodeRepulsion: 8000,
        idealEdgeLength: 120,
        edgeElasticity: 0.45,
        nestingFactor: 0.1,
        gravity: 0.25,
        numIter: 2500,
        animate: 'end',
        animationDuration: 600,
      } as any,
    });

    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      setSelectedNode(node.data());
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) setSelectedNode(null);
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [nodes, edges]);

  const handleStudentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedStudent(val);
    if (val) {
      fetchGraph(val);
    } else {
      fetchGraph();
    }
  };

  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.2);
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  const handleFit = () => cyRef.current?.fit(undefined, 40);
  const handleReset = () => {
    cyRef.current?.reset();
    cyRef.current?.fit(undefined, 40);
  };

  const masteryLabel = (m: number | null) =>
    m === null ? 'No attempts yet' : `${m}% mastery`;

  return (
    <div style={{ padding: '2rem', height: '100vh', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: '#0f172a', color: '#f1f5f9' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Knowledge Graph</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
            Visual map of topic dependencies and student mastery
          </p>
        </div>

        {/* Student selector */}
        <select
          value={selectedStudent}
          onChange={handleStudentChange}
          style={{
            background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155',
            borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.875rem', cursor: 'pointer',
            minWidth: '220px'
          }}
        >
          <option value="">Class Overview (All Students)</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.username} — {s.email}</option>
          ))}
        </select>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Mastered (≥75%)', color: '#22c55e' },
          { label: 'Learning (40–74%)', color: '#f59e0b' },
          { label: 'Weak (<40%)', color: '#ef4444' },
          { label: 'No Data', color: '#64748b' },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: color, flexShrink: 0 }} />
            {label}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
          <div style={{ width: 30, height: 2, background: '#475569' }} />
          Prerequisite dependency
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>
        {/* Graph Canvas */}
        <div style={{ flex: 1, position: 'relative', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', overflow: 'hidden' }}>
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b', zIndex: 10, color: '#94a3b8' }}>
              Building knowledge graph...
            </div>
          )}
          {!loading && nodes.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.5 }}>◎</div>
              <h3 style={{ margin: 0, color: '#94a3b8' }}>No topics found</h3>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>
                Upload chapters and topics via Excel in the Chapter Management page to populate this graph.
              </p>
            </div>
          )}
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

          {/* Zoom controls */}
          <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { label: '+', action: handleZoomIn, title: 'Zoom In' },
              { label: '−', action: handleZoomOut, title: 'Zoom Out' },
              { label: '⤢', action: handleFit, title: 'Fit to Screen' },
              { label: '↺', action: handleReset, title: 'Reset View' },
            ].map(({ label, action, title }) => (
              <button
                key={title}
                onClick={action}
                title={title}
                style={{
                  width: 36, height: 36, borderRadius: '8px',
                  background: '#0f172a', border: '1px solid #334155',
                  color: '#94a3b8', fontSize: '1rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.color = '#f1f5f9'; (e.target as HTMLButtonElement).style.borderColor = '#6366f1'; }}
                onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.color = '#94a3b8'; (e.target as HTMLButtonElement).style.borderColor = '#334155'; }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Side panel */}
        <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
          {/* Selected node details */}
          {selectedNode ? (
            <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', padding: '1.25rem' }}>
              <h3 style={{ margin: '0 0 0.75rem', color: '#f1f5f9', fontSize: '1rem' }}>{selectedNode.label}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>Chapter</span>
                  <span style={{ color: '#f1f5f9' }}>{selectedNode.chapter}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>Mastery</span>
                  <span style={{ color: getNodeColor(selectedNode.status), fontWeight: 600 }}>
                    {masteryLabel(selectedNode.mastery)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>Status</span>
                  <span style={{ color: getNodeColor(selectedNode.status), textTransform: 'capitalize', fontWeight: 600 }}>
                    {selectedNode.status}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>Quizzes</span>
                  <span style={{ color: '#f1f5f9' }}>{selectedNode.quizCount}</span>
                </div>
              </div>
              {selectedNode.mastery !== null && (
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ height: '6px', borderRadius: '3px', background: '#0f172a', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${selectedNode.mastery}%`,
                      background: getNodeColor(selectedNode.status),
                      borderRadius: '3px',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                  <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#64748b', textAlign: 'right' }}>{selectedNode.mastery}%</div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', padding: '1.25rem', color: '#64748b', fontSize: '0.8rem', textAlign: 'center' }}>
              Click any node to see topic details
            </div>
          )}

          {/* Weak topics panel */}
          {weakTopics.length > 0 && (
            <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #ef444440', padding: '1.25rem' }}>
              <h4 style={{ margin: '0 0 0.75rem', color: '#ef4444', fontSize: '0.875rem', fontWeight: 600 }}>
                Weak Areas ({weakTopics.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {weakTopics.map((t) => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: '#f1f5f9', flex: 1, marginRight: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label}</span>
                    <span style={{ color: '#ef4444', fontWeight: 600, flexShrink: 0 }}>{t.mastery}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats summary */}
          {nodes.length > 0 && (
            <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', padding: '1.25rem' }}>
              <h4 style={{ margin: '0 0 0.75rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Summary</h4>
              {(['mastered', 'learning', 'weak', 'unknown'] as const).map((status) => {
                const count = nodes.filter((n) => n.data.status === status).length;
                const pct = Math.round((count / nodes.length) * 100);
                return (
                  <div key={status} style={{ marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                      <span style={{ color: '#94a3b8', textTransform: 'capitalize' }}>{status}</span>
                      <span style={{ color: getNodeColor(status), fontWeight: 600 }}>{count} topics</span>
                    </div>
                    <div style={{ height: '4px', borderRadius: '2px', background: '#0f172a' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: getNodeColor(status), borderRadius: '2px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
