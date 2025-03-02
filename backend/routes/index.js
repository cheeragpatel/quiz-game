/**
 * Main API routes configuration
 */
import express from 'express';
import rateLimit from 'express-rate-limit';
import { join } from 'path';
import { ValidationError, StateError, asyncHandler, getErrorMessage } from '../utils/errorHandler.js';
import { clearSocketSessions } from '../redis/redisClient.js';
import { 
  getGameStateForInstance, 
  getWinnersForState, 
  handleRoundCompleteForInstance,
  getGameInstances,
  createGameInstance,
  switchGameInstance,
  listGameInstances
} from '../utils/gameUtils.js';
import { generateQuestions } from '../questionGenerator.js';
import { generateHostQuip, generateGoodbyeQuip, generateIntroductionQuip } from '../virtualHost.js';

// Export function that sets up all routes
export default function setupRoutes(app, io, gameState) {
  // Host quips routes
  app.get('/api/welcomeQuip', asyncHandler(async (req, res) => {
    try {
      const quip = await generateIntroductionQuip();
      res.json({ quip });
    } catch (error) {
      console.error('Error generating welcome quip:', error);
      res.json({ quip: "Welcome to the show! Let's get ready to play!" });
    }
  }));

  app.get('/api/goodbyeQuip', asyncHandler(async (req, res) => {
    try {
      const quip = await generateGoodbyeQuip();
      res.json({ quip });
    } catch (error) {
      console.error('Error generating goodbye quip:', error);
      res.json({ quip: "That's all folks! See you next time!" });
    }
  }));

  // Game management routes
  app.get('/api/players', asyncHandler(async (req, res) => {
    const players = gameState.registeredPlayers || [];
    res.json({ players });
  }));

  app.post('/api/startGame', asyncHandler(async (req, res) => {
    const { numQuestions, topics } = req.body;
    
    if (!numQuestions || !topics || !Array.isArray(topics)) {
      throw new ValidationError('Invalid game configuration');
    }

    if (gameState.gameStarted) {
      throw new StateError('Game is already in progress');
    }

    try {
      // Generate first question and quips
      const [questions, introQuip, welcomeQuip] = await Promise.all([
        generateQuestions(topics[0], 1),
        generateIntroductionQuip(),
        generateHostQuip('game start', 'everyone')
      ]);

      const question = questions[0];

      // Update game state
      gameState.gameStarted = true;
      gameState.gameTopics = topics;
      gameState.totalQuestions = numQuestions;
      gameState.currentQuestionIndex = 0;
      gameState.questionsList = [question];
      gameState.currentQuestion = question;
      gameState.playerScores = {};
      gameState.playerAnswers = {};
      
      await gameState.persistState();
      
      io.emit('gameStarted', {
        currentQuestion: question,
        introQuip,
        welcomeQuip
      });

      res.json({
        success: true,
        currentQuestion: question,
        introQuip,
        welcomeQuip
      });
    } catch (error) {
      gameState.reset();
      throw error;
    }
  }));

  app.post('/api/endGame', asyncHandler(async (req, res) => {
    if (!gameState.gameStarted) {
      throw new StateError('Game is not in progress');
    }

    const finalWinners = getWinnersForState(gameState);
    const gameOverQuip = await generateHostQuip('game over', finalWinners);

    io.emit('gameOver', {
      winners: finalWinners,
      quip: gameOverQuip,
      finalScores: gameState.playerScores
    });

    gameState.gameStarted = false;
    await gameState.persistState();
    
    res.json({ 
      success: true,
      winners: finalWinners,
      finalScores: gameState.playerScores
    });
  }));

  app.post('/api/nextQuestion', asyncHandler(async (req, res) => {
    if (!gameState.gameStarted) {
      throw new StateError('Game has not started yet');
    }

    // Increase the question index
    gameState.currentQuestionIndex++;

    if (gameState.currentQuestionIndex >= gameState.totalQuestions) {
      // Game over
      const finalWinners = getWinnersForState(gameState);
      const gameOverQuip = await generateHostQuip('game over', finalWinners);

      // Emit 'gameOver' event with winners and final scores
      io.emit('gameOver', {
        winners: finalWinners,
        quip: gameOverQuip,
        finalScores: gameState.playerScores
      });

      gameState.gameStarted = false;
      await gameState.persistState();
      
      res.json({ 
        gameOver: true,
        winners: finalWinners
      });
    } else {
      // Continue to next question
      const [questions] = await Promise.all([
        generateQuestions(gameState.gameTopics[0], 1)
      ]);
      const newQuestion = questions[0];
      
      gameState.questionsList.push(newQuestion);
      gameState.currentQuestion = newQuestion;
      gameState.playerAnswers = {};

      // Emit 'newQuestion' event for the next question
      io.emit('newQuestion', newQuestion);

      await gameState.persistState();

      res.json(newQuestion);
    }
  }));

  app.get('/api/currentQuestion', asyncHandler(async (req, res) => {
    if (!gameState.gameStarted || !gameState.currentQuestion) {
      throw new StateError('No current question available');
    }
    
    res.json(gameState.currentQuestion);
  }));

  app.post('/api/submitAnswer', asyncHandler(async (req, res) => {
    const { playerName, answer } = req.body;

    if (!playerName || !answer) {
      throw new ValidationError('Player name and answer are required');
    }

    const result = await gameState.submitAnswer(playerName, answer);
    
    if (result.roundComplete) {
      const hostQuip = await generateHostQuip(
        result.winner ? 'correct answer' : 'wrong answer',
        result.winner
      );

      io.emit('roundComplete', {
        winner: result.winner,
        quip: hostQuip,
        scores: result.scores,
        correctAnswer: result.correctAnswer
      });
    }

    await gameState.persistState();
    res.json(result);
  }));

  app.post('/api/registerPlayer', asyncHandler(async (req, res) => {
    const { githubHandle } = req.body;
    
    if (!githubHandle) {
      throw new ValidationError('GitHub handle is required');
    }

    const existingPlayer = gameState.registeredPlayers.find(
      p => p.githubHandle === githubHandle
    );

    if (existingPlayer) {
      throw new ValidationError('Player already registered');
    }

    const player = {
      githubHandle,
      joinedAt: new Date()
    };

    gameState.registeredPlayers.push(player);
    await gameState.persistState();

    io.emit('playerRegistered', gameState.registeredPlayers);
    res.json({ success: true, player });
  }));

  app.post('/api/resetGame', asyncHandler(async (req, res) => {
    console.log('Resetting game state');
    gameState.reset();
    await gameState.persistState();
    io.emit('gameReset');
    
    res.json({ 
      success: true, 
      message: 'Game state has been reset'
    });
  }));

  // Serve static files from the React frontend app
  app.use(express.static(join(process.cwd(), '../frontend/build')));

  return app;
}