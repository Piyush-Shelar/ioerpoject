/**
 * SimContext.jsx
 * ==============
 * Central React Context & State Management for the simulation dashboard.
 *
 * State includes:
 *   - nodes: Map or dictionary of nodeId -> node data
 *   - graphData: { nodes: [], links: [] } for react-force-graph
 *   - healthStats: { totalNodes, onlineNodes, avgHopCount, lastConvergenceTime, pdr }
 *   - selectedNodeId: string | null (for side drawer)
 *   - alerts: Array of active threshold alerts
 *   - predictiveAlerts: Array of predictive alerts
 *   - logEvents: Array of timestamped system events
 *   - nodeReadingsHistory: dictionary of nodeId -> array of readings
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import socket from '../socket';

const SimContext = createContext();

const MAX_LOG_EVENTS = 100;
const MAX_HISTORICAL_READINGS = 30;

const initialState = {
  nodes: {},
  graphData: { nodes: [], links: [] },
  healthStats: {
    totalNodes: 0,
    onlineNodes: 0,
    avgHopCount: 0,
    lastConvergenceTime: null,
    pdr: 98.0,
  },
  selectedNodeId: null,
  alerts: [],
  predictiveAlerts: [],
  logEvents: [],
  readingsHistory: {}, // { nodeId: [reading1, reading2, ...] }
};

function simReducer(state, action) {
  switch (action.type) {
    case 'SET_TOPOLOGY': {
      const { nodes, links } = action.payload;
      const nodesMap = { ...state.nodes };
      
      // Update nodes dictionary while preserving reading histories
      nodes.forEach((node) => {
        nodesMap[node.id] = {
          ...nodesMap[node.id],
          ...node,
        };
      });

      return {
        ...state,
        nodes: nodesMap,
        graphData: { nodes, links },
      };
    }

    case 'UPDATE_SENSOR_READINGS': {
      const updates = action.payload; // Array of node readings
      const updatedNodes = { ...state.nodes };
      const updatedHistory = { ...state.readingsHistory };

      updates.forEach((reading) => {
        const { nodeId, temperature, humidity, gas, dutyCycle, batteryLife, rank, hopCount, parentId, timestamp } = reading;

        // Update node in dictionary
        if (updatedNodes[nodeId]) {
          updatedNodes[nodeId] = {
            ...updatedNodes[nodeId],
            rank: rank !== undefined ? rank : updatedNodes[nodeId].rank,
            hopCount: hopCount !== undefined ? hopCount : updatedNodes[nodeId].hopCount,
            parentId: parentId !== undefined ? parentId : updatedNodes[nodeId].parentId,
            latestReading: { temperature, humidity, gas, dutyCycle, batteryLife, timestamp },
            dutyCycle,
            batteryLife,
          };
        }

        // Update history for this node
        const currentHist = updatedHistory[nodeId] ? [...updatedHistory[nodeId]] : [];
        currentHist.push({
          timestamp: timestamp || Date.now(),
          temperature,
          humidity,
          gas,
          dutyCycle,
          batteryLife,
        });

        if (currentHist.length > MAX_HISTORICAL_READINGS) {
          currentHist.shift();
        }

        updatedHistory[nodeId] = currentHist;
      });

      return {
        ...state,
        nodes: updatedNodes,
        readingsHistory: updatedHistory,
      };
    }

    case 'SET_HEALTH_STATS': {
      return {
        ...state,
        healthStats: action.payload,
      };
    }

    case 'ADD_ALERT': {
      const newAlert = action.payload;
      // Prevent exact duplicates within short time
      const filtered = state.alerts.filter(
        (a) => !(a.nodeId === newAlert.nodeId && a.type === newAlert.type)
      );
      return {
        ...state,
        alerts: [newAlert, ...filtered].slice(0, 20),
      };
    }

    case 'DISMISS_ALERT': {
      return {
        ...state,
        alerts: state.alerts.filter((a) => a.timestamp !== action.payload),
      };
    }

    case 'ADD_PREDICTIVE_ALERT': {
      const pred = action.payload;
      const filtered = state.predictiveAlerts.filter(
        (a) => !(a.nodeId === pred.nodeId && a.metric === pred.metric)
      );
      return {
        ...state,
        predictiveAlerts: [pred, ...filtered].slice(0, 10),
      };
    }

    case 'ADD_LOG_EVENT': {
      return {
        ...state,
        logEvents: [action.payload, ...state.logEvents].slice(0, MAX_LOG_EVENTS),
      };
    }

    case 'SELECT_NODE': {
      return {
        ...state,
        selectedNodeId: action.payload,
      };
    }

    case 'SET_INITIAL_READINGS': {
      const { nodeId, readings } = action.payload;
      return {
        ...state,
        readingsHistory: {
          ...state.readingsHistory,
          [nodeId]: readings,
        },
      };
    }

    default:
      return state;
  }
}

export function SimProvider({ children }) {
  const [state, dispatch] = useReducer(simReducer, initialState);

  useEffect(() => {
    // Socket listeners
    const handleTopologyUpdate = (data) => {
      dispatch({ type: 'SET_TOPOLOGY', payload: data });
    };

    const handleSensorUpdate = (updates) => {
      dispatch({ type: 'UPDATE_SENSOR_READINGS', payload: updates });
    };

    const handleHealthStats = (stats) => {
      dispatch({ type: 'SET_HEALTH_STATS', payload: stats });
    };

    const handleAlert = (alert) => {
      dispatch({ type: 'ADD_ALERT', payload: alert });
    };

    const handlePredictiveAlert = (pred) => {
      dispatch({ type: 'ADD_PREDICTIVE_ALERT', payload: pred });
    };

    const handleLogEvent = (event) => {
      dispatch({ type: 'ADD_LOG_EVENT', payload: event });
    };

    socket.on('topology_update', handleTopologyUpdate);
    socket.on('sensor_update', handleSensorUpdate);
    socket.on('health_stats', handleHealthStats);
    socket.on('alert', handleAlert);
    socket.on('predictive_alert', handlePredictiveAlert);
    socket.on('log_event', handleLogEvent);

    return () => {
      socket.off('topology_update', handleTopologyUpdate);
      socket.off('sensor_update', handleSensorUpdate);
      socket.off('health_stats', handleHealthStats);
      socket.off('alert', handleAlert);
      socket.off('predictive_alert', handlePredictiveAlert);
      socket.off('log_event', handleLogEvent);
    };
  }, []);

  const selectNode = (nodeId) => {
    dispatch({ type: 'SELECT_NODE', payload: nodeId });
    if (nodeId && !state.readingsHistory[nodeId]) {
      socket.emit('get_node_readings', { nodeId }, (readings) => {
        if (readings) {
          dispatch({
            type: 'SET_INITIAL_READINGS',
            payload: { nodeId, readings },
          });
        }
      });
    }
  };

  const addNode = () => {
    socket.emit('add_node');
  };

  const killNode = (nodeId) => {
    if (nodeId) {
      socket.emit('kill_node', { nodeId });
    }
  };

  const dismissAlert = (timestamp) => {
    dispatch({ type: 'DISMISS_ALERT', payload: timestamp });
  };

  return (
    <SimContext.Provider
      value={{
        ...state,
        selectNode,
        addNode,
        killNode,
        dismissAlert,
      }}
    >
      {children}
    </SimContext.Provider>
  );
}

export function useSim() {
  const context = useContext(SimContext);
  if (!context) {
    throw new Error('useSim must be used within a SimProvider');
  }
  return context;
}
