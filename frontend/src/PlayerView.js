import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

const PlayerView = () => {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [score, setScore] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [hostQuip, setHostQuip] = useState('');
  const [finalScores, setFinalScores] = useState({});

  useEffect(() => {
    const socket = io();

    const handleGameStarted = (data) => {
      setCurrentQuestion(data.currentQuestion);
      setHasAnswered(false);
      setSelectedAnswer('');
      setScore(0);
    };

    const handleNewQuestion = (question) => {
      setCurrentQuestion(question);
      setHasAnswered(false);
      setSelectedAnswer('');
    };

    const handleScoreUpdate = (data) => {
      if (data.playerName === playerName) {
        setScore(data.score);
        if (data.correct) {
          alert('Correct answer!');
        } else {
          alert('Wrong answer.');
        }
      }
    };

    const handleGameOver = (data) => {
      setGameOver(true);
      setHostQuip(data.quip);
      setFinalScores(data.finalScores);
    };

    const handleReconnectState = (state) => {
      setCurrentQuestion(state.currentQuestion);
      setScore(state.playerScores[playerName] || 0);
      setHasAnswered(!!state.playerAnswers[playerName]);
      setGameOver(!state.gameStarted);
    };

    const storedPlayer = sessionStorage.getItem('playerName');
    if (storedPlayer) {
      setPlayerName(storedPlayer);
    } else {
      const name = prompt('Enter your GitHub Handle:');
      if (name) {
        setPlayerName(name);
        sessionStorage.setItem('playerName', name);
        axios.post('/api/register', { githubHandle: name }).catch(err => console.error(err));
      }
    }

    socket.on('gameStarted', handleGameStarted);
    socket.on('newQuestion', handleNewQuestion);
    socket.on('scoreUpdate', handleScoreUpdate);
    socket.on('gameOver', handleGameOver);
    socket.on('reconnectState', handleReconnectState);

    return () => {
      socket.off('gameStarted', handleGameStarted);
      socket.off('newQuestion', handleNewQuestion);
      socket.off('scoreUpdate', handleScoreUpdate);
      socket.off('gameOver', handleGameOver);
      socket.off('reconnectState', handleReconnectState);
      socket.disconnect();
    };
  }, [playerName]);

  const submitAnswer = async () => {
    if (hasAnswered || !selectedAnswer) {
      return;
    }

    try {
      const response = await axios.post('/api/submitAnswer', {
        playerName,
        answer: selectedAnswer
      });

      if (response.data.success) {
        setHasAnswered(true);
      } else {
        alert('Failed to submit answer. Please try again.');
      }
    } catch (error) {
      alert('Failed to submit answer. Please try again.');
      setHasAnswered(false);
    }
  };

  if (!currentQuestion && !gameOver) {
    return <div>Waiting for the next question...</div>;
  }

  if (gameOver) {
    return (
      <div className="game-show-container">
        <h1 className="game-show-header">Player View</h1>
        <div className="game-show-score">Score: {score}</div>
        <div className="game-show-winner">
          <h3>Game Over!</h3>
          <p>{hostQuip}</p>
          <h3>Final Scores:</h3>
          <ul>
            {Object.entries(finalScores).map(([player, scoreValue]) => (
              <li key={player}>
                {player}: {scoreValue}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="game-show-container">
      <h1 className="game-show-header">Player View</h1>
      <div className="game-show-score">Score: {score}</div>
      <h2 className="game-show-question">{currentQuestion.question}</h2>
      <ul className="game-show-choices">
        {currentQuestion.choices.map((choice, index) => (
          <li key={index}>
            <button
              className={`game-show-button ${selectedAnswer === choice ? 'selected' : ''}`}
              onClick={() => setSelectedAnswer(choice)}
              disabled={hasAnswered}
            >
              {choice}
            </button>
          </li>
        ))}
      </ul>
      <button
        className="game-show-button"
        onClick={submitAnswer}
        disabled={hasAnswered || !selectedAnswer}
      >
        Submit Answer
      </button>
    </div>
  );
};

export default PlayerView;
