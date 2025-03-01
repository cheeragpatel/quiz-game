const express = require('express');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const { generateQuestions } = require('./questionGenerator');
const { 
  generateHostQuip, 
  generateGoodbyeQuip, 
  generateIntroductionQuip 
} = require('./virtualHost');

const app = express();
const port = process.env.PORT || 3001;
const httpServer = createServer(app);
const io = new Server(httpServer);

// Enhanced Redis client setup with logging
console.log('Initializing Redis connections...');
const redisClient = createClient({
  url: 'redis://localhost:6379'
});

// Add Redis client event listeners for connection status
redisClient.on('connect', () => console.log('Main Redis client: connecting...'));
redisClient.on('ready', () => console.log('Main Redis client: connected and ready'));
redisClient.on('error', (err) => console.error('Main Redis client error:', err));
redisClient.on('reconnecting', () => console.log('Main Redis client: reconnecting...'));
redisClient.on('end', () => console.log('Main Redis client: connection closed'));

redisClient.connect().catch(err => {
  console.error('Failed to connect main Redis client:', err);
});

// Redis adapter for socket.io with enhanced logging
const pubClient = createClient({
  url: 'redis://localhost:6379'
});
const subClient = createClient({
  url: 'redis://localhost:6379'
});

// Add event listeners for pub/sub clients
pubClient.on('connect', () => console.log('Redis PUB client: connecting...'));
pubClient.on('ready', () => console.log('Redis PUB client: connected and ready'));
pubClient.on('error', (err) => console.error('Redis PUB client error:', err));

subClient.on('connect', () => console.log('Redis SUB client: connecting...'));
subClient.on('ready', () => console.log('Redis SUB client: connected and ready'));
subClient.on('error', (err) => console.error('Redis SUB client error:', err));

// Function to clear Socket.IO sessions from Redis
async function clearSocketSessions() {
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
  }
}

Promise.all([pubClient.connect(), subClient.connect()]).then(async () => {
  console.log('Setting up Socket.IO Redis adapter');
  io.adapter(createAdapter(pubClient, subClient));
  console.log('Socket.IO Redis adapter setup complete');
  
  // Clear socket sessions on server startup
  await clearSocketSessions();
}).catch(err => {
  console.error('Failed to setup Redis adapter for Socket.IO:', err);
});

// Encapsulated game state with enhanced logging
class GameState {
  constructor() {
    this.activeConnections = new Set(); // Track active connections
    this.reset();
    console.log('Game state initialized with default values');
  }

  reset() {
    this.gameStarted = false;
    this.gameTopics = [];
    this.currentQuestionIndex = 0;
    this.questionsList = [];
    this.currentQuestion = null;
    this.playerAnswers = {};
    this.registeredPlayers = [];
    this.playerScores = {};
    this.totalQuestions = 10;
    this.activeConnections.clear(); // Clear active connections
    console.log('Game state reset to default values');
  }

  // Called on server restart to clean old session state
  resetConnectionState() {
    this.activeConnections.clear();
    this.playerAnswers = {};
    this.registeredPlayers = [];
    if (this.gameStarted) {
      console.log('Resetting connection state while preserving game progress');
    } else {
      console.log('Resetting connection state with no active game');
    }
  }

  saveState() {
    const state = {
      gameStarted: this.gameStarted,
      gameTopics: this.gameTopics,
      currentQuestionIndex: this.currentQuestionIndex,
      questionsList: this.questionsList,
      currentQuestion: this.currentQuestion,
      playerAnswers: this.playerAnswers,
      registeredPlayers: this.registeredPlayers,
      playerScores: this.playerScores,
      totalQuestions: this.totalQuestions
    };
    console.log(`Game state prepared for saving: ${JSON.stringify({
      gameStarted: state.gameStarted,
      currentQuestionIndex: state.currentQuestionIndex,
      registeredPlayersCount: state.registeredPlayers.length,
      playerAnswersCount: Object.keys(state.playerAnswers).length,
      playerScoresCount: Object.keys(state.playerScores).length
    })}`);
    return state;
  }

  async persistState() {
    const state = this.saveState();
    try {
      await redisClient.set('gameState', JSON.stringify(state));
      console.log(`Game state successfully persisted to Redis at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('Failed to persist game state to Redis:', error);
    }
  }

  async loadState() {
    try {
      const stateJson = await redisClient.get('gameState');
      if (!stateJson) {
        console.log('No existing game state found in Redis');
        return;
      }
      
      console.log('Loading game state from Redis');
      const state = JSON.parse(stateJson);
      
      this.gameStarted = state.gameStarted;
      this.gameTopics = state.gameTopics;
      this.currentQuestionIndex = state.currentQuestionIndex;
      this.questionsList = state.questionsList;
      this.currentQuestion = state.currentQuestion;
      this.playerAnswers = state.playerAnswers;
      this.registeredPlayers = state.registeredPlayers;
      this.playerScores = state.playerScores;
      this.totalQuestions = state.totalQuestions;
      
      console.log(`Game state loaded from Redis: ${JSON.stringify({
        gameStarted: this.gameStarted,
        currentQuestionIndex: this.currentQuestionIndex,
        registeredPlayersCount: this.registeredPlayers.length,
        playerAnswersCount: Object.keys(this.playerAnswers).length,
        playerScoresCount: Object.keys(this.playerScores).length
      })}`);
    } catch (error) {
      console.error('Failed to load game state from Redis:', error);
    }
  }
}

const gameState = new GameState();

// Load game state on server startup
(async () => {
  try {
    // First clear any socket sessions
    await clearSocketSessions();
    
    // Then load persistent game state
    await gameState.loadState();
    
    // Reset connection-specific state while preserving game data
    gameState.resetConnectionState();
    
    // Persist the clean state
    await gameState.persistState();
    
    console.log('Initial game state loaded and connection state reset on server startup');
  } catch (error) {
    console.error('Failed to initialize game state:', error);
  }
})();

app.use(express.json());

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, '../frontend/build')));

app.post('/api/startGame', async (req, res) => {
  const { numQuestions, topics } = req.body;
  gameState.gameStarted = true;
  gameState.gameTopics = topics;
  gameState.totalQuestions = numQuestions;
  gameState.currentQuestionIndex = 0;
  gameState.playerScores = {}; // Reset scores
  gameState.playerAnswers = {};

  try {
    // Generate all questions upfront
    gameState.questionsList = await generateQuestions(gameState.gameTopics[0], gameState.totalQuestions);
    if (!gameState.questionsList || gameState.questionsList.length === 0) {
      throw new Error('No questions generated');
    }

    // Set the current question
    gameState.currentQuestion = gameState.questionsList[gameState.currentQuestionIndex];

    const introQuip = await generateIntroductionQuip();
    const welcomeQuip = await generateIntroductionQuip();

    // Emit 'gameStarted' event with the current question
    io.emit('gameStarted', { 
      currentQuestion: gameState.currentQuestion,
      introQuip,
      welcomeQuip
    });

    await gameState.persistState();

    res.send({ 
      message: 'Game started',
      currentQuestion: gameState.currentQuestion,
      introQuip,
      welcomeQuip
    });
  } catch (error) {
    console.error('Failed to start game:', error);
    res.status(500).send({ error: 'Failed to start game' });
  }
});

app.post('/api/endGame', async (req, res) => {
  gameState.gameStarted = false;
  const finalWinner = getWinners();
  
  generateHostQuip('game over', finalWinner)
    .then(async quip => {
      io.emit('gameOver', { 
        winner: finalWinner,
        quip: quip,
        finalScores: gameState.playerScores
      });
      await gameState.persistState();
    });

  gameState.reset();
  await gameState.persistState();
  res.send({ message: 'Game ended', winner: finalWinner });
});

app.post('/api/nextQuestion', async (req, res) => {
  if (!gameState.gameStarted) {
    return res.status(400).send({ error: 'Game has not started yet' });
  }

  // Increase the question index
  gameState.currentQuestionIndex++;

  if (gameState.currentQuestionIndex >= gameState.totalQuestions) {
    // Game over
    const finalWinners = getWinners();
    const gameOverQuip = await generateHostQuip('game over', finalWinners);

    // Emit 'gameOver' event with winners and final scores
    io.emit('gameOver', {
      winners: finalWinners,
      quip: gameOverQuip,
      finalScores: gameState.playerScores
    });

    gameState.gameStarted = false; // Reset game state
    await gameState.persistState();
    res.json({ gameOver: true });
  } else {
    // Continue to next question
    gameState.currentQuestion = gameState.questionsList[gameState.currentQuestionIndex];
    gameState.playerAnswers = {};

    // Emit 'newQuestion' event for the next question
    io.emit('newQuestion', gameState.currentQuestion);

    await gameState.persistState();

    res.json(gameState.currentQuestion);
  }
});

app.get('/api/currentQuestion', (req, res) => {
  if (!gameState.gameStarted || !gameState.currentQuestion) {
    return res.status(400).send({ error: 'No current question available' });
  }
  res.send(gameState.currentQuestion);
});

app.get('/api/progress', (req, res) => {
  res.send({ progress: 50 }); // Example progress
});

app.get('/api/winnerAndQuip', async (req, res) => {
  if (!gameState.gameStarted) {
    return res.status(400).send({ error: 'Game has not started yet' });
  }
  const winner = await hostGame();
  res.send({ winner });
});

app.get('/api/players', (req, res) => {
  res.json(gameState.registeredPlayers);
});

app.post('/api/register', async (req, res) => {
  const { githubHandle } = req.body;
  gameState.registeredPlayers.push({ 
    githubHandle,
    joinedAt: new Date()
  });
  io.emit('playerRegistered', gameState.registeredPlayers);
  await gameState.persistState();
  res.json({ success: true });
});

app.post('/api/submitAnswer', async (req, res) => {
  const { playerName, answer } = req.body;
  
  const player = playerName;

  if (!gameState.gameStarted) {
    return res.status(400).send({ error: 'Game has not started yet' });
  }

  // Emit when player answers
  io.emit('playerAnswered', { playerName });
  
  // Only count first answer from each player for this round
  if (!gameState.playerAnswers[player]) {
    gameState.playerAnswers[player] = answer;
    
    // Check if answer is correct and update score
    if (answer === gameState.currentQuestion.correctAnswer) {
      gameState.playerScores[player] = (gameState.playerScores[player] || 0) + 1;
    }
  }
  
  // Check if all players have answered
  if (Object.keys(gameState.playerAnswers).length === gameState.registeredPlayers.length) {
    // Check if anyone got it right
    const correctAnswers = Object.entries(gameState.playerAnswers)
      .filter(([_, ans]) => ans === gameState.currentQuestion.correctAnswer);
    
    if (correctAnswers.length === 0) {
      // No one got it right
      generateHostQuip('no winners', gameState.currentQuestion.correctAnswer)
        .then(async quip => {
          io.emit('roundComplete', { 
            winners: [],
            quip,
            scores: gameState.playerScores,
            correctAnswer: gameState.currentQuestion.correctAnswer
          });
          await gameState.persistState();
        });
    } else {
      // Some players got it right
      const winners = getWinners();
      generateHostQuip(gameState.currentQuestion.question, winners)
        .then(async quip => {
          io.emit('roundComplete', { 
            winners,
            quip,
            scores: gameState.playerScores
          });
          await gameState.persistState();
        });
    }
  } else {
    await gameState.persistState();
  }
  
  res.json({ success: true });
});

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

// server.js - Add introduction endpoint
app.get('/api/introductionQuip', async (req, res) => {
  try {
    const quip = await generateIntroductionQuip();
    res.json({ quip });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate introduction quip' });
  }
});

// Enhanced Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  
  // Track this connection in our game state
  gameState.activeConnections.add(socket.id);
  console.log(`Active connections: ${gameState.activeConnections.size}`);
  
  // Send current player count to all clients
  io.emit('playerCount', io.engine.clientsCount);
  
  socket.on('reconnectStateRequest', async () => {
    console.log(`Player reconnected: ${socket.id}`);
    await gameState.loadState();
    const currentState = gameState.saveState();
    socket.emit('reconnectState', currentState);
    console.log(`Reconnect state sent to socket ${socket.id}`);
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`);
    
    // Remove this connection from our tracking
    gameState.activeConnections.delete(socket.id);
    console.log(`Active connections: ${gameState.activeConnections.size}`);
    
    // Send updated player count to all clients
    io.emit('playerCount', io.engine.clientsCount);
  });
});

// Helper function to get the winners
function getWinners() {
  const highestScore = Math.max(...Object.values(gameState.playerScores));
  const winners = Object.keys(gameState.playerScores).filter(
    (player) => gameState.playerScores[player] === highestScore
  );
  return winners;
}

// All other GET requests not handled before will return the React frontend app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

// Replace app.listen with httpServer.listen
httpServer.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Redis connection status: ${redisClient.isOpen ? 'Connected' : 'Disconnected'}`);
});
