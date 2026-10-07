import React from 'react';
import { useSim } from '../store/SimContext';

export default function AlertsPanel() {
  const { alerts, dismissAlert } = useSim();

  if (alerts.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
      {alerts.map((alert) => (
        <div
          key={alert.timestamp + alert.nodeId}
          style={{
            background: alert.type === 'gas' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(249, 115, 22, 0.2)',
            border: `1px solid ${alert.type === 'gas' ? 'var(--accent-red)' : 'var(--accent-orange)'}`,
            borderRadius: '8px',
            padding: '10px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.2rem' }}>{alert.type === 'gas' ? '💨' : '🔥'}</span>
            <div>
              <span className="font-mono" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#ffffff' }}>
                CRITICAL THRESHOLD BREACH — {alert.nodeId}
              </span>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.9)', marginTop: '2px' }}>
                {alert.message}
              </p>
            </div>
          </div>
          <button
            onClick={() => dismissAlert(alert.timestamp)}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '1rem',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
