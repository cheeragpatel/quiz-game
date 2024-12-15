const express = require('express');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { generateQuestion, fetchQuestions } = require('./questionGenerator');
const { generateHostQuip, hostGame } = require('./virtualHost');

const app = express();
const port = process.env.PORT || 3001;
const httpServer = createServer(app);
const io = new Server(httpServer);

let gameStarted = false;
let gameTopics = [];
let currentQuestion = null;
let playerAnswers = {};
let registeredPlayers = [];
let playerScores = {};
let currentQuestionNumber = 0;
let totalQuestions = 10; // Default value

app.use(express.json());

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, '../frontend/build')));

app.post('/api/startGame', async (req, res) => {
  const { numQuestions, topics } = req.body;
  gameStarted = true;
  gameTopics = topics;
  totalQuestions = numQuestions;
  currentQuestionNumber = 0;
  playerScores = {}; // Reset scores when game starts
  try {
    currentQuestion = await generateQuestion(gameTopics[0]);
    io.emit('gameStarted', { currentQuestion }); // Broadcast to all clients
    res.send({ message: 'Game started', numQuestions, topics, currentQuestion });
  } catch (error) {
    res.status(500).send({ error: 'Failed to generate the first question' });
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

  currentQuestionNumber++;

  if (currentQuestionNumber >= totalQuestions) {
    const finalWinners = getWinners();
    const gameOverQuip = await generateHostQuip('game over', finalWinners);
    
    io.emit('gameOver', {
      winner: finalWinners,
      quip: gameOverQuip,
      finalScores: playerScores
    });

    gameStarted = false;
    return res.json({ gameOver: true });
  }

  try {
    // Reset player answers for the new round
    playerAnswers = {};
    
    // Generate new question
    currentQuestion = await generateQuestion(gameTopics[0]);
    
    // Broadcast new question to all clients
    io.emit('newQuestion', currentQuestion);
    
    res.json(currentQuestion);
  } catch (error) {
    console.error('Error generating next question:', error);
    res.status(500).send({ error: 'Failed to generate the next question' });
  }
});

app.get('/api/currentQuestion', async (req, res) => {
  if (!gameStarted) {
    return res.status(400).send({ error: 'Game has not started yet' });
  }
  try {
    res.send(currentQuestion);
  } catch (error) {
    res.status(500).send({ error: 'Failed to get current question' });
  }
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
  const { player, answer } = req.body;
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
    const winners = getWinners(); // Use getWinners instead of getWinner
    generateHostQuip(currentQuestion.question, winners)
      .then(quip => {
        io.emit('roundComplete', { 
          winners,
          quip,
          scores: playerScores
        });
      });
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

function getWinner() {
  let highestScore = 0;
  let winner = '';
  
  Object.entries(playerScores).forEach(([player, score]) => {
    if (score > highestScore) {
      highestScore = score;
      winner = player;
    }
  });
  
  return winner;
}

function getWinners() {
  let highestScore = 0;
  let winners = [];
  
  // Find highest score
  Object.entries(playerScores).forEach(([player, score]) => {
    if (score > highestScore) {
      highestScore = score;
      winners = [player];
    } else if (score === highestScore) {
      winners.push(player);
    }
  });
  
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