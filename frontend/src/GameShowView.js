import React from 'react';

const GameShowView = ({ currentQuestion }) => {
  return (
    <div className="game-show-container">
      <h1 className="game-show-header">Welcome to the 70's Quiz Show!</h1>
      {currentQuestion ? (
        <>
          <h2 className="game-show-question">{currentQuestion.question}</h2>
          <ul className="game-show-choices">
            {currentQuestion.choices.map((choice, index) => (
              <li key={index}>{choice}</li>
            ))}
          </ul>
        </>
      ) : (
        <p>No question available</p>
      )}
    </div>
  );
};

export default GameShowView;