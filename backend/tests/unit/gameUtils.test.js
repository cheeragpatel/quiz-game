/**
 * Unit tests for game utility functions
 */
import { jest, describe, beforeEach, test, expect } from '@jest/globals';

// Mock GameState BEFORE importing gameUtils
jest.mock('../../models/GameState.js', () => {
  // Create a factory function that returns a mock instance
  const mockGameStateFactory = (instanceId) => ({
    instanceId: instanceId || 'default-instance',
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
      instanceId: instanceId || 'default-instance',
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
  });
  
  // Create the mock constructor function
  const MockGameState = jest.fn().mockImplementation(mockGameStateFactory);
  
  return {
    __esModule: true,
    default: MockGameState
  };
});

// Import gameUtils AFTER setting up the mock
import { 
  getGameStateForInstance, 
  getWinnersForState, 
  manageGameInstances,
  handleRoundCompleteForInstance,
  getGameInstances 
} from '../../utils/gameUtils.js';

// Now import the mocked GameState to use in tests
import GameState from '../../models/GameState.js';

jest.mock('../../redis/redisClient.js', () => {
  return {
    redisClient: {
      isOpen: true,
      sMembers: jest.fn().mockResolvedValue(['game-instance-1625097600000-abc123', 'game-instance-1625097700000-def456']),
      sRem: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockResolvedValue(1),
      get: jest.fn().mockImplementation((key) => {
        if (key === 'gameState:game-instance-1625097600000-abc123') {
          return Promise.resolve(JSON.stringify({
            instanceId: 'game-instance-1625097600000-abc123',
            gameStarted: true,
            gameTopics: ['JavaScript'],
            playerScores: { 'player1': 2, 'player2': 1 },
            registeredPlayers: [
              { githubHandle: 'player1' },
              { githubHandle: 'player2' }
            ],
            totalQuestions: 5,
            currentQuestionIndex: 2
          }));
        }
        return Promise.resolve(null);
      })
    }
  };
});

jest.mock('../../virtualHost.js', () => {
  return {
    generateHostQuip: jest.fn().mockResolvedValue('Mock quip')
  };
});

// Mock Socket.IO
const mockIO = {
  to: jest.fn().mockReturnValue({
    emit: jest.fn()
  }),
  sockets: {
    adapter: {
      rooms: new Map([
        ['game-instance-1625097600000-abc123', new Set(['socket1', 'socket2'])]
      ])
    }
  }
};

describe('Game Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('getGameStateForInstance', () => {
    test('should return default game state when no instance ID is provided', async () => {
      const defaultGameState = { instanceId: 'default-instance' };
      const result = await getGameStateForInstance(null, defaultGameState);
      
      expect(result).toBe(defaultGameState);
    });
    
    test('should create and load a new game state when instance ID is provided', async () => {
      const result = await getGameStateForInstance('test-instance');
      
      expect(GameState).toHaveBeenCalledWith('test-instance');
      expect(result.loadState).toHaveBeenCalled();
    });
    
    test('should reset the game state if loading fails', async () => {
      const mockInstanceState = {
        instanceId: 'test-instance',
        loadState: jest.fn().mockRejectedValueOnce(new Error('Load failed')),
        reset: jest.fn()
      };
      
      GameState.mockImplementationOnce(() => mockInstanceState);
      
      const result = await getGameStateForInstance('test-instance');
      
      expect(result.reset).toHaveBeenCalled();
    });
  });
  
  describe('getWinnersForState', () => {
    test('should return an empty array if no player scores exist', () => {
      const state = { playerScores: {} };
      const winners = getWinnersForState(state);
      
      expect(winners).toEqual([]);
    });
    
    test('should return players with highest score', () => {
      const state = {
        playerScores: {
          'player1': 10,
          'player2': 5,
          'player3': 10
        }
      };
      const winners = getWinnersForState(state);
      
      expect(winners).toEqual(['player1', 'player3']);
    });
    
    test('should return all players if they all have the same score', () => {
      const state = {
        playerScores: {
          'player1': 5,
          'player2': 5,
          'player3': 5
        }
      };
      const winners = getWinnersForState(state);
      
      expect(winners).toEqual(['player1', 'player2', 'player3']);
    });
  });
  
  describe('manageGameInstances', () => {
    test('should clean up old game instances', async () => {
      const { redisClient } = await import('../../redis/redisClient.js');
      
      // Mock Date.now to return a fixed timestamp
      const originalNow = Date.now;
      Date.now = jest.fn().mockReturnValue(1625184000000); // 10 hours after the first instance
      
      await manageGameInstances();
      
      expect(redisClient.sMembers).toHaveBeenCalledWith('activeGameInstances');
      // Check if clean up was done for old instances
      expect(redisClient.del).toHaveBeenCalledWith('gameState:game-instance-1625097600000-abc123');
      expect(redisClient.sRem).toHaveBeenCalledWith('activeGameInstances', 'game-instance-1625097600000-abc123');
      
      // Restore original Date.now
      Date.now = originalNow;
    });
  });
  
  describe('handleRoundCompleteForInstance', () => {
    test('should emit roundComplete event with correct data', async () => {
      const { generateHostQuip } = await import('../../virtualHost.js');
      
      const instanceState = {
        instanceId: 'test-instance',
        currentQuestion: {
          question: 'What is 1+1?',
          correctAnswer: '2'
        },
        playerAnswers: {
          'player1': '2',
          'player2': '3'
        },
        playerScores: {
          'player1': 1,
          'player2': 0
        },
        persistState: jest.fn().mockResolvedValue()
      };
      
      await handleRoundCompleteForInstance(instanceState, mockIO);
      
      expect(generateHostQuip).toHaveBeenCalledWith(
        'What is 1+1?',
        ['player1']
      );
      
      expect(mockIO.to).toHaveBeenCalledWith('test-instance');
      expect(mockIO.to().emit).toHaveBeenCalledWith(
        'roundComplete',
        expect.objectContaining({
          correctAnswer: '2',
          winners: ['player1'],
          scores: { 'player1': 1, 'player2': 0 },
          quip: 'Mock quip',
          instanceId: 'test-instance'
        })
      );
      
      expect(instanceState.persistState).toHaveBeenCalled();
    });
  });
  
  describe('getGameInstances', () => {
    test('should return list of valid game instances', async () => {
      const { redisClient } = await import('../../redis/redisClient.js');
      
      const instances = await getGameInstances(mockIO);
      
      expect(redisClient.sMembers).toHaveBeenCalledWith('activeGameInstances');
      expect(redisClient.get).toHaveBeenCalled();
      
      expect(instances).toHaveLength(1);
      expect(instances[0]).toEqual(
        expect.objectContaining({
          instanceId: 'game-instance-1625097600000-abc123',
          valid: true,
          gameStarted: true,
          playersCount: 2,
          connectedPlayers: 2,
          currentQuestion: 3,
          totalQuestions: 5,
          topic: 'JavaScript'
        })
      );
    });
  });
});