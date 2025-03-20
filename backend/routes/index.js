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
  // Configure rate limiters
  const standardLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 30, // Limit each IP to 30 requests per window
    message: 'Too many requests, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });
  
  const nextQuestionLimiter = rateLimit({
    windowMs: 5 * 1000, // 5 seconds window
    max: 3, // Limit each IP to 3 requests per 5-second window
    message: 'Too many question requests, please wait a moment.',
    standardHeaders: true,
    legacyHeaders: false,
    headers: true,
  });
  
  // Apply standard rate limiter to all routes
  app.use(standardLimiter);

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
      console.log(`Generating ${numQuestions} questions for topics: ${topics.join(', ')}`);
      
      // Generate all questions at once and quips
      const [allQuestions, introQuip, welcomeQuip] = await Promise.all([
        generateQuestions(topics[0], numQuestions),
        generateIntroductionQuip(),
        generateHostQuip('game start', 'everyone')
      ]);

      if (allQuestions.length === 0) {
        throw new Error('Failed to generate questions');
      }

      // Update game state with all questions
      gameState.gameStarted = true;
      gameState.gameTopics = topics;
      gameState.totalQuestions = allQuestions.length;
      gameState.currentQuestionIndex = 0;
      gameState.questionsList = allQuestions;
      gameState.currentQuestion = allQuestions[0];
      gameState.playerScores = {};
      gameState.playerAnswers = {};
      
      console.log(`Successfully generated ${allQuestions.length} questions`);
      
      await gameState.persistState();
      
      io.emit('gameStarted', {
        currentQuestion: gameState.currentQuestion,
        introQuip,
        welcomeQuip
      });

      res.json({
        success: true,
        currentQuestion: gameState.currentQuestion,
        introQuip,
        welcomeQuip
      });
    } catch (error) {
      console.error('Error starting game:', error);
      gameState.reset();
      throw error;
    }
  }));

  app.post('/api/endGame', asyncHandler(async (req, res) => {
    if (!gameState.gameStarted) {
      throw new StateError('Game is not in progress');
    }

    const finalWinners = getWinnersForState(gameState);
    let gameOverQuip = '';

    try {
      // Try to generate a quip, but don't fail if we can't
      gameOverQuip = await generateHostQuip('game over', finalWinners);
    } catch (error) {
      console.error('Error generating game over quip:', error);
      // Fallback message if API call fails
      const winnerText = finalWinners.length > 1 
        ? `${finalWinners.join(' and ')} are our champions!` 
        : `${finalWinners[0]} is our champion!`;
      gameOverQuip = `That's a wrap, folks! ${winnerText} Thanks for playing!`;
    }

    // Send game over event to all clients
    io.emit('gameOver', {
      winners: finalWinners,
      quip: gameOverQuip,
      goodbyeQuip: "Thanks for playing everyone! See you next time!",
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

  // Override with specific rate limiter for nextQuestion route
  app.post('/api/nextQuestion', nextQuestionLimiter, asyncHandler(async (req, res) => {
    if (!gameState.gameStarted) {
      throw new StateError('Game has not started yet');
    }

    // Increase the question index
    gameState.currentQuestionIndex++;

    if (gameState.currentQuestionIndex >= gameState.totalQuestions) {
      // Game over
      const finalWinners = getWinnersForState(gameState);
      let gameOverQuip = '';

      try {
        // Try to generate a quip, but don't fail if we can't
        gameOverQuip = await generateHostQuip('game over', finalWinners);
      } catch (error) {
        console.error('Error generating game over quip:', error);
        // Fallback message if API call fails
        const winnerText = finalWinners.length > 1 
          ? `${finalWinners.join(' and ')} are our champions!` 
          : `${finalWinners[0]} is our champion!`;
        gameOverQuip = `That's a wrap, folks! ${winnerText} Thanks for playing!`;
      }

      // Emit 'gameOver' event with winners and final scores
      io.emit('gameOver', {
        winners: finalWinners,
        quip: gameOverQuip,
        goodbyeQuip: "Thanks for playing everyone! See you next time!",
        finalScores: gameState.playerScores
      });

      gameState.gameStarted = false;
      await gameState.persistState();
      
      res.json({ 
        gameOver: true,
        winners: finalWinners
      });
    } else {
      // Get the next question from the pre-generated question list
      const newQuestion = gameState.questionsList[gameState.currentQuestionIndex];
      
      // Update the current question and reset player answers
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
      
      // Send additional game progress info with the roundComplete event
      io.emit('roundComplete', {
        winner: result.winner,
        quip: hostQuip,
        scores: result.scores,
        correctAnswer: result.correctAnswer,
        currentQuestionIndex: gameState.currentQuestionIndex,
        totalQuestions: gameState.totalQuestions,
        isLastQuestion: gameState.currentQuestionIndex >= gameState.totalQuestions - 1
      });

      // Only automatically advance if not the last question
      if (gameState.currentQuestionIndex < gameState.totalQuestions - 1) {
        setTimeout(async () => {
          try {
            const response = await fetch(`${req.protocol}://${req.get('host')}/api/nextQuestion`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            
            if (!response.ok) {
              console.error('Failed to advance to next question automatically');
            }
          } catch (error) {
            console.error('Error advancing to next question:', error);
          }
        }, 5000); // 5-second delay before advancing to next question
      } 
      // If it's the last question, auto-end the game after a delay
      else {
        setTimeout(async () => {
          try {
            // End the game automatically after the last question
            const finalWinners = getWinnersForState(gameState);
            let gameOverQuip = '';
            
            try {
              gameOverQuip = await generateHostQuip('game over', finalWinners);
            } catch (error) {
              console.error('Error generating game over quip:', error);
              const winnerText = finalWinners.length > 1 
                ? `${finalWinners.join(' and ')} are our champions!` 
                : `${finalWinners[0]} is our champion!`;
              gameOverQuip = `That's a wrap, folks! ${winnerText} Thanks for playing!`;
            }
            
            // Emit 'gameOver' event with winners and final scores
            io.emit('gameOver', {
              winners: finalWinners,
              quip: gameOverQuip,
              goodbyeQuip: "Thanks for playing everyone! See you next time!",
              finalScores: gameState.playerScores
            });
            
            gameState.gameStarted = false;
            await gameState.persistState();
            
          } catch (error) {
            console.error('Error ending game automatically:', error);
          }
        }, 8000); // Slightly longer delay (8 seconds) before ending the game
      }
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