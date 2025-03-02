/**
 * Unit tests for GameState model
 */
import { jest, describe, beforeEach, test, expect } from '@jest/globals';
import GameState from '../../models/GameState.js';

// Mock Redis client
jest.mock('../../redis/redisClient.js', () => {
  return {
    redisClient: {
      isOpen: true,
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockImplementation((key) => {
        if (key === 'gameState:test-instance') {
          return Promise.resolve(JSON.stringify({
            instanceId: 'test-instance',
            gameStarted: true,
            gameTopics: ['JavaScript'],
            currentQuestionIndex: 2,
            questionsList: [
              { id: 1, question: 'Q1', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A' },
              { id: 2, question: 'Q2', options: ['A', 'B', 'C', 'D'], correctAnswer: 'B' },
              { id: 3, question: 'Q3', options: ['A', 'B', 'C', 'D'], correctAnswer: 'C' }
            ],
            currentQuestion: { 
              id: 3, 
              question: 'Q3', 
              options: ['A', 'B', 'C', 'D'], 
              correctAnswer: 'C' 
            },
            playerAnswers: { 'player1': 'C', 'player2': 'D' },
            registeredPlayers: [
              { githubHandle: 'player1', joinedAt: '2023-01-01T00:00:00.000Z' },
              { githubHandle: 'player2', joinedAt: '2023-01-01T00:00:00.000Z' }
            ],
            playerScores: { 'player1': 2, 'player2': 1 },
            totalQuestions: 3
          }));
        }
        return Promise.resolve(null);
      }),
      sAdd: jest.fn().mockResolvedValue(1)
    }
  };
});

describe('GameState Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('constructor should initialize with default values', () => {
    const gameState = new GameState();
    
    expect(gameState.instanceId).toBeDefined();
    expect(gameState.gameStarted).toBe(false);
    expect(gameState.gameTopics).toEqual([]);
    expect(gameState.currentQuestionIndex).toBe(0);
    expect(gameState.questionsList).toEqual([]);
    expect(gameState.currentQuestion).toBeNull();
    expect(gameState.playerAnswers).toEqual({});
    expect(gameState.registeredPlayers).toEqual([]);
    expect(gameState.playerScores).toEqual({});
    expect(gameState.totalQuestions).toBe(10);
  });

  test('constructor should initialize with specified instanceId', () => {
    const instanceId = 'test-instance';
    const gameState = new GameState(instanceId);
    
    expect(gameState.instanceId).toBe(instanceId);
  });

  test('reset should clear all game state properties', () => {
    const gameState = new GameState();
    
    // Setup with some data
    gameState.gameStarted = true;
    gameState.gameTopics = ['JavaScript'];
    gameState.playerScores = { player1: 10 };
    gameState.registeredPlayers = [{ githubHandle: 'player1', joinedAt: new Date() }];
    
    // Reset
    gameState.reset();
    
    expect(gameState.gameStarted).toBe(false);
    expect(gameState.gameTopics).toEqual([]);
    expect(gameState.currentQuestionIndex).toBe(0);
    expect(gameState.questionsList).toEqual([]);
    expect(gameState.currentQuestion).toBeNull();
    expect(gameState.playerAnswers).toEqual({});
    expect(gameState.registeredPlayers).toEqual([]);
    expect(gameState.playerScores).toEqual({});
  });

  test('saveState should return the state object', () => {
    const gameState = new GameState('test-instance');
    gameState.gameStarted = true;
    gameState.gameTopics = ['JavaScript'];
    gameState.playerScores = { player1: 10 };
    
    const state = gameState.saveState();
    
    // Check the specific properties we care about
    expect(state.instanceId).toBe('test-instance');
    expect(state.gameStarted).toBe(true);
    expect(state.gameTopics).toEqual(['JavaScript']);
    expect(state.currentQuestionIndex).toBe(0);
    expect(state.questionsList).toEqual([]);
    expect(state.currentQuestion).toBeNull();
    expect(state.playerAnswers).toEqual({});
    expect(state.registeredPlayers).toEqual([]);
    expect(state.playerScores).toEqual({ player1: 10 });
    expect(state.totalQuestions).toBe(10);
    
    // Check that timestamps are present
    expect(state.createdAt).toBeDefined();
    expect(state.lastActivity).toBeDefined();
    expect(typeof state.createdAt).toBe('number');
    expect(typeof state.lastActivity).toBe('number');
  });

  test('persistState should save game state to Redis', async () => {
    const { redisClient } = await import('../../redis/redisClient.js');
    const gameState = new GameState('test-instance');
    
    await gameState.persistState();
    
    expect(redisClient.set).toHaveBeenCalled();
    expect(redisClient.sAdd).toHaveBeenCalledWith('activeGameInstances', 'test-instance');
  });

  test('loadState should load game state from Redis', async () => {
    const { redisClient } = await import('../../redis/redisClient.js');
    const gameState = new GameState('test-instance');
    
    await gameState.loadState();
    
    expect(redisClient.get).toHaveBeenCalledWith('gameState:test-instance');
    expect(gameState.gameStarted).toBe(true);
    expect(gameState.gameTopics).toEqual(['JavaScript']);
    expect(gameState.currentQuestionIndex).toBe(2);
    expect(gameState.questionsList).toHaveLength(3);
    expect(gameState.currentQuestion).toEqual({
      id: 3, question: 'Q3', options: ['A', 'B', 'C', 'D'], correctAnswer: 'C'
    });
    expect(gameState.playerScores).toEqual({ 'player1': 2, 'player2': 1 });
  });

  test('loadState should handle case where no saved state exists', async () => {
    const { redisClient } = await import('../../redis/redisClient.js');
    redisClient.get.mockResolvedValueOnce(null);
    
    const gameState = new GameState('non-existent');
    await gameState.loadState();
    
    expect(redisClient.get).toHaveBeenCalled();
    // Default values should remain unchanged
    expect(gameState.gameStarted).toBe(false);
  });
});