import React from 'react';
import { useSim } from '../store/SimContext';

export default function PredictiveAlertsPanel() {
  const { predictiveAlerts } = useSim();

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="topology-header">
        <div className="topology-title">
          <span>🧠 PREDICTIVE ANALYTICS (LINEAR REGRESSION)</span>
        </div>
      </div>

      <div style={{ flex: 1, padding: '12px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {predictiveAlerts.length > 0 ? (
          predictiveAlerts.map((pred, idx) => (
            <div
              key={idx}
              style={{
                background: 'rgba(234, 179, 8, 0.1)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-yellow)' }}>
                    Node {pred.nodeId} ({pred.metric.toUpperCase()})
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    Projected: ~{pred.projectedMinutes} min
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-main)', lineHeight: '1.3' }}>
                  {pred.message}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-dim)',
              fontSize: '0.8rem',
            }}
          >
            <span>✓ All environmental trends nominal</span>
            <span style={{ fontSize: '0.7rem', marginTop: '4px' }}>No threshold breaches projected in next 15 mins</span>
          </div>
        )}
      </div>
    </div>
  );
}
