import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { getErrorMessage, showErrorToast } from './utils/errorHandler.js';

const PlayerView = () => {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [score, setScore] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [hostQuip, setHostQuip] = useState('');
  const [finalScores, setFinalScores] = useState({});
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const socket = io();
    let mounted = true;

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      showErrorToast('Connection error. Trying to reconnect...');
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      showErrorToast(getErrorMessage(error));
    });

    const handleGameStarted = (data) => {
      if (!mounted) return;
      setCurrentQuestion(data.currentQuestion);
      setHasAnswered(false);
      setSelectedAnswer('');
      setScore(0);
      setError(null);
    };

    const handleNewQuestion = (question) => {
      if (!mounted) return;
      setCurrentQuestion(question);
      setHasAnswered(false);
      setSelectedAnswer('');
      setError(null);
    };

    const handleScoreUpdate = (data) => {
      if (!mounted || data.playerName !== playerName) return;
      setScore(data.score);
      if (data.correct) {
        showErrorToast('Correct answer!');
      } else {
        showErrorToast('Wrong answer.');
      }
    };

    const handleGameOver = (data) => {
      if (!mounted) return;
      setGameOver(true);
      setHostQuip(data.quip);
      setFinalScores(data.finalScores);
    };

    const handleReconnectState = (state) => {
      if (!mounted) return;
      setCurrentQuestion(state.currentQuestion);
      setScore(state.playerScores[playerName] || 0);
      setHasAnswered(!!state.playerAnswers[playerName]);
      setGameOver(!state.gameStarted);
    };

    const initializePlayer = async () => {
      try {
        const storedPlayer = sessionStorage.getItem('playerName');
        if (storedPlayer) {
          setPlayerName(storedPlayer);
        } else {
          const name = prompt('Enter your GitHub Handle:');
          if (!name) {
            throw new Error('Player name is required');
          }
          setPlayerName(name);
          sessionStorage.setItem('playerName', name);
          await axios.post('/api/register', { githubHandle: name });
        }
      } catch (error) {
        console.error('Player initialization error:', error);
        showErrorToast(getErrorMessage(error));
        setError('Failed to initialize player');
      }
    };

    initializePlayer();

    socket.on('gameStarted', handleGameStarted);
    socket.on('newQuestion', handleNewQuestion);
    socket.on('scoreUpdate', handleScoreUpdate);
    socket.on('gameOver', handleGameOver);
    socket.on('reconnectState', handleReconnectState);

    return () => {
      mounted = false;
      socket.off('gameStarted', handleGameStarted);
      socket.off('newQuestion', handleNewQuestion);
      socket.off('scoreUpdate', handleScoreUpdate);
      socket.off('gameOver', handleGameOver);
      socket.off('reconnectState', handleReconnectState);
      socket.disconnect();
    };
  }, [playerName]);

  const submitAnswer = async () => {
    if (hasAnswered || !selectedAnswer) return;

    setIsLoading(true);
    try {
      const response = await axios.post('/api/submitAnswer', {
        playerName,
        answer: selectedAnswer
      });

      if (response.data.success) {
        setHasAnswered(true);
      } else {
        throw new Error('Failed to submit answer');
      }
    } catch (error) {
      console.error('Submit answer error:', error);
      showErrorToast(getErrorMessage(error));
      setError('Failed to submit answer');
      setHasAnswered(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!currentQuestion && !gameOver) {
    return (
      <div className="loading-container">
        <h2>Waiting for the next question...</h2>
        {isLoading && <div className="loading-spinner" />}
      </div>
    );
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
          <ul className="final-scores-list">
            {Object.entries(finalScores)
              .sort(([,a], [,b]) => b - a)
              .map(([player, scoreValue]) => (
                <li key={player} className={player === playerName ? 'current-player' : ''}>
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
              disabled={hasAnswered || isLoading}
            >
              {choice}
            </button>
          </li>
        ))}
      </ul>
      <button
        className="game-show-button submit-button"
        onClick={submitAnswer}
        disabled={hasAnswered || !selectedAnswer || isLoading}
      >
        {isLoading ? 'Submitting...' : 'Submit Answer'}
      </button>
    </div>
  );
};

export default PlayerView;
