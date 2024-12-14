import React, { useState } from 'react';
import axios from 'axios';

const GameMasterView = ({ setCurrentQuestion, setGameStatus }) => {
  const [numQuestions, setNumQuestions] = useState(10);
  const [topics, setTopics] = useState('');

  const handleNumQuestionsChange = (e) => {
    setNumQuestions(e.target.value);
  };

  const handleTopicsChange = (e) => {
    setTopics(e.target.value);
  };

  const startGame = async () => {
    try {
      const response = await axios.post('/api/startGame', {
        numQuestions,
        topics: topics.split(',').map((topic) => topic.trim()),
      });
      setGameStatus('started');
      setCurrentQuestion(response.data.currentQuestion);
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
      const response = await axios.post('/api/nextQuestion');
      setCurrentQuestion(response.data);
    } catch (error) {
      console.error('Error fetching next question:', error);
    }
  };

  return (
    <div>
      <h1>Game Master View</h1>
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
        <label>
          Topics (comma separated):
          <input
            type="text"
            value={topics}
            onChange={handleTopicsChange}
            placeholder="e.g., science, history"
          />
        </label>
      </div>
      <div>
        <button className="game-show-button" onClick={startGame}>Start Game</button>
        <button className="game-show-button" onClick={endGame}>End Game</button>
        <button className="game-show-button" onClick={nextQuestion}>Next Question</button>
      </div>
    </div>
  );
};

export default GameMasterView;