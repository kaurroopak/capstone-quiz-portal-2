import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// ── Types ──────────────────────────────────────
interface NodeData {
  id: string;
  label: string;
  chapter: string;
  mastery: number | null;
  status: 'mastered' | 'learning' | 'weak' | 'unknown';
  quizCount: number;
}
interface EdgeData { id: string; source: string; target: string; }
interface GraphNode { data: NodeData; }
interface GraphEdge { data: EdgeData; }

// ── Colors ─────────────────────────────────────
function masteryFill(pct: number | null): string {
  if (pct === null || pct === 0) return '#D4D4D8';
  if (pct >= 80) return '#059669';
  if (pct >= 60) return '#10B981';
  if (pct >= 40) return '#34D399';
  if (pct >= 20) return '#F59E0B';
  return '#FCD34D';
}
function masteryGlow(pct: number | null): string {
  if (!pct || pct < 80) return 'none';
  return '0 0 18px rgba(5,150,105,0.5)';
}
function chapterHue(ch: string): string {
  const lower = ch.toLowerCase();
  if (lower.includes('light') || lower.includes('optic')) return '#2563EB';
  if (lower.includes('eye') || lower.includes('vision')) return '#7C3AED';
  if (lower.includes('electric')) return '#D97706';
  if (lower.includes('magnet')) return '#DC2626';
  return '#6B7280';
}

// ── Simple force-layout positions ─────────────
function computePositions(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number
): Record<string, { x: number; y: number }> {
  const pos: Record<string, { x: number; y: number }> = {};

  // Group by chapter
  const chapters: Record<string, string[]> = {};
  nodes.forEach(n => {
    const ch = n.data.chapter;
    if (!chapters[ch]) chapters[ch] = [];
    chapters[ch].push(n.data.id);
  });

  const chList = Object.keys(chapters);
  const cols = Math.ceil(Math.sqrt(chList.length));
  const colW = width / (cols + 1);
  const chCount = chList.length;

  chList.forEach((ch, ci) => {
    const topics = chapters[ch];
    const col = ci % cols;
    const row = Math.floor(ci / cols);
    const cx = colW * (col + 1);
    const cy = (height / (Math.ceil(chCount / cols) + 1)) * (row + 1);
    topics.forEach((tid, ti) => {
      const angle = (ti / topics.length) * 2 * Math.PI;
      const r = Math.min(70 + topics.length * 8, 130);
      pos[tid] = {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle)
      };
    });
  });

  return pos;
}

// ── Component ──────────────────────────────────
export const StudentSkillTree: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [learnedTopics, setLearnedTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: NodeData } | null>(null);

  // SVG pan/zoom state
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 900, h: 600 });
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [graphRes, dashRes] = await Promise.all([
          client.get('/knowledge-graph/me'),
          client.get('/analytics/student')
        ]);
        setNodes(graphRes.data.nodes || []);
        setEdges(graphRes.data.edges || []);
        setLearnedTopics(dashRes.data.learnedTopics || []);
      } catch (err) {
        console.error(err);
        setError('Failed to load skill tree.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (nodes.length > 0) {
      const pos = computePositions(nodes, edges, viewBox.w, viewBox.h);
      setPositions(pos);
    }
  }, [nodes, edges, viewBox.w, viewBox.h]);

  // ── Pan handlers ───────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = (e.clientX - lastMouse.current.x) * (viewBox.w / (containerRef.current?.offsetWidth || 900));
    const dy = (e.clientY - lastMouse.current.y) * (viewBox.h / (containerRef.current?.offsetHeight || 600));
    setViewBox(prev => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseUp = () => { isDragging.current = false; };
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    setViewBox(prev => ({
      ...prev,
      w: Math.max(300, Math.min(2000, prev.w * factor)),
      h: Math.max(200, Math.min(1400, prev.h * factor))
    }));
  };

  if (loading) return <div className="loading animate-fade-in">Building your skill tree...</div>;
  if (error) return <div className="alert alert-danger" style={{ margin: '40px' }}>{error}</div>;

  const masteredCount = nodes.filter(n => (n.data.mastery ?? 0) >= 80).length;
  const totalCount = nodes.length;

  return (
    <div className="animate-fade-in" style={{ padding: '28px 32px', height: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="display-heading">Physics Skill Tree</h1>
          <p style={{ fontSize: '13.5px', color: 'var(--ink-muted)', marginTop: '5px' }}>
            {masteredCount} / {totalCount} topics mastered · Click any node to open its module
          </p>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { color: '#D4D4D8', label: 'Not started' },
            { color: '#F59E0B', label: 'Learning (20-60%)' },
            { color: '#10B981', label: 'Proficient (60-80%)' },
            { color: '#059669', label: 'Mastered (80%+)', glow: true },
          ].map(({ color, label, glow }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '12px', height: '12px', borderRadius: '50%', background: color, flexShrink: 0,
                boxShadow: glow ? '0 0 8px rgba(5,150,105,0.5)' : 'none'
              }} />
              <span style={{ fontSize: '11.5px', color: 'var(--ink-muted)', fontWeight: 600 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SVG Canvas */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          overflow: 'hidden',
          position: 'relative',
          cursor: isDragging.current ? 'grabbing' : 'grab'
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      >
        {/* Grid bg */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(26,26,26,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(26,26,26,0.03) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          pointerEvents: 'none'
        }} />

        <svg
          ref={svgRef}
          width="100%" height="100%"
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="var(--border-strong)" />
            </marker>
          </defs>

          {/* Edges */}
          {edges.map(edge => {
            const src = positions[edge.data.source];
            const tgt = positions[edge.data.target];
            if (!src || !tgt) return null;
            return (
              <line
                key={edge.data.id}
                x1={src.x} y1={src.y}
                x2={tgt.x} y2={tgt.y}
                stroke="var(--border-strong)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                markerEnd="url(#arrowhead)"
                opacity={0.5}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map(node => {
            const pos = positions[node.data.id];
            if (!pos) return null;
            const { id, label, chapter, mastery, status } = node.data;
            const fill = masteryFill(mastery);
            const glow = masteryGlow(mastery);
            const chColor = chapterHue(chapter);
            const isHovered = hoveredNode === id;
            const isLearned = learnedTopics.includes(id);
            const r = 28 + Math.min((mastery || 0) / 5, 14); // size grows with mastery

            return (
              <g
                key={id}
                transform={`translate(${pos.x}, ${pos.y})`}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/student/study/${id}`)}
                onMouseEnter={(e) => {
                  setHoveredNode(id);
                  const svgRect = svgRef.current?.getBoundingClientRect();
                  if (svgRect) {
                    setTooltip({
                      x: e.clientX - svgRect.left,
                      y: e.clientY - svgRect.top,
                      node: node.data
                    });
                  }
                }}
                onMouseLeave={() => { setHoveredNode(null); setTooltip(null); }}
              >
                {/* Chapter color ring */}
                <circle
                  r={r + 5}
                  fill="none"
                  stroke={chColor}
                  strokeWidth={2}
                  opacity={0.3}
                />
                {/* Main node circle */}
                <circle
                  r={r}
                  fill={fill}
                  stroke={isHovered ? 'var(--ink)' : '#FFFFFF'}
                  strokeWidth={isHovered ? 2.5 : 2}
                  style={{
                    filter: glow !== 'none' ? `drop-shadow(0 0 6px rgba(5,150,105,0.5))` : 'none',
                    transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                    transition: 'transform 0.2s'
                  }}
                />
                {/* Learned checkmark */}
                {isLearned && (
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={r > 36 ? "14" : "11"}
                    y={-r + 10}
                    fill="#047857"
                    fontWeight="700"
                  >✓</text>
                )}
                {/* Label */}
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="10.5"
                  fill={status === 'unknown' ? '#71717A' : '#FFFFFF'}
                  fontWeight="700"
                  dy={mastery && mastery > 0 ? -4 : 0}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {label.length > 16 ? label.substring(0, 15) + '…' : label}
                </text>
                {mastery && mastery > 0 && (
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="9"
                    fill={status === 'unknown' ? '#71717A' : 'rgba(255,255,255,0.85)'}
                    fontWeight="600"
                    dy={9}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {mastery}%
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position: 'absolute',
            left: tooltip.x + 14,
            top: tooltip.y - 30,
            background: 'var(--ink)',
            color: 'var(--paper)',
            padding: '9px 14px',
            borderRadius: '10px',
            fontSize: '12.5px',
            fontWeight: 600,
            pointerEvents: 'none',
            zIndex: 10,
            maxWidth: '200px',
            boxShadow: 'var(--shadow-lg)',
            lineHeight: 1.5
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px' }}>{tooltip.node.label}</div>
            <div style={{ opacity: 0.75, marginTop: '2px' }}>{tooltip.node.chapter}</div>
            <div style={{ marginTop: '4px', color: masteryFill(tooltip.node.mastery) }}>
              {tooltip.node.mastery !== null && tooltip.node.mastery > 0
                ? `Mastery: ${tooltip.node.mastery}%`
                : 'Not attempted yet'}
            </div>
            <div style={{ fontSize: '11px', opacity: 0.65, marginTop: '2px' }}>Click to open module →</div>
          </div>
        )}

        {/* Controls hint */}
        <div style={{
          position: 'absolute', bottom: '12px', right: '14px',
          fontSize: '11px', color: 'var(--ink-muted)', fontWeight: 600
        }}>
          Drag to pan · Scroll to zoom
        </div>
      </div>

      {/* Bottom chapter summary row */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
        {Object.entries(
          nodes.reduce((acc, n) => {
            const ch = n.data.chapter;
            if (!acc[ch]) acc[ch] = { total: 0, mastered: 0 };
            acc[ch].total++;
            if ((n.data.mastery ?? 0) >= 80) acc[ch].mastered++;
            return acc;
          }, {} as Record<string, { total: number; mastered: number }>)
        ).map(([ch, stats]) => (
          <div key={ch} style={{
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            borderLeft: `4px solid ${chapterHue(ch)}`,
            borderRadius: '10px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)' }}>{ch}</div>
              <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                {stats.mastered}/{stats.total} mastered
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
