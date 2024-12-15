import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

const PlayerView = ({ currentQuestion }) => {
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [score, setScore] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);

  // Get player name from session storage on mount
  useEffect(() => {
    const storedPlayer = sessionStorage.getItem('playerName');
    if (storedPlayer) {
      setPlayerName(storedPlayer);
    }
  }, []);

  // Reset hasAnswered when question changes
  useEffect(() => {
    setHasAnswered(false);
    setSelectedAnswer('');
  }, [currentQuestion]);

  // Listen for round completion to update score
  useEffect(() => {
    const socket = io();
    socket.on('roundComplete', (data) => {
      if (data.scores[playerName] !== undefined) {
        setScore(data.scores[playerName]);
      }
    });
    return () => socket.close();
  }, [playerName]);

  const handleAnswerChange = (e) => {
    setSelectedAnswer(e.target.value);
  };

  const submitAnswer = async () => {
    if (!hasAnswered && selectedAnswer) {
      try {
        await axios.post('/api/submitAnswer', { 
          player: playerName,
          answer: selectedAnswer 
        });
        setHasAnswered(true);
        alert('Answer submitted!');
      } catch (error) {
        console.error('Error submitting answer:', error);
      }
    }
  };

  return (
    <div className="game-show-container">
      <h1 className="game-show-header">Player View</h1>
      <div className="game-show-score">Score: {score}</div>
      {currentQuestion ? (
        <>
          <h2 className="game-show-question">{currentQuestion.question}</h2>
          <ul className="game-show-choices">
            {currentQuestion.choices.map((choice, index) => (
              <li key={index}>
                <label>
                  <input
                    type="radio"
                    name="answer"
                    value={choice}
                    onChange={handleAnswerChange}
                  />
                  {choice}
                </label>
              </li>
            ))}
          </ul>
          <button 
            className="game-show-button" 
            onClick={submitAnswer}
            disabled={!selectedAnswer || !playerName}
          >
            Submit Answer
          </button>
        </>
      ) : (
        <p>No question available</p>
      )}
    </div>
  );
};

export default PlayerView;