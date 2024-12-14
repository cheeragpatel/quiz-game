const express = require('express');
const path = require('path');
const { generateQuestion, fetchQuestions } = require('./questionGenerator');
const { generateHostQuip, hostGame } = require('./virtualHost');

const app = express();
const port = process.env.PORT || 3001;

let gameStarted = false;
let gameTopics = [];
let currentQuestion = null;
let playerAnswers = {};

app.use(express.json());

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, '../frontend/build')));

app.post('/api/startGame', async (req, res) => {
  const { numQuestions, topics } = req.body;
  gameStarted = true;
  gameTopics = topics;
  try {
    currentQuestion = await generateQuestion(gameTopics[0]);
    res.send({ message: 'Game started', numQuestions, topics, currentQuestion });
  } catch (error) {
    res.status(500).send({ error: 'Failed to generate the first question' });
  }
});

app.post('/api/endGame', (req, res) => {
  gameStarted = false;
  gameTopics = [];
  currentQuestion = null;
  playerAnswers = {};
  res.send({ message: 'Game ended' });
});

app.post('/api/nextQuestion', async (req, res) => {
  if (!gameStarted) {
    return res.status(400).send({ error: 'Game has not started yet' });
  }
  try {
    currentQuestion = await generateQuestion(gameTopics[0]);
    res.send(currentQuestion);
  } catch (error) {
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

app.post('/api/register', (req, res) => {
  const { githubHandle } = req.body;
  // Logic to register the player
  res.send({ message: 'Player registered', githubHandle });
});

app.post('/api/submitAnswer', (req, res) => {
  const { answer } = req.body;
  // Logic to handle answer submission
  res.send({ message: 'Answer submitted', answer });
});

// All other GET requests not handled before will return the React frontend app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});