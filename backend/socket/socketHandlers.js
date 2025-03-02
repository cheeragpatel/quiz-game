/**
 * Socket.IO event handlers for real-time communication
 */
import GameState from '../models/GameState.js';
import { socketErrorHandler, ValidationError } from '../utils/errorHandler.js';

/**
 * Set up Socket.IO event handlers
 * 
 * @param {Object} io - The Socket.IO server instance
 * @param {GameState} defaultGameState - The default game state
 */
export function setupSocketHandlers(io, defaultGameState) {
  io.on('connection', (socket) => {
    try {
      console.log(`Socket connected: ${socket.id}`);
      
      // Store the instance ID in the socket for future reference
      socket.gameInstanceId = socket.handshake.query.instanceId || defaultGameState.instanceId;
      console.log(`Socket ${socket.id} associated with game instance: ${socket.gameInstanceId}`);
      
      // Join the socket to a room specific to this game instance
      socket.join(socket.gameInstanceId);
      console.log(`Socket ${socket.id} joined room for game instance: ${socket.gameInstanceId}`);
      
      // Track this connection in our active connections set
      if (socket.gameInstanceId === defaultGameState.instanceId) {
        defaultGameState.activeConnections.add(socket.id);
      }
      
      // Emit player count to everyone
      io.emit('playerCount', io.engine.clientsCount);
      
      // Emit instance-specific player count
      const roomSockets = io.sockets.adapter.rooms.get(socket.gameInstanceId);
      const instancePlayerCount = roomSockets ? roomSockets.size : 0;
      io.to(socket.gameInstanceId).emit('instancePlayerCount', {
        count: instancePlayerCount,
        instanceId: socket.gameInstanceId
      });

      // Inform the client about the game instance ID they're connected to
      socket.emit('gameInstanceInfo', { 
        instanceId: socket.gameInstanceId,
        timestamp: new Date().toISOString()
      });

      socket.on('error', (error) => socketErrorHandler(socket, error));
      
      socket.on('disconnect', (reason) => {
        console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`);
        
        // Remove from default game state's active connections if applicable
        if (socket.gameInstanceId === defaultGameState.instanceId) {
          defaultGameState.activeConnections.delete(socket.id);
        }
        
        // Emit updated player counts
        io.emit('playerCount', io.engine.clientsCount);
        
        const roomSockets = io.sockets.adapter.rooms.get(socket.gameInstanceId);
        const instancePlayerCount = roomSockets ? roomSockets.size : 0;
        io.to(socket.gameInstanceId).emit('instancePlayerCount', {
          count: instancePlayerCount,
          instanceId: socket.gameInstanceId
        });
      });

      socket.on('reconnectStateRequest', async () => {
        try {
          // If this is a reconnection, use the instance ID from the request if provided
          const requestedInstanceId = socket.handshake.query.instanceId;
          if (requestedInstanceId) {
            // Create a temporary game state object to load the requested instance
            const tempState = new GameState(requestedInstanceId);
            await tempState.loadState();
            
            // Send this specific state back to the client
            socket.emit('reconnectState', tempState.saveState());
            console.log(`Sent reconnection state for instance ${requestedInstanceId} to socket ${socket.id}`);
          } else {
            // Use the default game state if no specific instance was requested
            await defaultGameState.loadState();
            socket.emit('reconnectState', defaultGameState.saveState());
            console.log(`Sent default reconnection state to socket ${socket.id}`);
          }
        } catch (error) {
          socketErrorHandler(socket, error);
        }
      });
      
      // Allow socket to explicitly join a specific game instance
      socket.on('joinGameInstance', async (data) => {
        try {
          if (!data || !data.instanceId) {
            throw new ValidationError('No instance ID provided');
          }
          
          // Leave current instance room
          if (socket.gameInstanceId) {
            socket.leave(socket.gameInstanceId);
            
            // Remove from default game state connections if needed
            if (socket.gameInstanceId === defaultGameState.instanceId) {
              defaultGameState.activeConnections.delete(socket.id);
            }
          }
          
          // Join new instance room
          socket.gameInstanceId = data.instanceId;
          socket.join(data.instanceId);
          
          console.log(`Socket ${socket.id} switched to game instance: ${data.instanceId}`);
          
          // Add to default game state connections if needed
          if (data.instanceId === defaultGameState.instanceId) {
            defaultGameState.activeConnections.add(socket.id);
          }
          
          // Load and send the state for this instance
          const tempState = new GameState(data.instanceId);
          await tempState.loadState();
          socket.emit('reconnectState', tempState.saveState());
          
          // Update instance-specific player count
          const roomSockets = io.sockets.adapter.rooms.get(socket.gameInstanceId);
          const instancePlayerCount = roomSockets ? roomSockets.size : 0;
          io.to(socket.gameInstanceId).emit('instancePlayerCount', {
            count: instancePlayerCount,
            instanceId: socket.gameInstanceId
          });
        } catch (error) {
          socketErrorHandler(socket, error);
        }
      });
    } catch (error) {
      socketErrorHandler(socket, error);
    }
  });
}

export default setupSocketHandlers;