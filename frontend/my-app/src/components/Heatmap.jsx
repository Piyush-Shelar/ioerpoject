import React from 'react';
import { useSim } from '../store/SimContext';

export default function Heatmap() {
  const { nodes, selectNode, selectedNodeId } = useSim();

  // Filter out Sink for heatmap (sensor nodes only)
  const sensorNodes = Object.values(nodes).filter((n) => n.id !== 'SINK');

  // Interpolate color based on temperature (18°C = green, 27°C = yellow, 35°C+ = red)
  const getTempColor = (temp) => {
    if (!temp) return 'rgba(100, 116, 139, 0.2)';
    if (temp <= 25) {
      // Green to light green
      const ratio = (temp - 18) / 7;
      return `rgba(${Math.round(34 + ratio * 100)}, 197, 94, 0.7)`;
    } else if (temp <= 30) {
      // Yellow / Orange
      const ratio = (temp - 25) / 5;
      return `rgba(234, ${Math.round(179 - ratio * 100)}, 8, 0.8)`;
    } else {
      // Red
      return `rgba(239, 68, 68, 0.85)`;
    }
  };

  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="topology-header">
        <div className="topology-title">
          <span>🔥 DATA CENTER RACK HEATMAP</span>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Auto-sizing Rack Grid</span>
      </div>

      <div
        style={{
          flex: 1,
          padding: '16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
          gap: '12px',
          alignContent: 'start',
          overflowY: 'auto',
        }}
      >
        {sensorNodes.map((node) => {
          const temp = node.latestReading?.temperature;
          const isSelected = node.id === selectedNodeId;
          const bg = node.status === 'offline' ? 'rgba(100, 116, 139, 0.15)' : getTempColor(temp);

          return (
            <div
              key={node.id}
              onClick={() => selectNode(node.id)}
              style={{
                background: bg,
                border: isSelected ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px',
                padding: '12px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                boxShadow: isSelected ? '0 0 12px rgba(255,255,255,0.3)' : 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <span className="font-mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                {node.id}
              </span>
              <span className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px', color: '#ffffff' }}>
                {temp !== undefined ? `${temp}°C` : 'N/A'}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.8)', marginTop: '4px' }}>
                Rank {node.rank !== undefined ? node.rank : '?'}
              </span>
            </div>
          );
        })}

        {sensorNodes.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-dim)', padding: '40px' }}>
            No sensor nodes in network. Click "+ Add Mesh Node" above.
          </div>
        )}
      </div>
    </div>
  );
}
