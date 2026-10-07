import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useSim } from '../store/SimContext';

export default function NodeDetailPanel() {
  const { selectedNodeId, selectNode, nodes, readingsHistory, killNode } = useSim();

  const isOpen = !!selectedNodeId;
  const node = selectedNodeId ? nodes[selectedNodeId] : null;
  const history = selectedNodeId ? readingsHistory[selectedNodeId] || [] : [];

  const formattedHistory = history.map((r) => ({
    ...r,
    time: new Date(r.timestamp).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }),
  }));

  const handleKill = () => {
    if (selectedNodeId) {
      killNode(selectedNodeId);
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div className={`drawer-overlay ${isOpen ? 'open' : ''}`} onClick={() => selectNode(null)} />

      {/* Side Drawer */}
      <div className={`side-drawer ${isOpen ? 'open' : ''}`}>
        {node ? (
          <>
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    Node {node.id}
                  </h2>
                  <span className={`badge badge-${node.status}`}>{node.status}</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Detailed Sensor Readings & Routing Info</p>
              </div>
              <button
                onClick={() => selectNode(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {/* Topology / Routing Specs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                marginBottom: '20px',
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>RPL Rank</span>
                <span className="font-mono" style={{ fontSize: '1rem', fontWeight: 600 }}>
                  {node.rank !== undefined ? node.rank : 'N/A'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>Parent Node</span>
                <span className="font-mono" style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                  {node.parentId || 'None'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>Hop Count</span>
                <span className="font-mono" style={{ fontSize: '1rem', fontWeight: 600 }}>
                  {node.hopCount !== undefined ? node.hopCount : 'N/A'} hops
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>Radio Duty Cycle</span>
                <span className="font-mono" style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent-purple)' }}>
                  {node.dutyCycle ? `${node.dutyCycle}%` : 'N/A'}
                </span>
              </div>
            </div>

            {/* Recharts: Temperature Line Chart */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                TEMPERATURE TREND (°C)
              </h4>
              <div style={{ width: '100%', height: 130, background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '6px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formattedHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ background: '#0f172a', borderColor: '#38bdf8' }} />
                    <Line type="monotone" dataKey="temperature" stroke="#ef4444" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recharts: Gas / Smoke Line Chart */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                GAS / SMOKE TREND (PPM)
              </h4>
              <div style={{ width: '100%', height: 130, background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '6px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formattedHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ background: '#0f172a', borderColor: '#eab308' }} />
                    <Line type="monotone" dataKey="gas" stroke="#eab308" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recharts: Humidity Line Chart */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                HUMIDITY TREND (%)
              </h4>
              <div style={{ width: '100%', height: 130, background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '6px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formattedHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ background: '#0f172a', borderColor: '#38bdf8' }} />
                    <Line type="monotone" dataKey="humidity" stroke="#38bdf8" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Kill Node Control (Only shown when selected) */}
            <div style={{ marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
              <button
                className="btn btn-danger"
                onClick={handleKill}
                disabled={node.status === 'offline'}
                style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
              >
                {node.status === 'offline' ? 'Node Currently Offline' : `Simulate Node Failure (Kill ${node.id})`}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
