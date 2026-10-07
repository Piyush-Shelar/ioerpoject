/**
 * socket.js
 * =========
 * Singleton Socket.io client instance.
 * Imported by components that need real-time data — ensures only one
 * WebSocket connection is opened regardless of how many components
 * subscribe to events.
 */

import { io } from 'socket.io-client';

// Backend is running on port 4000 in development.
// In production this would be replaced by the deployed server URL.
const BACKEND_URL = 'http://localhost:4000';

const socket = io(BACKEND_URL, {
  // Auto-reconnect with exponential backoff (Socket.io default behaviour)
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
  console.log('[Socket] Connected to backend:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.warn('[Socket] Disconnected:', reason);
});

socket.on('connect_error', (err) => {
  console.error('[Socket] Connection error:', err.message);
});

export default socket;
