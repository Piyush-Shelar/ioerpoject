import React, { useRef, useCallback, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useSim } from '../store/SimContext';

export default function TopologyGraph() {
  const { graphData, selectNode, selectedNodeId, nodes } = useSim();
  const fgRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  // Update canvas dimensions on container resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight - 55, // Subtract header height
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Center topology graph on load / data update
  useEffect(() => {
    if (fgRef.current && graphData.nodes.length > 0) {
      fgRef.current.d3ReheatSimulation();
    }
  }, [graphData.nodes.length]);

  // Determine node color based on readings and status
  const getNodeColor = useCallback((node) => {
    if (node.id === 'SINK') return '#0284c7'; // Cyan root
    if (node.status === 'offline') return '#64748b'; // Gray
    if (node.status === 'discovering') return '#eab308'; // Yellow
    if (node.status === 'joining') return '#a855f7'; // Purple

    const latest = node.latestReading;
    if (!latest) return '#22c55e'; // Green default

    if (latest.gas > 250 || latest.temperature > 30) {
      return '#ef4444'; // Alert Red
    }
    if (latest.temperature > 28 || latest.gas > 150) {
      return '#f97316'; // Warning Orange
    }

    return '#22c55e'; // Healthy Green
  }, []);

  // Custom node rendering (Canvas API)
  const drawNode = useCallback(
    (node, ctx, globalScale) => {
      const isSink = node.id === 'SINK';
      const isSelected = node.id === selectedNodeId;
      const color = getNodeColor(node);

      const r = isSink ? 14 : isSelected ? 12 : 9;

      // Glow effect for Sink or Selected
      if (isSink || isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 5, 0, 2 * Math.PI, false);
        ctx.fillStyle = isSink ? 'rgba(56, 189, 248, 0.25)' : 'rgba(34, 197, 94, 0.3)';
        ctx.fill();
      }

      // Outer circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = isSink ? 15 : 8;
      ctx.fill();
      ctx.shadowBlur = 0; // reset

      // White border for selected
      if (isSelected) {
        ctx.lineWidth = 2 / globalScale;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }

      // Label text
      const fontSize = isSink ? 12 / globalScale : 10 / globalScale;
      ctx.font = `${isSink ? 'bold' : 'normal'} ${fontSize}px "JetBrains Mono", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Text label below node
      const labelY = node.y + r + 10 / globalScale;
      ctx.fillStyle = '#f8fafc';
      const nodeText = isSink ? 'ROOT (SINK)' : node.id;
      ctx.fillText(nodeText, node.x, labelY);

      // Status sub-badge if joining or discovering
      if (node.status === 'discovering' || node.status === 'joining') {
        const badgeY = labelY + 10 / globalScale;
        ctx.font = `bold ${8 / globalScale}px sans-serif`;
        ctx.fillStyle = node.status === 'discovering' ? '#eab308' : '#a855f7';
        ctx.fillText(`[${node.status.toUpperCase()}]`, node.x, badgeY);
      }
    },
    [getNodeColor, selectedNodeId]
  );

  return (
    <div ref={containerRef} className="glass-panel topology-container" style={{ flex: 1, height: '100%' }}>
      <div className="topology-header">
        <div className="topology-title">
          <div className="status-dot" />
          <span>RPL DODAG TOPOLOGY VIEW</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0284c7' }} /> Root (Sink)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} /> Healthy
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f97316' }} /> Warning
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} /> Alert
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748b' }} /> Offline
          </span>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeCanvasObject={drawNode}
          nodePointerAreaPaint={(node, color, ctx) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, 14, 0, 2 * Math.PI, false);
            ctx.fill();
          }}
          linkColor={() => 'rgba(56, 189, 248, 0.4)'}
          linkWidth={1.5}
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={0.008}
          linkDirectionalParticleWidth={2.5}
          linkDirectionalParticleColor={() => '#38bdf8'}
          onNodeClick={(node) => {
            if (node.id !== 'SINK') {
              selectNode(node.id);
            }
          }}
          cooldownTicks={100}
        />
      </div>
    </div>
  );
}
