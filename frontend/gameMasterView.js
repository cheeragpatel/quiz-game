import React, { useState } from 'react';
import axios from 'axios';

const GameMasterView = () => {
  const [numQuestions, setNumQuestions] = useState(10);
  const [gameStatus, setGameStatus] = useState('not started');

  const handleNumQuestionsChange = (e) => {
    setNumQuestions(e.target.value);
  };

  const startGame = async () => {
    try {
      await axios.post('/api/startGame', { numQuestions });
      setGameStatus('started');
    } catch (error) {
      console.error('Error starting game:', error);
    }
  };

  const endGame = async () => {
    try {
      await axios.post('/api/endGame');
      setGameStatus('ended');
    } catch (error) {
      console.error('Error ending game:', error);
    }
  };

  const nextQuestion = async () => {
    try {
      await axios.post('/api/nextQuestion');
    } catch (error) {
      console.error('Error moving to next question:', error);
    }
  };

  return (
    <div>
      <h2>Game Master View</h2>
      <div>
        <label>
          Number of Questions:
          <input
            type="number"
            value={numQuestions}
            onChange={handleNumQuestionsChange}
            min="1"
          />
        </label>
      </div>
      <div>
        <button onClick={startGame}>Start Game</button>
        <button onClick={endGame}>End Game</button>
        <button onClick={nextQuestion}>Next Question</button>
      </div>
      <div>
        <p>Game Status: {gameStatus}</p>
      </div>
    </div>
  );
};

export default GameMasterView;
