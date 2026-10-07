import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { useSim } from '../store/SimContext';

const NODE_COLORS = ['#38bdf8', '#22c55e', '#a855f7', '#f97316', '#ec4899', '#eab308', '#06b6d4', '#10b981'];

export default function ThresholdAnalyticsView() {
  const { nodes, readingsHistory, alerts, dismissAlert } = useSim();
  const [selectedMetric, setSelectedMetric] = useState('temperature'); // 'temperature' | 'gas' | 'humidity'
  const [filterNodeId, setFilterNodeId] = useState('ALL');

  const sensorNodes = Object.values(nodes).filter((n) => n.id !== 'SINK');

  // Build unified timestamped data array for multi-node comparison
  const timestampsSet = new Set();
  Object.values(readingsHistory).forEach((history) => {
    history.forEach((r) => timestampsSet.add(r.timestamp));
  });

  const sortedTimestamps = Array.from(timestampsSet).sort((a, b) => a - b).slice(-25);

  const chartData = sortedTimestamps.map((ts) => {
    const timeStr = new Date(ts).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' });
    const row = { time: timeStr, timestamp: ts };

    sensorNodes.forEach((node) => {
      const history = readingsHistory[node.id] || [];
      const reading = history.find((r) => r.timestamp === ts);
      if (reading) {
        row[node.id] = reading[selectedMetric];
      }
    });

    return row;
  });

  const getThresholdValue = () => {
    if (selectedMetric === 'temperature') return 30;
    if (selectedMetric === 'gas') return 250;
    return null;
  };

  const getMetricLabel = () => {
    if (selectedMetric === 'temperature') return 'Temperature (°C)';
    if (selectedMetric === 'gas') return 'Gas / Smoke Concentration (ppm)';
    return 'Relative Humidity (%)';
  };

  const thresholdVal = getThresholdValue();

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header controls */}
      <div className="topology-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div className="topology-title">
          <span>📈 REAL-TIME THRESHOLD & ALERT ANALYTICS</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Metric Selector */}
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(15, 23, 42, 0.7)', padding: '3px', borderRadius: '6px' }}>
            <button
              onClick={() => setSelectedMetric('temperature')}
              className="btn"
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                background: selectedMetric === 'temperature' ? 'rgba(239, 68, 68, 0.25)' : 'transparent',
                borderColor: selectedMetric === 'temperature' ? '#ef4444' : 'transparent',
                color: selectedMetric === 'temperature' ? '#ffffff' : 'var(--text-muted)',
              }}
            >
              🔥 Temp (30°C)
            </button>
            <button
              onClick={() => setSelectedMetric('gas')}
              className="btn"
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                background: selectedMetric === 'gas' ? 'rgba(234, 179, 8, 0.25)' : 'transparent',
                borderColor: selectedMetric === 'gas' ? '#eab308' : 'transparent',
                color: selectedMetric === 'gas' ? '#ffffff' : 'var(--text-muted)',
              }}
            >
              💨 Gas (250 ppm)
            </button>
            <button
              onClick={() => setSelectedMetric('humidity')}
              className="btn"
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                background: selectedMetric === 'humidity' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                borderColor: selectedMetric === 'humidity' ? '#38bdf8' : 'transparent',
                color: selectedMetric === 'humidity' ? '#ffffff' : 'var(--text-muted)',
              }}
            >
              💧 Humidity (%)
            </button>
          </div>

          {/* Node Filter */}
          <select
            value={filterNodeId}
            onChange={(e) => setFilterNodeId(e.target.value)}
            style={{
              background: '#0f172a',
              color: 'var(--accent-cyan)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '5px 10px',
              fontSize: '0.8rem',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Nodes Comparison</option>
            {sensorNodes.map((n) => (
              <option key={n.id} value={n.id}>
                Node {n.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Chart Workspace */}
      <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0 }}>
        <div style={{ flex: 1, width: '100%', minHeight: '220px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', padding: '12px 12px 0 0' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} domain={['auto', 'auto']} label={{ value: getMetricLabel(), angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#0f172a', borderColor: '#38bdf8', borderRadius: '8px', fontSize: '0.8rem' }} />
              <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '6px' }} />

              {/* Reference Line for Critical Threshold */}
              {thresholdVal && (
                <ReferenceLine
                  y={thresholdVal}
                  stroke={selectedMetric === 'temperature' ? '#ef4444' : '#f97316'}
                  strokeDasharray="6 6"
                  strokeWidth={2}
                  label={{
                    value: `CRITICAL THRESHOLD: ${thresholdVal} ${selectedMetric === 'temperature' ? '°C' : 'ppm'}`,
                    fill: selectedMetric === 'temperature' ? '#ef4444' : '#f97316',
                    fontSize: 11,
                    position: 'insideTopRight',
                    fontWeight: 'bold',
                  }}
                />
              )}

              {/* Render Lines per Node */}
              {sensorNodes
                .filter((n) => filterNodeId === 'ALL' || filterNodeId === n.id)
                .map((node, idx) => (
                  <Line
                    key={node.id}
                    type="monotone"
                    dataKey={node.id}
                    name={`Node ${node.id}`}
                    stroke={NODE_COLORS[idx % NODE_COLORS.length]}
                    strokeWidth={filterNodeId === node.id ? 3 : 2}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Threshold Breach History Log */}
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', maxHeight: '140px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
              🚨 RECENT THRESHOLD BREACH EVENTS ({alerts.length})
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Click ✕ to clear event</span>
          </div>

          {alerts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {alerts.map((alert) => (
                <div
                  key={alert.timestamp + alert.nodeId}
                  style={{
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    background: alert.type === 'gas' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(249, 115, 22, 0.15)',
                    border: `1px solid ${alert.type === 'gas' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(249, 115, 22, 0.3)'}`,
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.78rem',
                  }}
                >
                  <span className="font-mono" style={{ color: alert.type === 'gas' ? 'var(--accent-red)' : 'var(--accent-orange)' }}>
                    {alert.message}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                      {new Date(alert.timestamp).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })}
                    </span>
                    <button
                      onClick={() => dismissAlert(alert.timestamp)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center', padding: '10px' }}>
              ✓ No active threshold breaches. All metrics operating within normal operating bounds.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
