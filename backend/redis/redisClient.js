/**
 * Redis client setup and management
 */
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { REDIS_CONFIG } from '../config/index.js';

// Create the main Redis client
export const redisClient = createClient(REDIS_CONFIG);

// Redis client event handlers with improved logging
redisClient.on('connect', () => console.log('Main Redis client: connecting...'));
redisClient.on('ready', () => console.log('Main Redis client: connected and ready'));
redisClient.on('error', (err) => console.error('Main Redis client error:', err));
redisClient.on('reconnecting', (params) => console.log('Main Redis client: reconnecting...', params));
redisClient.on('end', () => console.log('Main Redis client: connection closed'));

// Connect the Redis client
export async function connectRedis() {
  try {
    await redisClient.connect();
    console.log('Redis client connected successfully');
    return redisClient;
  } catch (err) {
    console.error('Failed to connect main Redis client:', err);
    throw err;
  }
}

// Create pub/sub clients for Socket.IO Redis adapter
export const pubClient = createClient({
  url: REDIS_CONFIG.url
});

export const subClient = createClient({
  url: REDIS_CONFIG.url
});

// Add event listeners for pub/sub clients
pubClient.on('connect', () => console.log('Redis PUB client: connecting...'));
pubClient.on('ready', () => console.log('Redis PUB client: connected and ready'));
pubClient.on('error', (err) => console.error('Redis PUB client error:', err));

subClient.on('connect', () => console.log('Redis SUB client: connecting...'));
subClient.on('ready', () => console.log('Redis SUB client: connected and ready'));
subClient.on('error', (err) => console.error('Redis SUB client error:', err));

// Setup Socket.IO Redis adapter
export async function setupSocketIORedisAdapter(io) {
  try {
    console.log('Setting up Socket.IO Redis adapter');
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log('Socket.IO Redis adapter setup complete');
  } catch (err) {
    console.error('Failed to setup Redis adapter for Socket.IO:', err);
    throw err;
  }
}

// Function to clear Socket.IO sessions from Redis
export async function clearSocketSessions() {
  try {
    console.log('Clearing old Socket.IO sessions from Redis...');
    
    // Get all keys related to Socket.IO
    const socketKeys = await redisClient.keys('socket.io*');
    
    if (socketKeys && socketKeys.length > 0) {
      console.log(`Found ${socketKeys.length} Socket.IO related keys to clear`);
      // Delete all Socket.IO related keys
      await redisClient.del(socketKeys);
      console.log('Successfully cleared old Socket.IO sessions');
    } else {
      console.log('No Socket.IO sessions found to clear');
    }
  } catch (error) {
    console.error('Error clearing Socket.IO sessions:', error);
    throw error;
  }
}

export default {
  redisClient,
  pubClient,
  subClient,
  connectRedis,
  setupSocketIORedisAdapter,
  clearSocketSessions
};