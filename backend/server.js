/**
 * server.js
 * =========
 * Express + Socket.io server for the Data Center Monitoring Dashboard.
 *
 * Responsibilities:
 *   - Serve a minimal Express HTTP server (health-check endpoint)
 *   - Host a Socket.io server for real-time bidirectional communication
 *   - Wire the SimulationEngine events to Socket.io broadcasts
 *   - Handle client commands: add_node, kill_node
 *   - Serve initial state to newly connecting clients
 */

'use strict';

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const { SimulationEngine } = require('./simulation/SimulationEngine');
const { AlertEngine } = require('./simulation/alertEngine');

// ─── Server Setup ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// ─── Simulation Engine ────────────────────────────────────────────────────────

const engine = new SimulationEngine();

// ── Wire engine events → Socket.io broadcasts ──────────────────────────────

/**
 * Broadcast sensor readings to all connected clients every tick.
 * Payload: Array of { nodeId, temperature, humidity, gas, dutyCycle,
 *          batteryLife, rank, hopCount, parentId, timestamp }
 */
engine.on('sensor_update', (updates) => {
  io.emit('sensor_update', updates);
});

/**
 * Broadcast topology changes (node join, kill, re-parent).
 * Payload: { nodes[], links[], event: string, nodeId: string }
 */
engine.on('topology_update', (data) => {
  io.emit('topology_update', data);
});

/**
 * Broadcast timestamped log events (joins, failures, recoveries).
 * Payload: { type, message, nodeId, timestamp }
 */
engine.on('log_event', (event) => {
  io.emit('log_event', event);
});

/**
 * Broadcast network health statistics.
 * Payload: { totalNodes, onlineNodes, avgHopCount, lastConvergenceTime, pdr }
 */
engine.on('health_stats', (stats) => {
  io.emit('health_stats', stats);
});

// ── Alert Engine ────────────────────────────────────────────────────────────

/**
 * AlertEngine listens to sensor_update events internally and calls io.emit
 * directly for threshold and predictive alerts.
 * Payload shapes defined in alertEngine.js.
 */
const alertEngine = new AlertEngine(engine, (event, data) => {
  io.emit(event, data);
});

// ─── Socket.io Connection Handler ────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[Server] Client connected: ${socket.id}`);

  // ── Send current state to the newly connected client ──────────────────────

  // Full topology snapshot so the client can render the graph immediately
  socket.emit('topology_update', {
    ...engine.getTopologySnapshot(),
    event: 'init',
  });

  // Latest sensor readings for all online nodes
  const allReadings = [];
  for (const node of engine.getAllNodes()) {
    if (node.status === 'online' && node.latestReading) {
      allReadings.push({
        nodeId: node.id,
        rank: node.rank,
        hopCount: node.hopCount,
        parentId: node.parentId,
        ...node.latestReading,
      });
    }
  }
  if (allReadings.length > 0) {
    socket.emit('sensor_update', allReadings);
  }

  // Health stats
  socket.emit('health_stats', engine.getHealthStats());

  // ── Client command: add_node ───────────────────────────────────────────────

  /**
   * Client requests a new sensor node to join the network.
   * The engine runs the full staged join sequence (discovering→joining→joined)
   * and emits topology_update + log_event events during the process.
   * This command is fire-and-forget from the client's perspective.
   */
  socket.on('add_node', () => {
    console.log(`[Server] add_node requested by ${socket.id}`);
    engine.addNode().catch((err) => {
      console.error('[Server] add_node error:', err);
    });
  });

  // ── Client command: kill_node ──────────────────────────────────────────────

  /**
   * Client requests a specific node to be marked as failed/offline.
   * The engine runs the re-parenting sequence for orphaned children and
   * emits topology_update + log_event events during recovery.
   *
   * @param {{ nodeId: string }} payload
   */
  socket.on('kill_node', ({ nodeId }) => {
    console.log(`[Server] kill_node requested: ${nodeId} by ${socket.id}`);
    if (!nodeId) return;
    engine.killNode(nodeId).catch((err) => {
      console.error('[Server] kill_node error:', err);
    });
  });

  // ── Client command: get_node_readings ─────────────────────────────────────

  /**
   * Client requests the full reading history for a specific node.
   * Used when a node detail panel is first opened.
   *
   * @param {{ nodeId: string }} payload
   */
  socket.on('get_node_readings', ({ nodeId }, callback) => {
    const readings = engine.getNodeReadings(nodeId);
    if (typeof callback === 'function') {
      callback(readings);
    } else {
      socket.emit('node_readings', { nodeId, readings });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Server] Client disconnected: ${socket.id}`);
  });
});

// ─── REST Endpoints (supplementary) ──────────────────────────────────────────

/** Health check */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

/** Get current topology snapshot via REST (for debugging) */
app.get('/api/topology', (req, res) => {
  res.json(engine.getTopologySnapshot());
});

/** Get all nodes via REST */
app.get('/api/nodes', (req, res) => {
  res.json(engine.getAllNodes());
});

/** Get health stats via REST */
app.get('/api/health-stats', (req, res) => {
  res.json(engine.getHealthStats());
});

// ─── Start ────────────────────────────────────────────────────────────────────

engine.start();

httpServer.listen(PORT, () => {
  console.log(`[Server] Data Center Monitor backend running on port ${PORT}`);
  console.log(`[Server] REST API: http://localhost:${PORT}/api/`);
  console.log(`[Server] Socket.io: ws://localhost:${PORT}`);
});
