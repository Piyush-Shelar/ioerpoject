import React from 'react';
import { useSim } from '../store/SimContext';

export default function NetworkHealthBar({ onAlertClick }) {
  const { healthStats, addNode, alerts } = useSim();

  const formatTime = (isoString) => {
    if (!isoString) return 'N/A (Stable)';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <header className="glass-panel" style={{ margin: '14px 14px 0 14px', padding: '12px 24px', borderRadius: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(2, 132, 199, 0.5)',
              fontSize: '1.2rem',
            }}
          >
            📡
          </div>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.5px', color: '#f8fafc' }}>
              RPL MESH MONITOR
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Data Center IoT Environmental Sensing & DODAG Routing Topology
            </p>
          </div>
        </div>

        {/* Live Metrics */}
        <div style={{ display: 'flex', gap: '28px', alignItems: 'center' }}>
          {/* Total Nodes */}
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>
              Active Mesh Nodes
            </span>
            <span className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
              {healthStats.onlineNodes} <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>/ {healthStats.totalNodes}</span>
            </span>
          </div>

          {/* Divider */}
          <div style={{ width: '1px', height: '28px', background: 'var(--border-color)' }} />

          {/* Average Hop Count */}
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>
              Avg Hop Count
            </span>
            <span className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>
              {healthStats.avgHopCount} <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>hops</span>
            </span>
          </div>

          {/* Divider */}
          <div style={{ width: '1px', height: '28px', background: 'var(--border-color)' }} />

          {/* Packet Delivery Ratio (PDR) */}
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>
              Delivery Ratio (PDR)
            </span>
            <span
              className="font-mono"
              style={{
                fontSize: '1.2rem',
                fontWeight: 700,
                color: healthStats.pdr > 95 ? 'var(--accent-green)' : 'var(--accent-yellow)',
              }}
            >
              {healthStats.pdr}%
            </span>
          </div>

          {/* Divider */}
          <div style={{ width: '1px', height: '28px', background: 'var(--border-color)' }} />

          {/* Last Convergence */}
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>
              Last Convergence
            </span>
            <span className="font-mono" style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-muted)' }}>
              {formatTime(healthStats.lastConvergenceTime)}
            </span>
          </div>

          {/* Alerts Badge Action */}
          <button
            className="btn"
            onClick={onAlertClick}
            style={{
              marginLeft: '12px',
              borderColor: alerts.length > 0 ? 'var(--accent-red)' : 'var(--border-color)',
              background: alerts.length > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(15, 23, 42, 0.6)',
              color: alerts.length > 0 ? '#ef4444' : 'var(--text-muted)'
            }}
          >
            <span>{alerts.length > 0 ? '🚨' : '✅'}</span> Active Alerts: {alerts.length}
          </button>

          {/* Add Node Action */}
          <button className="btn" onClick={addNode} style={{ marginLeft: '12px' }}>
            <span>+</span> Add Mesh Node
          </button>
        </div>
      </div>
    </header>
  );
}
