import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import RegistrationForm from './RegistrationForm.js';
import GameMasterView from './GameMasterView.js';
import GameShowView from './GameShowView.js';
import PlayerView from './PlayerView.js';
import { ErrorBoundary } from './utils/errorHandler.js';

function App() {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [gameStatus, setGameStatus] = useState('not started');

  useEffect(() => {
    const socket = io();

    const handleGameStarted = (data) => {
      setGameStatus('started');
      setCurrentQuestion(data.currentQuestion);
    };

    const handleNewQuestion = (question) => {
      setCurrentQuestion(question);
    };

    const handleGameOver = (data) => {
      setGameStatus('ended');
      // Handle game over state
    };

    const handleReconnectState = (state) => {
      setGameStatus(state.gameStarted ? 'started' : 'not started');
      setCurrentQuestion(state.currentQuestion);
    };

    socket.on('gameStarted', handleGameStarted);
    socket.on('newQuestion', handleNewQuestion);
    socket.on('gameOver', handleGameOver);
    socket.on('reconnectState', handleReconnectState);

    return () => {
      socket.off('gameStarted', handleGameStarted);
      socket.off('newQuestion', handleNewQuestion);
      socket.off('gameOver', handleGameOver);
      socket.off('reconnectState', handleReconnectState);
      socket.close();
    };
  }, []);

  useEffect(() => {
    const fetchCurrentQuestion = async () => {
      try {
        const response = await axios.get('/api/currentQuestion');
        setCurrentQuestion(response.data);
      } catch (error) {
        console.error('Error fetching current question:', error);
      }
    };

    if (gameStatus === 'started') {
      fetchCurrentQuestion();
    }
  }, [gameStatus]);

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<RegistrationForm />} />
          <Route 
            path="/game-master" 
            element={
              <GameMasterView 
                setCurrentQuestion={setCurrentQuestion} 
                setGameStatus={setGameStatus} 
              />
            } 
          />
          <Route 
            path="/game-show" 
            element={
              <GameShowView />
            } 
          />
          <Route 
            path="/player" 
            element={
              <PlayerView 
                currentQuestion={currentQuestion} 
              />
            } 
          />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
