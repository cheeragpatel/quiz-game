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

// Global variables
let gameStarted = false;
let gameTopics = [];
let currentQuestionIndex = 0;
let questionsList = [];
let currentQuestion = null; // Global declaration
let playerAnswers = {};
let registeredPlayers = [];
let playerScores = {};
let totalQuestions = 10;

app.use(express.json());

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, '../frontend/build')));

app.post('/api/startGame', async (req, res) => {
  const { numQuestions, topics } = req.body;
  gameStarted = true;
  gameTopics = topics;
  totalQuestions = numQuestions;
  currentQuestionIndex = 0;
  playerScores = {}; // Reset scores
  playerAnswers = {};

  try {
    // Generate all questions upfront
    questionsList = await generateQuestions(gameTopics[0], totalQuestions);
    if (!questionsList || questionsList.length === 0) {
      throw new Error('No questions generated');
    }

    // Set the current question
    currentQuestion = questionsList[currentQuestionIndex];

    const introQuip = await generateIntroductionQuip();
    const welcomeQuip = await generateHostQuip('welcome', 'everyone');

    // Emit 'gameStarted' event with the current question
    io.emit('gameStarted', { 
      currentQuestion,
      introQuip,
      welcomeQuip
    });

    res.send({ 
      message: 'Game started',
      currentQuestion,
      introQuip,
      welcomeQuip
    });
  } catch (error) {
    console.error('Failed to start game:', error);
    res.status(500).send({ error: 'Failed to start game' });
  }
});

app.post('/api/endGame', (req, res) => {
  gameStarted = false;
  const finalWinner = getWinner();
  
  generateHostQuip('game over', finalWinner)
    .then(quip => {
      io.emit('gameOver', { 
        winner: finalWinner,
        quip: quip,
        finalScores: playerScores
      });
    });

  gameTopics = [];
  currentQuestion = null;
  playerAnswers = {};
  res.send({ message: 'Game ended', winner: finalWinner });
});

app.post('/api/nextQuestion', async (req, res) => {
  if (!gameStarted) {
    return res.status(400).send({ error: 'Game has not started yet' });
  }

  // Increase the question index
  currentQuestionIndex++;

  if (currentQuestionIndex >= totalQuestions) {
    // Game over
    const finalWinners = getWinners();
    const gameOverQuip = await generateHostQuip('game over', finalWinners);

    // Emit 'gameOver' event with winners and final scores
    io.emit('gameOver', {
      winners: finalWinners,
      quip: gameOverQuip,
      finalScores: playerScores
    });

    gameStarted = false; // Reset game state
    res.json({ gameOver: true });
  } else {
    // Continue to next question
    currentQuestion = questionsList[currentQuestionIndex];
    playerAnswers = {};

    // Emit 'newQuestion' event for the next question
    io.emit('newQuestion', currentQuestion);

    res.json(currentQuestion);
  }
});

app.get('/api/currentQuestion', (req, res) => {
  if (!gameStarted || !currentQuestion) {
    return res.status(400).send({ error: 'No current question available' });
  }
  res.send(currentQuestion);
});

app.get('/api/progress', (req, res) => {
  res.send({ progress: 50 }); // Example progress
});

app.get('/api/winnerAndQuip', async (req, res) => {
  if (!gameStarted) {
    return res.status(400).send({ error: 'Game has not started yet' });
  }
  const winner = await hostGame();
  res.send({ winner });
});

app.get('/api/players', (req, res) => {
  res.json(registeredPlayers);
});

app.post('/api/register', (req, res) => {
  const { githubHandle } = req.body;
  registeredPlayers.push({ 
    githubHandle,
    joinedAt: new Date()
  });
  io.emit('playerRegistered', registeredPlayers);
  res.json({ success: true });
});

app.post('/api/submitAnswer', (req, res) => {
  const { playerName, answer } = req.body;
  
  // Emit when player answers
  io.emit('playerAnswered', { playerName });

  const player = playerName;

  if (!gameStarted) {
    return res.status(400).send({ error: 'Game has not started yet' });
  }
  
  // Only count first answer from each player for this round
  if (!playerAnswers[player]) {
    playerAnswers[player] = answer;
    
    // Check if answer is correct and update score
    if (answer === currentQuestion.correctAnswer) {
      playerScores[player] = (playerScores[player] || 0) + 1;
    }
  }
  
  // Check if all players have answered
  if (Object.keys(playerAnswers).length === registeredPlayers.length) {
    // Check if anyone got it right
    const correctAnswers = Object.entries(playerAnswers)
      .filter(([_, ans]) => ans === currentQuestion.correctAnswer);
    
    if (correctAnswers.length === 0) {
      // No one got it right
      generateHostQuip('no winners', currentQuestion.correctAnswer)
        .then(quip => {
          io.emit('roundComplete', { 
            winners: [],
            quip,
            scores: playerScores,
            correctAnswer: currentQuestion.correctAnswer
          });
        });
    } else {
      // Some players got it right
      const winners = getWinners();
      generateHostQuip(currentQuestion.question, winners)
        .then(quip => {
          io.emit('roundComplete', { 
            winners,
            quip,
            scores: playerScores
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

// Helper function to get the winners
function getWinners() {
  const highestScore = Math.max(...Object.values(playerScores));
  const winners = Object.keys(playerScores).filter(
    (player) => playerScores[player] === highestScore
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