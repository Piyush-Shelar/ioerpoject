import React, { useState, useEffect } from 'react';
import { SimProvider, useSim } from './store/SimContext';
import NetworkHealthBar from './components/NetworkHealthBar';
import TopologyGraph from './components/TopologyGraph';
import Heatmap from './components/Heatmap';
import EnlargedNodeInspector from './components/EnlargedNodeInspector';
import EnergyPanel from './components/EnergyPanel';
import PredictiveAlertsPanel from './components/PredictiveAlertsPanel';
import ThresholdAnalyticsView from './components/ThresholdAnalyticsView';
import EventLog from './components/EventLog';

function DashboardContent() {
  const { selectedNodeId } = useSim();
  const [activeTab, setActiveTab] = useState('topology'); // 'topology' | 'heatmap' | 'alerts-analytics' | 'node-inspector'
  const [isEventLogMinimized, setIsEventLogMinimized] = useState(false);

  // When a node is selected (e.g. from Topology Graph or Heatmap), automatically switch to Node Inspector view
  useEffect(() => {
    if (selectedNodeId && activeTab !== 'node-inspector') {
      setActiveTab('node-inspector');
    }
  }, [selectedNodeId, activeTab]);

  return (
    <div className="app-container">
      {/* Network Health Header Bar */}
      <NetworkHealthBar onAlertClick={() => setActiveTab('alerts-analytics')} />

      {/* Main Dashboard Grid */}
      <main className="app-main" style={{ gridTemplateRows: isEventLogMinimized ? '1fr 44px' : '1fr 240px' }}>
        {/* Left Workspace: View Toggle + Graph or Heatmap or Analytics or Inspector */}
        <div style={{ gridColumn: '1 / 2', gridRow: '1 / 2', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

          {/* View Tab Controls */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
              marginBottom: '8px',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '4px'
            }}
          >
            <button
              className="btn"
              style={{
                background: activeTab === 'topology' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.6)',
                borderColor: activeTab === 'topology' ? 'var(--accent-cyan)' : 'var(--border-color)',
                color: activeTab === 'topology' ? '#ffffff' : 'var(--text-muted)',
              }}
              onClick={() => setActiveTab('topology')}
            >
              🌐 DODAG Mesh Topology
            </button>
            <button
              className="btn"
              style={{
                background: activeTab === 'heatmap' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.6)',
                borderColor: activeTab === 'heatmap' ? 'var(--accent-cyan)' : 'var(--border-color)',
                color: activeTab === 'heatmap' ? '#ffffff' : 'var(--text-muted)',
              }}
              onClick={() => setActiveTab('heatmap')}
            >
              🔥 Rack Thermal Heatmap
            </button>
            <button
              className="btn"
              style={{
                background: activeTab === 'alerts-analytics' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.6)',
                borderColor: activeTab === 'alerts-analytics' ? 'var(--accent-cyan)' : 'var(--border-color)',
                color: activeTab === 'alerts-analytics' ? '#ffffff' : 'var(--text-muted)',
              }}
              onClick={() => setActiveTab('alerts-analytics')}
            >
              📈 Threshold & Alert Analytics
            </button>
            <button
              className="btn"
              style={{
                background: activeTab === 'node-inspector' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.6)',
                borderColor: activeTab === 'node-inspector' ? 'var(--accent-cyan)' : 'var(--border-color)',
                color: activeTab === 'node-inspector' ? '#ffffff' : 'var(--text-muted)',
                display: (activeTab === 'node-inspector' || selectedNodeId) ? 'inline-flex' : 'none'
              }}
              onClick={() => setActiveTab('node-inspector')}
            >
              🔍 Node Inspector {selectedNodeId ? `(${selectedNodeId})` : ''}
            </button>
          </div>

          {/* Render Active View */}
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            {activeTab === 'topology' && <TopologyGraph />}
            {activeTab === 'heatmap' && <Heatmap />}
            {activeTab === 'alerts-analytics' && <ThresholdAnalyticsView />}
            {activeTab === 'node-inspector' && <EnlargedNodeInspector />}
          </div>
        </div>

        {/* Right Sidebar: Predictive Analytics & Energy Stats */}
        <div className="right-sidebar">
          <div style={{ flex: 1, minHeight: 0 }}>
            <PredictiveAlertsPanel />
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <EnergyPanel />
          </div>
        </div>

        {/* Bottom Left Panel: Event Log */}
        <div style={{ gridColumn: '1 / 2', gridRow: '2 / 3', minHeight: 0 }}>
          <EventLog isMinimized={isEventLogMinimized} onToggle={() => setIsEventLogMinimized(!isEventLogMinimized)} />
        </div>
      </main>

    </div>
  );
}

export default function App() {
  return (
    <SimProvider>
      <DashboardContent />
    </SimProvider>
  );
}
