const express = require('express');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
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

// Encapsulated game state
class GameState {
  constructor() {
    this.gameStarted = false;
    this.gameTopics = [];
    this.currentQuestionIndex = 0;
    this.questionsList = [];
    this.currentQuestion = null;
    this.playerAnswers = {};
    this.registeredPlayers = [];
    this.playerScores = {};
    this.totalQuestions = 10;
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
  }

  saveState() {
    return {
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
  }

  loadState(state) {
    this.gameStarted = state.gameStarted;
    this.gameTopics = state.gameTopics;
    this.currentQuestionIndex = state.currentQuestionIndex;
    this.questionsList = state.questionsList;
    this.currentQuestion = state.currentQuestion;
    this.playerAnswers = state.playerAnswers;
    this.registeredPlayers = state.registeredPlayers;
    this.playerScores = state.playerScores;
    this.totalQuestions = state.totalQuestions;
  }
}

const gameState = new GameState();

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

app.post('/api/endGame', (req, res) => {
  gameState.gameStarted = false;
  const finalWinner = getWinners();
  
  generateHostQuip('game over', finalWinner)
    .then(quip => {
      io.emit('gameOver', { 
        winner: finalWinner,
        quip: quip,
        finalScores: gameState.playerScores
      });
    });

  gameState.reset();
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
    res.json({ gameOver: true });
  } else {
    // Continue to next question
    gameState.currentQuestion = gameState.questionsList[gameState.currentQuestionIndex];
    gameState.playerAnswers = {};

    // Emit 'newQuestion' event for the next question
    io.emit('newQuestion', gameState.currentQuestion);

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

app.post('/api/register', (req, res) => {
  const { githubHandle } = req.body;
  gameState.registeredPlayers.push({ 
    githubHandle,
    joinedAt: new Date()
  });
  io.emit('playerRegistered', gameState.registeredPlayers);
  res.json({ success: true });
});

app.post('/api/submitAnswer', (req, res) => {
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
        .then(quip => {
          io.emit('roundComplete', { 
            winners: [],
            quip,
            scores: gameState.playerScores,
            correctAnswer: gameState.currentQuestion.correctAnswer
          });
        });
    } else {
      // Some players got it right
      const winners = getWinners();
      generateHostQuip(gameState.currentQuestion.question, winners)
        .then(quip => {
          io.emit('roundComplete', { 
            winners,
            quip,
            scores: gameState.playerScores
          });
        });
    }
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

// Handle player reconnections
io.on('connection', (socket) => {
  socket.on('reconnect', () => {
    const currentState = gameState.saveState();
    socket.emit('reconnectState', currentState);
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
});
