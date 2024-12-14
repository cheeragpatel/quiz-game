import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import RegistrationForm from './RegistrationForm';
import GameMasterView from './GameMasterView';
import GameShowView from './GameShowView';
import PlayerView from './PlayerView';
import './GameShowTheme.css';
import axios from 'axios';

function App() {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [gameStatus, setGameStatus] = useState('not started');

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
        <Route path="/game-master" element={<GameMasterView setCurrentQuestion={setCurrentQuestion} setGameStatus={setGameStatus} />} />
        <Route path="/game-show" element={<GameShowView currentQuestion={currentQuestion} />} />
        <Route path="/player" element={<PlayerView currentQuestion={currentQuestion} />} />
      </Routes>
    </Router>
  );
}

export default App;
