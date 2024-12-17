import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import RegistrationForm from './RegistrationForm';
import GameMasterView from './GameMasterView';
import GameShowView from './GameShowView';
import PlayerView from './PlayerView';

function App() {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [gameStatus, setGameStatus] = useState('not started');

  useEffect(() => {
    const socket = io();

    socket.on('gameStarted', (data) => {
      setGameStatus('started');
      setCurrentQuestion(data.currentQuestion);
    });

    socket.on('newQuestion', (question) => {
      setCurrentQuestion(question);
    });

    socket.on('gameOver', (data) => {
      setGameStatus('ended');
      // Handle game over state
    });

    return () => socket.close();
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
  );
}

export default App;
