/**
 * SimulationEngine.js
 * ===================
 * Core RPL DODAG simulation engine.
 *
 * Models a genuine RPL (Routing Protocol for Low-Power and Lossy Networks)
 * tree network as defined in RFC 6550:
 *   - One Sink/Border Router (rank 0, DODAG root)
 *   - Multiple SensorNodes, each assigned a parent based on simulated
 *     Expected Transmission Count (ETX) / signal strength heuristic
 *   - Rank = parent.rank + 1
 *   - Nodes generate periodic sensor readings every TICK_INTERVAL ms
 *
 * Join sequence mimics real RPL DIO/DAO exchange:
 *   discovering → joining → joined
 *
 * Kill sequence mimics real RPL node failure + re-parenting (DAO-ACK timeout
 * detection, then children select next-best parent via DIO comparison).
 */

'use strict';

const { EventEmitter } = require('events');

// ─── Constants ────────────────────────────────────────────────────────────────

const TICK_INTERVAL_MS = 5000;          // Sensor reading period (5 seconds)
const MAX_READINGS_HISTORY = 30;        // Readings kept per node
const BATTERY_CAPACITY_MAH = 2000;      // Simulated AA battery capacity in mAh
const RADIO_CURRENT_MA = 20;            // Simulated radio draw when TX/RX active
const SLEEP_CURRENT_UA = 15;            // Simulated sleep current in µA
const INITIAL_NODE_COUNT = 7;           // Nodes created at startup (+ 1 sink)

// Alert thresholds
const TEMP_ALERT_THRESHOLD = 30;        // °C
const GAS_ALERT_THRESHOLD = 250;        // ppm

// ─── Utility helpers ──────────────────────────────────────────────────────────

/** Returns a random float between min and max */
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

/** Returns a random integer between min and max (inclusive) */
function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

/** Clamp value between lo and hi */
function clamp(value, lo, hi) {
  return Math.max(lo, Math.min(hi, value));
}

/** Generate a unique node ID string */
let _nodeCounter = 0;
function nextNodeId() {
  _nodeCounter += 1;
  return `N${String(_nodeCounter).padStart(2, '0')}`;
}

/**
 * Simulated ETX (Expected Transmission Count) between two "positions".
 * A lower ETX = better link quality.  We model ETX as inversely proportional
 * to Euclidean distance (nodes physically closer → fewer retransmissions).
 * ETX ≥ 1.0 always (perfect link), ETX → ∞ as nodes move out of range.
 */
function simulateETX(posA, posB) {
  const dx = posA.x - posB.x;
  const dy = posA.y - posB.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  // Signal range: 0..1 normalised grid.  Max comms range ~0.45 units.
  if (dist > 0.45) return Infinity;  // Out of range
  // ETX rises steeply as distance approaches the radio range boundary
  const etx = 1.0 + (dist / 0.45) * 4.0;
  // Add small random noise to simulate link variability
  return etx + rand(-0.05, 0.05);
}

// ─── SensorNode class ─────────────────────────────────────────────────────────

class SensorNode {
  /**
   * @param {string} id        - Unique node identifier
   * @param {object} position  - { x: 0..1, y: 0..1 } normalised grid position
   */
  constructor(id, position) {
    this.id = id;
    this.position = position;

    // RPL topology fields
    this.parentId = null;          // Parent node ID in DODAG
    this.rank = Infinity;          // RPL rank (lower = closer to root)
    this.hopCount = Infinity;      // Hops to sink (= rank for unit-step cost)

    // Node lifecycle status
    // 'discovering' | 'joining' | 'joined' | 'online' | 'offline'
    this.status = 'discovering';

    // Sensor reading history (ring buffer, max MAX_READINGS_HISTORY entries)
    this.readings = [];

    // Energest-style radio duty cycle tracking
    // Represents fraction of time the radio is active (TX+RX / total)
    // Baseline 2–8%, influenced by traffic load and hop count
    this.dutyCycle = rand(2, 8);   // Percentage

    // Estimated battery life derived from duty cycle
    // Formula: remaining hours = capacity_mAh / average_current_mA
    // average_current = (dutyCycle/100 * RADIO_CURRENT_MA) + ((1-dutyCycle/100) * SLEEP_CURRENT_UA/1000)
    this.batteryLife = this._calcBatteryLife();

    // Drift accumulators to make readings feel realistic over time
    this._tempDrift = 0;
    this._gasDrift = 0;
  }

  /**
   * Calculate estimated battery life in hours based on current duty cycle.
   * This mirrors Contiki's Energest module calculation where total energy
   * consumption = (radio_on_time × TX_current) + (radio_off_time × sleep_current).
   */
  _calcBatteryLife() {
    const dcFraction = this.dutyCycle / 100;
    const avgCurrentMA =
      dcFraction * RADIO_CURRENT_MA +
      (1 - dcFraction) * (SLEEP_CURRENT_UA / 1000);
    // Return estimated hours of life remaining (assume full battery on start)
    return Math.round(BATTERY_CAPACITY_MAH / avgCurrentMA);
  }

  /**
   * Generate one sensor reading tick.
   * Temperature: 22–32°C baseline with slow random walk (drift) and
   *   occasional upward spikes (simulating rack heat events).
   * Humidity: 35–60% with gentle oscillation.
   * Gas/smoke (ppm): 40–120 baseline, 5% chance of spike to 300–500 ppm
   *   (simulating a smoke or VOC event in the data center).
   * Duty cycle: slowly varies ±0.5% per tick, bounded 2–10%.
   */
  generateReading() {
    // ── Temperature ──────────────────────────────────────────────────────────
    // Slow random walk with reversion to mean (22–28°C normal range)
    this._tempDrift = clamp(this._tempDrift + rand(-0.4, 0.5), -3, 5);
    const baseTemp = 25 + this._tempDrift;
    // 8% chance of a brief spike above 30°C (overheating event)
    const tempSpike = Math.random() < 0.08 ? rand(2, 7) : 0;
    const temperature = clamp(baseTemp + tempSpike + rand(-0.2, 0.2), 18, 40);

    // ── Humidity ─────────────────────────────────────────────────────────────
    const humidity = clamp(47 + rand(-12, 13) + Math.sin(Date.now() / 120000) * 5, 30, 70);

    // ── Gas / Smoke (ppm) ────────────────────────────────────────────────────
    this._gasDrift = clamp(this._gasDrift + rand(-2, 2), -20, 20);
    const baseGas = 80 + this._gasDrift;
    // 5% chance of a smoke spike (300–500 ppm) — simulates VOC/smoke event
    const gasSpike = Math.random() < 0.05 ? rand(220, 420) : 0;
    const gas = clamp(baseGas + gasSpike + rand(-5, 5), 30, 520);

    // ── Radio Duty Cycle (Energest-style) ────────────────────────────────────
    // Higher hop count → more relaying → slightly higher duty cycle
    const hopPenalty = (this.hopCount !== Infinity ? this.hopCount : 1) * 0.3;
    this.dutyCycle = clamp(
      this.dutyCycle + rand(-0.3, 0.4) + hopPenalty * 0.05,
      2,
      12
    );
    this.batteryLife = this._calcBatteryLife();

    const reading = {
      timestamp: Date.now(),
      temperature: parseFloat(temperature.toFixed(2)),
      humidity: parseFloat(humidity.toFixed(1)),
      gas: parseFloat(gas.toFixed(1)),
      dutyCycle: parseFloat(this.dutyCycle.toFixed(2)),
      batteryLife: this.batteryLife,
    };

    // Maintain ring buffer
    this.readings.push(reading);
    if (this.readings.length > MAX_READINGS_HISTORY) {
      this.readings.shift();
    }

    return reading;
  }

  /** Returns last reading or nulls if no readings yet */
  latestReading() {
    return this.readings.length > 0
      ? this.readings[this.readings.length - 1]
      : null;
  }

  /** Serialise node state for socket emission */
  toJSON() {
    return {
      id: this.id,
      parentId: this.parentId,
      rank: this.rank,
      hopCount: this.hopCount,
      status: this.status,
      position: this.position,
      dutyCycle: parseFloat(this.dutyCycle.toFixed(2)),
      batteryLife: this.batteryLife,
      latestReading: this.latestReading(),
    };
  }
}

// ─── Sink Node (DODAG root, Border Router) ────────────────────────────────────

class SinkNode {
  constructor() {
    this.id = 'SINK';
    this.parentId = null;
    this.rank = 0;
    this.hopCount = 0;
    this.status = 'online';
    // Sink placed at normalised centre of the grid
    this.position = { x: 0.5, y: 0.5 };
    this.dutyCycle = 100;   // Sink is always active (wired power)
    this.batteryLife = Infinity;
    this.readings = [];
    this.latestReading = () => null;
  }

  toJSON() {
    return {
      id: this.id,
      parentId: null,
      rank: 0,
      hopCount: 0,
      status: 'online',
      position: this.position,
      dutyCycle: 100,
      batteryLife: null,
      latestReading: null,
    };
  }
}

// ─── RPL Topology Manager ─────────────────────────────────────────────────────

class RPLTopology {
  constructor() {
    /** @type {Map<string, SensorNode|SinkNode>} */
    this.nodes = new Map();

    /** Timestamp of last successful re-convergence after a node failure */
    this.lastConvergenceTime = null;

    /** Simulated Packet Delivery Ratio (95–99% baseline, dips on failures) */
    this.pdr = rand(96, 99);

    // Create the fixed Sink node
    const sink = new SinkNode();
    this.nodes.set(sink.id, sink);
  }

  /**
   * Find the best parent for a candidate node.
   *
   * RPL parent selection uses the Objective Function (OF0 in RFC 6552):
   *   bestParent = node with lowest (rank + ETX_to_node)
   * We use a simplified OF where cost = parent.rank + simulateETX(candidate, parent)
   * Only 'online' nodes (or the Sink) are eligible parents.
   */
  selectBestParent(candidateNode) {
    let bestParent = null;
    let bestCost = Infinity;

    for (const [, node] of this.nodes) {
      if (node.id === candidateNode.id) continue;
      if (node.status !== 'online' && node.id !== 'SINK') continue;

      const etx = simulateETX(candidateNode.position, node.position);
      if (etx === Infinity) continue; // Out of radio range

      const cost = node.rank + etx;
      if (cost < bestCost) {
        bestCost = cost;
        bestParent = node;
      }
    }

    return bestParent;
  }

  /**
   * Attach a node to its chosen parent, updating rank and hop count.
   */
  attachToParent(node, parent) {
    node.parentId = parent.id;
    node.rank = parent.rank + 1;
    node.hopCount = parent.hopCount + 1;
    node.status = 'online';
  }

  /**
   * Return all nodes whose parentId matches the given nodeId.
   * These are "orphaned" when the parent fails.
   */
  childrenOf(nodeId) {
    const children = [];
    for (const [, node] of this.nodes) {
      if (node.parentId === nodeId && node.id !== 'SINK') {
        children.push(node);
      }
    }
    return children;
  }

  /**
   * Build a serialisable snapshot of the current DODAG graph.
   * Returns { nodes[], links[] } compatible with react-force-graph-2d.
   */
  buildGraphSnapshot() {
    const nodes = [];
    const links = [];

    for (const [, node] of this.nodes) {
      nodes.push(node.toJSON());
      if (node.parentId) {
        links.push({ source: node.id, target: node.parentId });
      }
    }

    return { nodes, links };
  }

  /**
   * Compute network health statistics.
   */
  healthStats() {
    const onlineNodes = [...this.nodes.values()].filter(
      (n) => n.status === 'online' && n.id !== 'SINK'
    );

    const avgHopCount =
      onlineNodes.length > 0
        ? onlineNodes.reduce((sum, n) => sum + n.hopCount, 0) / onlineNodes.length
        : 0;

    // Slowly drift PDR back toward 98% between events
    this.pdr = clamp(this.pdr + rand(-0.1, 0.2), 93, 99.5);

    return {
      totalNodes: this.nodes.size - 1, // Exclude sink from displayed count
      onlineNodes: onlineNodes.length,
      avgHopCount: parseFloat(avgHopCount.toFixed(2)),
      lastConvergenceTime: this.lastConvergenceTime,
      pdr: parseFloat(this.pdr.toFixed(1)),
    };
  }
}

// ─── SimulationEngine (main export) ──────────────────────────────────────────

class SimulationEngine extends EventEmitter {
  constructor() {
    super();
    this.topology = new RPLTopology();
    this._tickInterval = null;
    this._isRunning = false;
  }

  // ── Initialisation ──────────────────────────────────────────────────────────

  /**
   * Initialise the network with INITIAL_NODE_COUNT sensor nodes.
   * Each node is assigned a position and joins the DODAG immediately
   * (no staged delay at startup — the network is "already running").
   */
  initialise() {
    console.log(`[SimulationEngine] Initialising RPL DODAG with ${INITIAL_NODE_COUNT} sensor nodes...`);

    for (let i = 0; i < INITIAL_NODE_COUNT; i++) {
      const id = nextNodeId();
      // Spread nodes across the normalised 0..1 grid, avoiding the centre
      // (where the Sink is) to create realistic hop distances
      const position = this._randomPosition();
      const node = new SensorNode(id, position);

      // Immediately join for initial topology (no staged delay)
      const parent = this.topology.selectBestParent(node);
      if (parent) {
        this.topology.attachToParent(node, parent);
      } else {
        // Fallback: connect directly to sink (always in range for initial nodes)
        const sink = this.topology.nodes.get('SINK');
        this.topology.attachToParent(node, sink);
      }

      this.topology.nodes.set(id, node);

      // Generate an initial reading so the frontend has data immediately
      node.generateReading();

      console.log(`[SimulationEngine]   ${id} → parent: ${node.parentId}, rank: ${node.rank}`);
    }

    this.topology.lastConvergenceTime = new Date().toISOString();
    console.log('[SimulationEngine] Initial topology formed.');
  }

  /** Generate a random position spread across the grid (not too central) */
  _randomPosition() {
    // Use a simple grid-jitter approach: divide into quadrants then jitter
    // This ensures reasonable spread and avoids all nodes clustering at centre
    const x = rand(0.05, 0.95);
    const y = rand(0.05, 0.95);
    return { x, y };
  }

  // ── Simulation Tick ─────────────────────────────────────────────────────────

  /**
   * Start the simulation loop.
   * Every TICK_INTERVAL_MS:
   *   1. Generate new readings for all online nodes
   *   2. Emit sensor_update for each node
   *   3. Emit health_stats update
   */
  start() {
    if (this._isRunning) return;
    this._isRunning = true;
    this.initialise();

    this._tickInterval = setInterval(() => this._tick(), TICK_INTERVAL_MS);
    console.log(`[SimulationEngine] Simulation loop started (tick every ${TICK_INTERVAL_MS}ms).`);

    // Emit initial topology so frontend has data immediately on connect
    setTimeout(() => {
      this.emit('topology_update', {
        ...this.topology.buildGraphSnapshot(),
        event: 'init',
      });
      this.emit('health_stats', this.topology.healthStats());
    }, 500);
  }

  stop() {
    if (this._tickInterval) clearInterval(this._tickInterval);
    this._isRunning = false;
  }

  _tick() {
    const updates = [];

    for (const [, node] of this.topology.nodes) {
      if (node.id === 'SINK') continue;
      if (node.status !== 'online') continue;

      const reading = node.generateReading();

      updates.push({
        nodeId: node.id,
        rank: node.rank,
        hopCount: node.hopCount,
        parentId: node.parentId,
        ...reading,
      });
    }

    // Emit all sensor readings in one batch
    this.emit('sensor_update', updates);

    // Emit updated health statistics
    this.emit('health_stats', this.topology.healthStats());
  }

  // ── Add Node (RPL Join Sequence) ────────────────────────────────────────────

  /**
   * Simulate a new sensor node joining the RPL DODAG.
   *
   * Mimics real RPL join protocol:
   *   1. Node powers on → broadcasts RS (Router Solicitation)
   *   2. Receives DIO (DODAG Information Object) from neighbours
   *   3. Selects best parent using OF (Objective Function)
   *   4. Sends DAO (Destination Advertisement Object) upward to register route
   *   5. Receives DAO-ACK → fully joined
   *
   * We simulate this with artificial delays and status transitions:
   *   'discovering' (0-1.5s) → 'joining' (1.5-3.5s) → 'online' (3.5+s)
   */
  async addNode() {
    const id = nextNodeId();
    const position = this._randomPosition();
    const node = new SensorNode(id, position);

    this.topology.nodes.set(id, node);

    this.emit('log_event', {
      type: 'join',
      message: `Node ${id} powered on — broadcasting RS, listening for DIO...`,
      nodeId: id,
      timestamp: new Date().toISOString(),
    });

    // Stage 1: discovering — node is listening for DIO beacons
    node.status = 'discovering';
    this.emit('topology_update', {
      ...this.topology.buildGraphSnapshot(),
      event: 'node_discovering',
      nodeId: id,
    });

    await delay(rand(1000, 1800));

    // Stage 2: joining — node has received a DIO and is sending DAO
    node.status = 'joining';
    const bestParent = this.topology.selectBestParent(node);
    if (bestParent) {
      node.parentId = bestParent.id; // Tentative parent (DAO not yet ACK'd)
      node.rank = bestParent.rank + 1;
      node.hopCount = bestParent.hopCount + 1;
    }

    this.emit('log_event', {
      type: 'join',
      message: `Node ${id} received DIO from ${bestParent ? bestParent.id : 'SINK'} — sending DAO (joining via rank ${node.rank})...`,
      nodeId: id,
      timestamp: new Date().toISOString(),
    });

    this.emit('topology_update', {
      ...this.topology.buildGraphSnapshot(),
      event: 'node_joining',
      nodeId: id,
    });

    await delay(rand(1200, 2000));

    // Stage 3: joined — DAO-ACK received, node is fully online
    if (bestParent) {
      this.topology.attachToParent(node, bestParent);
    } else {
      // Fallback to sink if no neighbours in range
      const sink = this.topology.nodes.get('SINK');
      this.topology.attachToParent(node, sink);
    }

    // Generate first reading
    node.generateReading();

    this.topology.lastConvergenceTime = new Date().toISOString();
    this.topology.pdr = clamp(this.topology.pdr - 0.5, 93, 99.5);

    this.emit('log_event', {
      type: 'join',
      message: `Node ${id} joined DODAG — parent: ${node.parentId}, rank: ${node.rank}, hop count: ${node.hopCount}. DAO-ACK received.`,
      nodeId: id,
      timestamp: new Date().toISOString(),
    });

    this.emit('topology_update', {
      ...this.topology.buildGraphSnapshot(),
      event: 'node_joined',
      nodeId: id,
    });

    this.emit('health_stats', this.topology.healthStats());

    return node.toJSON();
  }

  // ── Kill Node (Failure + Re-parenting) ──────────────────────────────────────

  /**
   * Simulate a node failure and subsequent RPL re-convergence.
   *
   * Mimics real RPL failure detection + recovery:
   *   1. Node stops responding (DAO-ACK timeout or neighbour table expiry)
   *   2. Children detect loss via DIO timeout (Trickle timer expires)
   *   3. Each orphaned child runs OF again on remaining neighbours
   *   4. Children select new parents and send DAO upward
   *   5. Network reconverges
   *
   * We simulate the recovery delay (2–6 seconds) and emit log events per child.
   */
  async killNode(nodeId) {
    const node = this.topology.nodes.get(nodeId);
    if (!node || node.id === 'SINK') {
      console.warn(`[SimulationEngine] killNode: invalid node ${nodeId}`);
      return;
    }

    const recoveryStartMs = Date.now();

    // Mark the node offline immediately
    node.status = 'offline';
    node.parentId = null;

    this.emit('log_event', {
      type: 'failure',
      message: `Node ${nodeId} is UNREACHABLE — failure detected. Initiating RPL re-convergence...`,
      nodeId,
      timestamp: new Date().toISOString(),
    });

    this.emit('topology_update', {
      ...this.topology.buildGraphSnapshot(),
      event: 'node_killed',
      nodeId,
    });

    // Dip PDR on failure
    this.topology.pdr = clamp(this.topology.pdr - rand(2, 5), 85, 99.5);

    // Find orphaned children (nodes whose parent was the killed node)
    const orphans = this.topology.childrenOf(nodeId);

    if (orphans.length === 0) {
      this.emit('log_event', {
        type: 'recovery',
        message: `Node ${nodeId} had no children — no re-parenting required.`,
        nodeId,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Re-parent each orphan after a simulated recovery delay
      for (const orphan of orphans) {
        // Simulate DIO timeout detection delay (2–6 seconds)
        const recoveryDelaySec = parseFloat(rand(2, 6).toFixed(1));
        await delay(recoveryDelaySec * 1000);

        // Temporarily mark orphan as re-joining
        orphan.status = 'joining';
        this.emit('topology_update', {
          ...this.topology.buildGraphSnapshot(),
          event: 'node_reparenting',
          nodeId: orphan.id,
        });

        // Run OF on remaining online nodes
        const newParent = this.topology.selectBestParent(orphan);
        const sink = this.topology.nodes.get('SINK');
        const chosen = newParent || sink;

        this.topology.attachToParent(orphan, chosen);

        this.emit('log_event', {
          type: 'recovery',
          message: `Node ${nodeId} unreachable — Node ${orphan.id} re-parenting via Node ${chosen.id} (recovery time: ${recoveryDelaySec}s)`,
          nodeId: orphan.id,
          timestamp: new Date().toISOString(),
        });

        this.emit('topology_update', {
          ...this.topology.buildGraphSnapshot(),
          event: 'node_reparented',
          nodeId: orphan.id,
        });
      }
    }

    const totalRecoveryMs = Date.now() - recoveryStartMs;
    this.topology.lastConvergenceTime = new Date().toISOString();
    this.topology.pdr = clamp(this.topology.pdr + rand(1, 3), 93, 99.5);

    this.emit('log_event', {
      type: 'recovery',
      message: `RPL network reconverged after ${(totalRecoveryMs / 1000).toFixed(1)}s. All orphans re-parented.`,
      nodeId,
      timestamp: new Date().toISOString(),
    });

    this.emit('health_stats', this.topology.healthStats());
  }

  // ── Accessors ───────────────────────────────────────────────────────────────

  getNode(nodeId) {
    return this.topology.nodes.get(nodeId);
  }

  getAllNodes() {
    return [...this.topology.nodes.values()].map((n) => n.toJSON());
  }

  getTopologySnapshot() {
    return this.topology.buildGraphSnapshot();
  }

  getHealthStats() {
    return this.topology.healthStats();
  }

  getNodeReadings(nodeId) {
    const node = this.topology.nodes.get(nodeId);
    return node ? node.readings : [];
  }
}

// ── Utility: promise-based delay ─────────────────────────────────────────────

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { SimulationEngine, TEMP_ALERT_THRESHOLD, GAS_ALERT_THRESHOLD };
