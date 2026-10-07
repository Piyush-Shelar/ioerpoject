/**
 * alertEngine.js
 * ==============
 * Threshold detection and predictive alerting for the sensor network.
 *
 * Two responsibilities:
 *   1. Immediate alerts  — emitted whenever a reading crosses a hard threshold
 *      (temp > 30°C or gas > 250 ppm).
 *
 *   2. Predictive alerts — using simple linear regression on the last N readings
 *      per node, compute the rate of change (slope) and project forward to
 *      estimate time-to-threshold. If the projection crosses the threshold
 *      within PREDICTIVE_WINDOW_MINUTES, emit a predictive_alert warning.
 *
 * Linear regression formula (Ordinary Least Squares for slope):
 *   slope = (n·Σxy − Σx·Σy) / (n·Σx² − (Σx)²)
 *   where x = reading index (0,1,2,...), y = metric value
 *
 * This is intentionally kept as plain maths (no ML libraries) so the
 * algorithm can be explained in a viva without any black-box dependencies.
 */

'use strict';

const { TEMP_ALERT_THRESHOLD, GAS_ALERT_THRESHOLD } = require('./SimulationEngine');

const PREDICTIVE_WINDOW_MINUTES = 15;   // Warn if threshold will be crossed within 15 min
const MIN_READINGS_FOR_PREDICTION = 5;  // Need at least 5 readings for a meaningful slope
const TICK_INTERVAL_SEC = 5;            // Seconds between readings (matches SimulationEngine)

/**
 * Compute OLS linear regression slope for an array of y-values.
 * x values are implicitly 0, 1, 2, ... (reading indices).
 *
 * @param {number[]} values - Array of metric values (oldest first)
 * @returns {number} slope in units/reading
 */
function computeSlope(values) {
  const n = values.length;
  if (n < 2) return 0;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;

  return (n * sumXY - sumX * sumY) / denom;
}

/**
 * Analyse readings for a single node and emit alerts as needed.
 *
 * @param {object} node         - SensorNode instance (from topology.nodes)
 * @param {Function} emitAlert  - Callback to emit an 'alert' event
 * @param {Function} emitPred   - Callback to emit a 'predictive_alert' event
 * @param {Set} activeAlerts    - Set of currently active alert keys (prevents spam)
 */
function analyseNode(node, emitAlert, emitPredictive, activeAlerts) {
  if (node.id === 'SINK' || node.status !== 'online') return;
  if (node.readings.length === 0) return;

  const latest = node.readings[node.readings.length - 1];
  const alertKey = (metric, nId) => `${metric}:${nId}`;

  // ── Immediate threshold alerts ──────────────────────────────────────────────

  if (latest.temperature > TEMP_ALERT_THRESHOLD) {
    const key = alertKey('temp', node.id);
    if (!activeAlerts.has(key)) {
      activeAlerts.add(key);
      emitAlert({
        nodeId: node.id,
        type: 'temp',
        value: latest.temperature,
        threshold: TEMP_ALERT_THRESHOLD,
        timestamp: new Date().toISOString(),
        message: `🔥 Node ${node.id}: Temperature ${latest.temperature.toFixed(1)}°C exceeds ${TEMP_ALERT_THRESHOLD}°C threshold`,
      });
    }
  } else {
    activeAlerts.delete(alertKey('temp', node.id));
  }

  if (latest.gas > GAS_ALERT_THRESHOLD) {
    const key = alertKey('gas', node.id);
    if (!activeAlerts.has(key)) {
      activeAlerts.add(key);
      emitAlert({
        nodeId: node.id,
        type: 'gas',
        value: latest.gas,
        threshold: GAS_ALERT_THRESHOLD,
        timestamp: new Date().toISOString(),
        message: `💨 Node ${node.id}: Gas/Smoke ${latest.gas.toFixed(1)} ppm exceeds ${GAS_ALERT_THRESHOLD} ppm threshold`,
      });
    }
  } else {
    activeAlerts.delete(alertKey('gas', node.id));
  }

  // ── Predictive alerts (linear regression) ──────────────────────────────────

  if (node.readings.length < MIN_READINGS_FOR_PREDICTION) return;

  const recentReadings = node.readings.slice(-10); // Last 10 readings

  // Temperature trend
  const tempValues = recentReadings.map((r) => r.temperature);
  const tempSlope = computeSlope(tempValues);   // °C per reading
  const tempSlopePerMin = tempSlope * (60 / TICK_INTERVAL_SEC); // °C per minute
  const currentTemp = latest.temperature;

  if (tempSlope > 0 && currentTemp < TEMP_ALERT_THRESHOLD) {
    const readingsToThreshold = (TEMP_ALERT_THRESHOLD - currentTemp) / tempSlope;
    const minutesToThreshold = (readingsToThreshold * TICK_INTERVAL_SEC) / 60;

    if (minutesToThreshold <= PREDICTIVE_WINDOW_MINUTES) {
      emitPredictive({
        nodeId: node.id,
        metric: 'temperature',
        currentValue: parseFloat(currentTemp.toFixed(2)),
        threshold: TEMP_ALERT_THRESHOLD,
        ratePerMin: parseFloat(tempSlopePerMin.toFixed(3)),
        projectedMinutes: parseFloat(minutesToThreshold.toFixed(1)),
        timestamp: new Date().toISOString(),
        message: `⚠️ Node ${node.id} temperature rising ${Math.abs(tempSlopePerMin).toFixed(2)}°C/min — projected to cross ${TEMP_ALERT_THRESHOLD}°C in ~${minutesToThreshold.toFixed(1)} min`,
      });
    }
  }

  // Gas/smoke trend
  const gasValues = recentReadings.map((r) => r.gas);
  const gasSlope = computeSlope(gasValues);     // ppm per reading
  const gasSlopePerMin = gasSlope * (60 / TICK_INTERVAL_SEC);
  const currentGas = latest.gas;

  if (gasSlope > 0 && currentGas < GAS_ALERT_THRESHOLD) {
    const readingsToThreshold = (GAS_ALERT_THRESHOLD - currentGas) / gasSlope;
    const minutesToThreshold = (readingsToThreshold * TICK_INTERVAL_SEC) / 60;

    if (minutesToThreshold <= PREDICTIVE_WINDOW_MINUTES) {
      emitPredictive({
        nodeId: node.id,
        metric: 'gas',
        currentValue: parseFloat(currentGas.toFixed(1)),
        threshold: GAS_ALERT_THRESHOLD,
        ratePerMin: parseFloat(gasSlopePerMin.toFixed(2)),
        projectedMinutes: parseFloat(minutesToThreshold.toFixed(1)),
        timestamp: new Date().toISOString(),
        message: `⚠️ Node ${node.id} gas level rising ${Math.abs(gasSlopePerMin).toFixed(1)} ppm/min — projected to cross ${GAS_ALERT_THRESHOLD} ppm in ~${minutesToThreshold.toFixed(1)} min`,
      });
    }
  }
}

/**
 * AlertEngine class — wired to the SimulationEngine's sensor_update event.
 * Maintains state across ticks (active alert set, to prevent duplicate spam).
 */
class AlertEngine {
  constructor(simulationEngine, emitFn) {
    this.engine = simulationEngine;
    this.emit = emitFn;           // Socket.io broadcast function
    this.activeAlerts = new Set(); // Currently active threshold violations

    // Listen to every sensor tick
    this.engine.on('sensor_update', () => this._analyse());
  }

  _analyse() {
    for (const [, node] of this.engine.topology.nodes) {
      analyseNode(
        node,
        (alert) => this.emit('alert', alert),
        (pred)  => this.emit('predictive_alert', pred),
        this.activeAlerts
      );
    }
  }
}

module.exports = { AlertEngine, computeSlope };
