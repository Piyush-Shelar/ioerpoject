import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { useSim } from '../store/SimContext';

export default function EnlargedNodeInspector() {
  const { selectedNodeId, selectNode, nodes, readingsHistory, killNode } = useSim();

  // If no node is selected, show a prompt
  if (!selectedNodeId) {
    return (
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔍</div>
        <h2 style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>No Node Selected</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Select a node from the Topology or Heatmap to inspect details.</p>
      </div>
    );
  }

  const node = nodes[selectedNodeId];
  const history = readingsHistory[selectedNodeId] || [];
  const sensorNodes = Object.values(nodes).filter((n) => n.id !== 'SINK');

  // Format data for Recharts
  const formattedHistory = history.map((r) => ({
    ...r,
    time: new Date(r.timestamp).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }),
  }));

  const handleKill = () => {
    if (selectedNodeId) {
      killNode(selectedNodeId);
      // Optional: don't auto close, just let the state update
    }
  };

  const isOffline = node?.status === 'offline';

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header with Selector */}
      <div className="topology-header" style={{ flexWrap: 'wrap', gap: '12px', background: 'rgba(15, 23, 42, 0.4)' }}>
        <div className="topology-title">
          <span style={{ fontSize: '1.2rem' }}>🔍 NODE INSPECTOR</span>
          
          <select
            value={selectedNodeId || ''}
            onChange={(e) => selectNode(e.target.value)}
            style={{
              background: '#0f172a',
              color: 'var(--accent-cyan)',
              border: '1px solid var(--accent-cyan)',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '1rem',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              marginLeft: '12px'
            }}
          >
            {sensorNodes.map((n) => (
              <option key={n.id} value={n.id}>Node {n.id}</option>
            ))}
          </select>
          
          {node && <span className={`badge badge-${node.status}`} style={{ marginLeft: '12px', padding: '4px 10px', fontSize: '0.85rem' }}>{node.status}</span>}
        </div>

        {node && (
          <button
            className="btn btn-danger"
            onClick={handleKill}
            disabled={isOffline}
            style={{ padding: '8px 16px', fontWeight: 600 }}
          >
            {isOffline ? 'Offline' : `Simulate Failure (Kill Node)`}
          </button>
        )}
      </div>

      {node ? (
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Key Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            {/* Temp */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>TEMPERATURE</div>
              <div className="font-mono" style={{ fontSize: '1.8rem', fontWeight: 700, color: '#ef4444' }}>
                {node.latestReading?.temperature ? `${node.latestReading.temperature}°C` : '--'}
              </div>
            </div>
            {/* Gas */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(249, 115, 22, 0.2)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>GAS / SMOKE</div>
              <div className="font-mono" style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f97316' }}>
                {node.latestReading?.gas ? `${node.latestReading.gas} ppm` : '--'}
              </div>
            </div>
            {/* Humidity */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>HUMIDITY</div>
              <div className="font-mono" style={{ fontSize: '1.8rem', fontWeight: 700, color: '#38bdf8' }}>
                {node.latestReading?.humidity ? `${node.latestReading.humidity}%` : '--'}
              </div>
            </div>
            {/* Routing Info */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                 <span style={{ color: 'var(--text-muted)' }}>Parent:</span>
                 <span className="font-mono" style={{ color: 'var(--accent-cyan)' }}>{node.parentId || 'None'}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                 <span style={{ color: 'var(--text-muted)' }}>Rank:</span>
                 <span className="font-mono" style={{ color: 'var(--text-main)' }}>{node.rank !== undefined ? node.rank : 'N/A'}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                 <span style={{ color: 'var(--text-muted)' }}>Hops:</span>
                 <span className="font-mono" style={{ color: 'var(--text-main)' }}>{node.hopCount !== undefined ? node.hopCount : 'N/A'}</span>
               </div>
            </div>
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', minHeight: '300px' }}>
            
            {/* Temp Chart */}
            <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Temperature Trend (°C)</h4>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formattedHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ background: '#0f172a', borderColor: '#ef4444' }} />
                    <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="4 4" label={{ position: 'insideTopLeft', value: '30°C Alert', fill: '#ef4444', fontSize: 10 }} />
                    <Line type="monotone" dataKey="temperature" stroke="#ef4444" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gas Chart */}
            <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Gas / Smoke Trend (ppm)</h4>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formattedHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ background: '#0f172a', borderColor: '#f97316' }} />
                    <ReferenceLine y={250} stroke="#f97316" strokeDasharray="4 4" label={{ position: 'insideTopLeft', value: '250ppm Alert', fill: '#f97316', fontSize: 10 }} />
                    <Line type="monotone" dataKey="gas" stroke="#f97316" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
          </div>
        </div>
      ) : null}
    </div>
  );
}
