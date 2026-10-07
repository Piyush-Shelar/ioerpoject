import React, { useRef, useEffect } from 'react';
import { useSim } from '../store/SimContext';

export default function EventLog({ isMinimized, onToggle }) {
  const { logEvents } = useSim();
  const listRef = useRef();

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0; // Keep newest at top
    }
  }, [logEvents.length]);

  const getLogStyle = (type) => {
    switch (type) {
      case 'join':
        return { color: 'var(--accent-green)', prefix: '🟢 [JOIN]' };
      case 'failure':
        return { color: 'var(--accent-red)', prefix: '🔴 [FAIL]' };
      case 'recovery':
        return { color: 'var(--accent-cyan)', prefix: '🔵 [RPL-RECOVERY]' };
      default:
        return { color: 'var(--text-muted)', prefix: '⚪ [LOG]' };
    }
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="topology-header" style={{ padding: '8px 14px' }}>
        <div className="topology-title" style={{ fontSize: '0.9rem' }}>
          <span>📜 SYSTEM & RE-ROUTING EVENT LOG</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: isMinimized ? 'none' : 'inline' }}>Live RPL DODAG Log</span>
          <button
            onClick={onToggle}
            className="btn"
            style={{ padding: '2px 8px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
          >
            {isMinimized ? '▲ Expand' : '▼ Minimize'}
          </button>
        </div>
      </div>

      <div
        ref={listRef}
        style={{
          display: isMinimized ? 'none' : 'flex',
          flex: 1,
          padding: '10px 14px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
        }}
      >
        {logEvents.length > 0 ? (
          logEvents.map((evt, idx) => {
            const style = getLogStyle(evt.type);
            const time = new Date(evt.timestamp).toLocaleTimeString([], {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: '8px',
                  lineHeight: '1.4',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  paddingBottom: '4px',
                }}
              >
                <span style={{ color: 'var(--text-dim)', flexShrink: 0 }}>[{time}]</span>
                <span style={{ color: style.color, fontWeight: 600, flexShrink: 0 }}>{style.prefix}</span>
                <span style={{ color: 'var(--text-main)', wordBreak: 'break-word' }}>{evt.message}</span>
              </div>
            );
          })
        ) : (
          <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '20px' }}>
            No log events recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}
