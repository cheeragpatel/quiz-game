import React, { useState } from 'react';
import axios from 'axios';

const PlayerView = ({ currentQuestion }) => {
  const [selectedAnswer, setSelectedAnswer] = useState('');

  const handleAnswerChange = (e) => {
    setSelectedAnswer(e.target.value);
  };

  const submitAnswer = async () => {
    try {
      await axios.post('/api/submitAnswer', { answer: selectedAnswer });
      alert('Answer submitted!');
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  };

  return (
    <div className="game-show-container">
      <h1 className="game-show-header">Player View</h1>
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
          <button className="game-show-button" onClick={submitAnswer}>Submit Answer</button>
        </>
      ) : (
        <p>No question available</p>
      )}
    </div>
  );
};

export default PlayerView;