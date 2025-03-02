/**
 * Main API routes configuration
 */
import express from 'express';
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
  // Middleware to extract game instance ID from request
  function extractInstanceId(req, res, next) {
    req.gameInstanceId = req.headers['x-game-instance-id'] || 
                        req.query.instanceId || 
                        (req.body && req.body.instanceId) || 
                        null;
    
    if (req.gameInstanceId) {
      console.log(`Request using game instance ID: ${req.gameInstanceId}`);
    }
    
    next();
  }

  // Apply the middleware to all API routes
  app.use('/api', extractInstanceId);

  // Game management routes
  app.post('/api/startGame', asyncHandler(async (req, res) => {
    const { numQuestions, topics } = req.body;
    
    if (!numQuestions || !topics || !Array.isArray(topics)) {
      throw new ValidationError('Invalid game configuration');
    }

    // Get the appropriate game state for this instance
    const instanceState = await getGameStateForInstance(req.gameInstanceId, gameState);

    if (instanceState.gameStarted) {
      throw new StateError('Game is already in progress');
    }

    instanceState.gameStarted = true;
    instanceState.gameTopics = topics;
    instanceState.totalQuestions = numQuestions;
    instanceState.currentQuestionIndex = 0;
    instanceState.playerScores = {};
    instanceState.playerAnswers = {};

    try {
      instanceState.questionsList = await generateQuestions(instanceState.gameTopics[0], instanceState.totalQuestions);
      if (!instanceState.questionsList?.length) {
        throw new StateError('Failed to generate questions');
      }

      instanceState.currentQuestion = instanceState.questionsList[0];
      const [introQuip, welcomeQuip] = await Promise.all([
        generateIntroductionQuip(),
        generateHostQuip('welcome', 'everyone')
      ]);

      await instanceState.persistState();

      // Emit only to sockets in this game instance
      io.to(instanceState.instanceId).emit('gameStarted', { 
        currentQuestion: instanceState.currentQuestion,
        introQuip,
        welcomeQuip
      });

      res.json({ 
        success: true,
        instanceId: instanceState.instanceId,
        currentQuestion: instanceState.currentQuestion,
        introQuip,
        welcomeQuip
      });
    } catch (error) {
      instanceState.reset();
      throw error;
    }
  }));

  app.post('/api/endGame', asyncHandler(async (req, res) => {
    const instanceState = await getGameStateForInstance(req.gameInstanceId, gameState);
    
    instanceState.gameStarted = false;
    const finalWinner = getWinnersForState(instanceState);
    
    generateHostQuip('game over', finalWinner)
      .then(async quip => {
        // Emit only to sockets in this game instance
        io.to(instanceState.instanceId).emit('gameOver', { 
          winner: finalWinner,
          quip: quip,
          finalScores: instanceState.playerScores
        });
        await instanceState.persistState();
      });

    instanceState.reset();
    await instanceState.persistState();
    res.send({ 
      message: 'Game ended', 
      winner: finalWinner,
      instanceId: instanceState.instanceId
    });
  }));

  app.post('/api/nextQuestion', asyncHandler(async (req, res) => {
    const instanceState = await getGameStateForInstance(req.gameInstanceId, gameState);

    if (!instanceState.gameStarted) {
      throw new StateError('Game has not started yet');
    }

    // Increase the question index
    instanceState.currentQuestionIndex++;

    if (instanceState.currentQuestionIndex >= instanceState.totalQuestions) {
      // Game over
      const finalWinners = getWinnersForState(instanceState);
      const gameOverQuip = await generateHostQuip('game over', finalWinners);

      // Emit 'gameOver' event with winners and final scores
      io.to(instanceState.instanceId).emit('gameOver', {
        winners: finalWinners,
        quip: gameOverQuip,
        finalScores: instanceState.playerScores
      });

      instanceState.gameStarted = false; // Reset game state
      await instanceState.persistState();
      res.json({ 
        gameOver: true,
        winners: finalWinners,
        instanceId: instanceState.instanceId
      });
    } else {
      // Continue to next question
      instanceState.currentQuestion = instanceState.questionsList[instanceState.currentQuestionIndex];
      instanceState.playerAnswers = {};

      // Emit 'newQuestion' event for the next question
      io.to(instanceState.instanceId).emit('newQuestion', instanceState.currentQuestion);

      await instanceState.persistState();

      res.json({
        ...instanceState.currentQuestion,
        instanceId: instanceState.instanceId
      });
    }
  }));

  app.get('/api/currentQuestion', asyncHandler(async (req, res) => {
    const instanceState = await getGameStateForInstance(req.gameInstanceId, gameState);

    if (!instanceState.gameStarted || !instanceState.currentQuestion) {
      throw new StateError('No current question available');
    }
    
    res.send({
      ...instanceState.currentQuestion,
      instanceId: instanceState.instanceId
    });
  }));

  app.get('/api/progress', (req, res) => {
    res.send({ progress: 50 }); // Example progress
  });

  // Player management
  app.get('/api/players', asyncHandler(async (req, res) => {
    const instanceState = await getGameStateForInstance(req.gameInstanceId, gameState);
    
    res.json({
      players: instanceState.registeredPlayers,
      instanceId: instanceState.instanceId
    });
  }));

  app.post('/api/register', asyncHandler(async (req, res) => {
    const { githubHandle } = req.body;
    
    const instanceState = await getGameStateForInstance(req.gameInstanceId, gameState);
    
    instanceState.registeredPlayers.push({ 
      githubHandle,
      joinedAt: new Date()
    });
    
    // Emit only to sockets in this game instance
    io.to(instanceState.instanceId).emit('playerRegistered', instanceState.registeredPlayers);
    
    await instanceState.persistState();
    
    res.json({ 
      success: true,
      instanceId: instanceState.instanceId
    });
  }));

  app.post('/api/submitAnswer', asyncHandler(async (req, res) => {
    const { playerName, answer } = req.body;
    
    if (!playerName || !answer) {
      throw new ValidationError('Missing required fields');
    }

    const instanceState = await getGameStateForInstance(req.gameInstanceId, gameState);

    if (!instanceState.gameStarted) {
      throw new StateError('Game has not started yet');
    }

    if (instanceState.playerAnswers[playerName]) {
      throw new StateError('Player has already answered');
    }

    instanceState.playerAnswers[playerName] = answer;
    
    // Emit only to sockets in this game instance
    io.to(instanceState.instanceId).emit('playerAnswered', { 
      playerName,
      instanceId: instanceState.instanceId
    });

    if (answer === instanceState.currentQuestion.correctAnswer) {
      instanceState.playerScores[playerName] = (instanceState.playerScores[playerName] || 0) + 1;
    }

    await instanceState.persistState();
    
    res.json({ 
      success: true,
      instanceId: instanceState.instanceId
    });

    // Check if round is complete
    if (Object.keys(instanceState.playerAnswers).length === instanceState.registeredPlayers.length) {
      await handleRoundCompleteForInstance(instanceState, io);
    }
  }));

  // Quips API
  app.get('/api/welcomeQuip', async (req, res) => {
    try {
      const quip = await generateHostQuip('welcome', 'everyone');
      res.json({ quip });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate welcome quip' });
    }
  });

  app.post('/api/generateQuip', async (req, res) => {
    try {
      const { prompt } = req.body;
      const quip = await generateHostQuip(prompt);
      res.json({ quip });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate quip' });
    }
  });

  app.get('/api/goodbyeQuip', async (req, res) => {
    try {
      const quip = await generateGoodbyeQuip();
      res.json({ quip });
    } catch (error) {
      console.error('Error generating goodbye quip:', error);
      res.status(500).json({ error: 'Failed to generate goodbye quip' });
    }
  });

  app.get('/api/introductionQuip', async (req, res) => {
    try {
      const quip = await generateIntroductionQuip();
      res.json({ quip });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate introduction quip' });
    }
  });

  // Admin routes
  app.post('/api/forceCleanup', asyncHandler(async (req, res) => {
    if (req.gameInstanceId) {
      console.log(`Forcing cleanup for game instance: ${req.gameInstanceId}`);
      
      const instanceState = await getGameStateForInstance(req.gameInstanceId, gameState);
      instanceState.reset();
      await instanceState.persistState();
      
      // Remove from active instances if explicitly requested
      if (req.body.removeFromActiveInstances) {
        await redisClient.sRem('activeGameInstances', req.gameInstanceId);
        await redisClient.del(`gameState:${req.gameInstanceId}`);
      }
      
      // Notify only the clients in this instance
      io.to(req.gameInstanceId).emit('gameForceEnded', { 
        message: 'Game was force ended by admin',
        instanceId: req.gameInstanceId
      });
      
      res.json({ 
        success: true, 
        message: `Game state for instance ${req.gameInstanceId} has been reset`
      });
    } else {
      // No instance ID provided, clear the default game state and socket sessions
      console.log('Forcing game cleanup for all instances');
      gameState.reset();
      await gameState.persistState();
      await clearSocketSessions();
      
      // Notify all clients
      io.emit('gameForceEnded', { message: 'All games were force ended by admin' });
      
      res.json({ 
        success: true, 
        message: 'All game states have been reset'
      });
    }
  }));

  // Game instances management
  app.get('/api/gameInstances', asyncHandler(async (req, res) => {
    const instances = await getGameInstances(io);
    res.json({
      count: instances.length,
      instances
    });
  }));

  // Serve static files from the React frontend app
  app.use(express.static(join(process.cwd(), '../frontend/build')));

  // All other GET requests not handled before will return the React frontend app
  app.get('*', (req, res) => {
    res.sendFile(join(process.cwd(), '../frontend/build/index.html'));
  });

  // Game instance management routes
  app.post('/api/createGameInstance', async (req, res) => {
    try {
      const instanceId = await createGameInstance();
      res.json({ instanceId });
    } catch (error) {
      console.error('Error creating game instance:', error);
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.get('/api/gameInstances', async (req, res) => {
    try {
      const instances = await listGameInstances();
      res.json({ instances });
    } catch (error) {
      console.error('Error listing game instances:', error);
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.post('/api/switchGameInstance', async (req, res) => {
    try {
      const { instanceId } = req.body;
      const state = await switchGameInstance(instanceId);
      io.emit('gameInstancesUpdated', await listGameInstances());
      res.json(state);
    } catch (error) {
      console.error('Error switching game instance:', error);
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  app.post('/api/resetGameState', async (req, res) => {
    try {
      const { instanceId } = req.body;
      await gameState.reset(instanceId);
      await gameState.persistState();
      io.emit('gameInstancesUpdated', await listGameInstances());
      res.json({ success: true });
    } catch (error) {
      console.error('Error resetting game state:', error);
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });

  // Updated players route to ensure it always returns an array
  app.get('/api/players', asyncHandler(async (req, res) => {
    const players = await gameState.getPlayers() || [];
    res.json({ players: Array.isArray(players) ? players : [] });
  }));

  return app;
}