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
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('gameStarted', (data) => {
      setGameStatus('started');
      setCurrentQuestion(data.currentQuestion);
    });

    newSocket.on('newQuestion', (question) => {
      setCurrentQuestion(question);
    });

    return () => newSocket.close();
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

  useEffect(() => {
    const socket = io();
    socket.on('newQuestion', (question) => {
      setCurrentQuestion(question);
    });
    return () => socket.close();
  }, []);

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
            <GameShowView 
              currentQuestion={currentQuestion} 
            />
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
