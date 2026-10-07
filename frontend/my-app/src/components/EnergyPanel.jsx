import React from 'react';
import { useSim } from '../store/SimContext';

export default function EnergyPanel() {
  const { nodes } = useSim();

  const sensorNodes = Object.values(nodes).filter((n) => n.id !== 'SINK');

  // Convert battery hours to human readable days/hours
  const formatBattery = (hours) => {
    if (!hours || hours === Infinity) return 'N/A';
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h`;
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="topology-header">
        <div className="topology-title">
          <span>🔋 ENERGEST RADIO DUTY CYCLE & BATTERY</span>
        </div>
      </div>

      <div style={{ flex: 1, padding: '12px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {sensorNodes.map((node) => {
          const dc = node.dutyCycle || 4.0;
          const battery = node.batteryLife;
          const isOffline = node.status === 'offline';

          return (
            <div
              key={node.id}
              style={{
                background: 'rgba(15, 23, 42, 0.5)',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                opacity: isOffline ? 0.5 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8rem' }}>
                <span className="font-mono" style={{ fontWeight: 600, color: '#f8fafc' }}>
                  {node.id}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Duty: <strong style={{ color: 'var(--accent-purple)' }}>{dc}%</strong> | Est. Life:{' '}
                  <strong style={{ color: 'var(--accent-cyan)' }}>{formatBattery(battery)}</strong>
                </span>
              </div>

              {/* Duty cycle bar */}
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.min(dc * 8, 100)}%`, // scale 0-12% duty cycle visually
                    height: '100%',
                    background:
                      dc > 8
                        ? 'linear-gradient(90deg, #a855f7, #ef4444)'
                        : 'linear-gradient(90deg, #38bdf8, #a855f7)',
                    borderRadius: '3px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          );
        })}

        {sensorNodes.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '20px' }}>No active nodes</div>
        )}
      </div>
    </div>
  );
}
