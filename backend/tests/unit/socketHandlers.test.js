/**
 * Unit tests for Socket.IO event handlers
 */
import { jest, describe, beforeEach, beforeAll, afterAll, test, expect } from '@jest/globals';

// Mock GameState BEFORE importing the socketHandlers
jest.mock('../../models/GameState.js', () => {
  // Create the mock constructor function first
  const MockGameState = jest.fn().mockImplementation((instanceId) => {
    return {
      instanceId: instanceId || 'test-instance-id',
      gameStarted: false,
      gameTopics: [],
      currentQuestionIndex: 0,
      questionsList: [],
      currentQuestion: null,
      playerAnswers: {},
      registeredPlayers: [],
      playerScores: {},
      totalQuestions: 10,
      activeConnections: new Set(),
      reset: jest.fn(),
      loadState: jest.fn().mockResolvedValue(),
      persistState: jest.fn().mockResolvedValue(),
      saveState: jest.fn().mockReturnValue({
        instanceId: instanceId || 'test-instance-id',
        gameStarted: false,
        gameTopics: [],
        currentQuestionIndex: 0,
        questionsList: [],
        currentQuestion: null,
        playerAnswers: {},
        registeredPlayers: [],
        playerScores: {},
        totalQuestions: 10
      })
    };
  });
  
  return {
    __esModule: true,
    default: MockGameState
  };
});

// Mock redis client to prevent connection issues
jest.mock('../../redis/redisClient.js', () => {
  return {
    redisClient: {
      isOpen: true,
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      sAdd: jest.fn().mockResolvedValue(1),
      sMembers: jest.fn().mockResolvedValue([]),
      sRem: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockResolvedValue(1)
    },
    connectRedis: jest.fn().mockResolvedValue({}),
    setupSocketIORedisAdapter: jest.fn().mockResolvedValue({})
  };
});

// Now import the modules that use GameState
import { setupSocketHandlers } from '../../socket/socketHandlers.js';
import { Server } from 'socket.io';
import { createServer } from 'http';
import Client from 'socket.io-client';

// Import the mocked GameState to use in tests
import GameState from '../../models/GameState.js';

describe('Socket.IO Handlers', () => {
  let io;
  let serverSocket;
  let clientSocket;
  let httpServer;
  let defaultGameState;
  let port;
  
  beforeAll((done) => {
    // Increase the timeout for slower machines/CI environments
    jest.setTimeout(10000);
    
    httpServer = createServer();
    io = new Server(httpServer);
    defaultGameState = new GameState('default-instance');
    setupSocketHandlers(io, defaultGameState);
    
    // Use a different port for tests
    port = 3200;
    httpServer.listen(port, () => {
      clientSocket = Client(`http://localhost:${port}`, {
        query: { instanceId: 'test-client-instance' },
        forceNew: true,
        reconnectionDelay: 0,
        timeout: 1000
      });
      
      clientSocket.on('connect', () => {
        // Small delay to ensure connection is complete
        setTimeout(done, 100);
      });
      
      clientSocket.on('connect_error', (err) => {
        console.error('Connection error in beforeAll:', err);
      });
    });
  });
  
  afterAll((done) => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
    
    io.close(() => {
      httpServer.close(() => {
        done();
      });
    });
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('socket should join the specified room on connection', (done) => {
    const newClient = Client(`http://localhost:${port}`, {
      query: { instanceId: 'test-client-instance' },
      forceNew: true
    });
    
    newClient.on('connect', () => {
      // Give the server a moment to process the connection
      setTimeout(() => {
        const rooms = Array.from(io.sockets.adapter.rooms.keys());
        expect(rooms).toContain(newClient.id);
        expect(rooms).toContain('test-client-instance');
        newClient.disconnect();
        done();
      }, 100);
    });
  });
  
  test('client should receive gameInstanceInfo event', (done) => {
    const newClient = Client(`http://localhost:${port}`, {
      query: { instanceId: 'test-info-instance' },
      forceNew: true
    });
    
    newClient.on('gameInstanceInfo', (data) => {
      try {
        expect(data).toBeDefined();
        expect(data.instanceId).toBe('test-info-instance');
        expect(data.timestamp).toBeDefined();
        newClient.disconnect();
        done();
      } catch (error) {
        newClient.disconnect();
        done(error);
      }
    });
  });
  
  test('socket should handle reconnectStateRequest event', (done) => {
    // Define mock implementation for saveState
    GameState.mockImplementation((instanceId) => ({
      instanceId: instanceId || 'mock-instance',
      gameStarted: false,
      gameTopics: [],
      currentQuestionIndex: 0,
      questionsList: [],
      currentQuestion: null,
      playerAnswers: {},
      registeredPlayers: [],
      playerScores: {},
      totalQuestions: 10,
      activeConnections: new Set(),
      reset: jest.fn(),
      loadState: jest.fn().mockResolvedValue(),
      persistState: jest.fn().mockResolvedValue(),
      saveState: jest.fn().mockReturnValue({
        instanceId: instanceId,
        gameStarted: false,
        currentQuestionIndex: 0
      })
    }));
    
    const testClient = Client(`http://localhost:${port}`, {
      query: { instanceId: 'test-reconnect-instance' },
      forceNew: true
    });
    
    testClient.on('connect', () => {
      testClient.emit('reconnectStateRequest');
    });
    
    testClient.on('reconnectState', (data) => {
      try {
        expect(data).toBeDefined();
        expect(data.instanceId).toBe('test-reconnect-instance');
        testClient.disconnect();
        done();
      } catch (error) {
        testClient.disconnect();
        done(error);
      }
    });
  });
  
  test('socket should handle joinGameInstance event', (done) => {
    const newInstanceId = 'new-instance-id';
    
    // Define mock implementation for saveState
    GameState.mockImplementation((instanceId) => ({
      instanceId: instanceId,
      gameStarted: false,
      gameTopics: [],
      currentQuestionIndex: 0,
      playerScores: {},
      activeConnections: new Set(),
      reset: jest.fn(),
      loadState: jest.fn().mockResolvedValue(),
      persistState: jest.fn().mockResolvedValue(),
      saveState: jest.fn().mockReturnValue({
        instanceId: instanceId,
        gameStarted: false,
        currentQuestionIndex: 0
      })
    }));
    
    const testClient = Client(`http://localhost:${port}`, {
      query: { instanceId: 'original-instance' },
      forceNew: true
    });
    
    testClient.on('connect', () => {
      // Small delay to ensure connection is properly established
      setTimeout(() => {
        testClient.emit('joinGameInstance', { instanceId: newInstanceId });
      }, 100);
    });
    
    // Listen for the reconnect state after joining new instance
    testClient.on('reconnectState', (data) => {
      try {
        expect(data).toBeDefined();
        expect(data.instanceId).toBe(newInstanceId);
        expect(GameState).toHaveBeenCalledWith(newInstanceId);
        
        // Now wait for instance player count event
        testClient.once('instancePlayerCount', (countData) => {
          try {
            expect(countData).toHaveProperty('instanceId', newInstanceId);
            expect(countData).toHaveProperty('count');
            testClient.disconnect();
            done();
          } catch (error) {
            testClient.disconnect();
            done(error);
          }
        });
      } catch (error) {
        testClient.disconnect();
        done(error);
      }
    });
    
    testClient.on('connect_error', (error) => {
      console.error('Connection error in joinGameInstance test:', error);
      done(error);
    });
  });
  
  test('socket should handle disconnect event', (done) => {
    // Create a test client
    const testClient = Client(`http://localhost:${port}`, {
      query: { instanceId: 'disconnect-test-instance' },
      forceNew: true
    });
    
    testClient.on('connect', () => {
      // Add the client's ID to the default game state's active connections
      defaultGameState.activeConnections.add(testClient.id);
      
      // Setup spy for the to() method
      const emitSpy = jest.spyOn(io, 'to').mockImplementation(() => ({
        emit: jest.fn()
      }));
      
      // Disconnect the client
      testClient.disconnect();
      
      // Give time for disconnect event to be processed
      setTimeout(() => {
        try {
          // Check active connections no longer contains the socket ID
          expect(defaultGameState.activeConnections.has(testClient.id)).toBe(false);
          
          // Check emit was called
          expect(emitSpy).toHaveBeenCalled();
          
          emitSpy.mockRestore();
          done();
        } catch (error) {
          done(error);
        }
      }, 100);
    });
  });
});