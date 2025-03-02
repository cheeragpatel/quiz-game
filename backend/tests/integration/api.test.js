/**
 * Integration tests for API endpoints
 */
import { jest, describe, beforeAll, afterAll, beforeEach, test, expect } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { errorMiddleware } from '../../utils/errorHandler.js';
import setupRoutes from '../../routes/index.js';
import GameState from '../../models/GameState.js';

// Mock Redis client
jest.mock('../../redis/redisClient.js', () => {
  return {
    redisClient: {
      isOpen: true,
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      sAdd: jest.fn().mockResolvedValue(1),
      sMembers: jest.fn().mockResolvedValue([]),
      sRem: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([])
    },
    connectRedis: jest.fn().mockResolvedValue({}),
    setupSocketIORedisAdapter: jest.fn().mockResolvedValue({}),
    clearSocketSessions: jest.fn().mockResolvedValue({})
  };
});

// Mock dependencies
jest.mock('../../models/GameState.js', () => {
  return jest.fn().mockImplementation((instanceId) => {
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
      }),
      getPlayers: jest.fn().mockReturnValue([])
    };
  });
});

jest.mock('../../questionGenerator.js', () => ({
  generateQuestions: jest.fn().mockImplementation((topic, count) => {
    const questions = [];
    for (let i = 0; i < count; i++) {
      questions.push({
        id: i + 1,
        question: `Question ${i + 1} about ${topic}?`,
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 'A'
      });
    }
    return Promise.resolve(questions);
  })
}));

jest.mock('../../virtualHost.js', () => ({
  generateHostQuip: jest.fn().mockResolvedValue('Mock quip'),
  generateIntroductionQuip: jest.fn().mockResolvedValue('Mock introduction'),
  generateGoodbyeQuip: jest.fn().mockResolvedValue('Mock goodbye')
}));

// Create express app and socket.io for tests
let app;
let io;
let httpServer;
let gameState;

describe('API Routes', () => {
  beforeAll(() => {
    app = express();
    app.use(express.json());
    httpServer = createServer(app);
    io = new Server(httpServer);
    
    gameState = new GameState('test-instance-id');
    setupRoutes(app, io, gameState);
    app.use(errorMiddleware);

    // Start the server for the tests
    httpServer.listen(0); // Use any available port
  });
  
  afterAll((done) => {
    io.close();
    httpServer.close(done);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('GET /api/players', () => {
    test('should return player list', async () => {
      gameState.registeredPlayers = [
        { githubHandle: 'player1', joinedAt: new Date() },
        { githubHandle: 'player2', joinedAt: new Date() }
      ];
      gameState.getPlayers.mockReturnValue(gameState.registeredPlayers);
      
      const response = await request(app).get('/api/players');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('players');
      expect(response.body.players).toHaveLength(2);
    });
  });
  
  describe('POST /api/register', () => {
    test('should register a new player', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({ githubHandle: 'newplayer' });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('instanceId', 'test-instance-id');
      
      // Verify gameState was updated
      expect(gameState.registeredPlayers).toContainEqual(
        expect.objectContaining({ githubHandle: 'newplayer' })
      );
      expect(gameState.persistState).toHaveBeenCalled();
    });
  });
  
  describe('POST /api/startGame', () => {
    test('should start a new game', async () => {
      const { generateQuestions } = await import('../../questionGenerator.js');
      const { generateHostQuip, generateIntroductionQuip } = await import('../../virtualHost.js');
      
      const response = await request(app)
        .post('/api/startGame')
        .send({ numQuestions: 5, topics: ['JavaScript'] });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('currentQuestion');
      expect(response.body).toHaveProperty('introQuip');
      expect(response.body).toHaveProperty('welcomeQuip');
      
      expect(generateQuestions).toHaveBeenCalledWith('JavaScript', 5);
      expect(generateIntroductionQuip).toHaveBeenCalled();
      expect(generateHostQuip).toHaveBeenCalled();
      expect(gameState.persistState).toHaveBeenCalled();
      expect(gameState.gameStarted).toBe(true);
    });
    
    test('should return validation error for missing data', async () => {
      const response = await request(app)
        .post('/api/startGame')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/submitAnswer', () => {
    beforeEach(() => {
      gameState.gameStarted = true;
      gameState.currentQuestion = {
        question: 'What is 1+1?',
        correctAnswer: '2'
      };
    });
    
    test('should submit answer and update score if correct', async () => {
      const response = await request(app)
        .post('/api/submitAnswer')
        .send({ playerName: 'player1', answer: '2' });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      
      expect(gameState.playerAnswers.player1).toBe('2');
      expect(gameState.playerScores.player1).toBe(1);
      expect(gameState.persistState).toHaveBeenCalled();
    });
    
    test('should submit answer and not update score if incorrect', async () => {
      const response = await request(app)
        .post('/api/submitAnswer')
        .send({ playerName: 'player2', answer: '3' });
      
      expect(response.status).toBe(200);
      expect(gameState.playerAnswers.player2).toBe('3');
      expect(gameState.playerScores.player2).toBeUndefined();
    });
    
    test('should return error if game not started', async () => {
      gameState.gameStarted = false;
      
      const response = await request(app)
        .post('/api/submitAnswer')
        .send({ playerName: 'player1', answer: '2' });
      
      // This test is updated to expect 409 instead of 400, as StateError returns 409
      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
    });
  });
  
  describe('POST /api/forceCleanup', () => {
    test('should reset the game state', async () => {
      // Import and mock Redis clearSocketSessions function
      const { clearSocketSessions } = await import('../../redis/redisClient.js');
      
      const response = await request(app)
        .post('/api/forceCleanup');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(gameState.reset).toHaveBeenCalled();
    });
  });
});