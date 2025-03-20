import React, { useState, useEffect, useRef } from 'react';
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
  const [gameStarted, setGameStarted] = useState(false);
  const [hostQuip, setHostQuip] = useState('');
  const [finalScores, setFinalScores] = useState({});
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Create a ref to store the socket connection
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io('/', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000
    });
    
    // Store socket in ref so it can be accessed outside this effect
    socketRef.current = socket;

    let mounted = true;

    socket.on('connect', () => {
      console.log('Connected to server');
      if (playerName) {
        socket.emit('playerJoin', playerName);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      showErrorToast('Connection error. Trying to reconnect...');
    });

    const handleGameStarted = (data) => {
      if (!mounted) return;
      setGameStarted(true);
      setGameOver(false);
      setCurrentQuestion(data.currentQuestion);
    };

    const handleNewQuestion = (question) => {
      if (!mounted) return;
      setCurrentQuestion(question);
      setSelectedAnswer('');
      setHasAnswered(false);
    };

    const handleAnswerResult = (result) => {
      if (!mounted) return;
      if (result.success) {
        if (result.correct) {
          showErrorToast('Correct answer!');
          setScore(result.score || score);
        } else {
          showErrorToast('Wrong answer');
        }
      } else {
        showErrorToast(result.error || 'Failed to submit answer');
        setHasAnswered(false);
      }
    };

    const handleGameOver = (data) => {
      if (!mounted) return;
      setGameOver(true);
      setGameStarted(false);
      setHostQuip(data.quip);
      setFinalScores(data.finalScores);
    };

    const handleReconnectState = (state) => {
      if (!mounted) return;
      setCurrentQuestion(state.currentQuestion);
      setScore(state.playerScores[playerName] || 0);
      setHasAnswered(!!state.playerAnswers[playerName]);
      setGameStarted(state.gameStarted);
      setGameOver(!state.gameStarted && state.hasEnded);
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
    socket.on('answerResult', handleAnswerResult);
    socket.on('gameOver', handleGameOver);
    socket.on('reconnectState', handleReconnectState);

    return () => {
      mounted = false;
      socket.off('gameStarted', handleGameStarted);
      socket.off('newQuestion', handleNewQuestion);
      socket.off('answerResult', handleAnswerResult);
      socket.off('gameOver', handleGameOver);
      socket.off('reconnectState', handleReconnectState);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [playerName, score]);

  const submitAnswer = async () => {
    if (hasAnswered || !selectedAnswer || !socketRef.current) return;

    setIsLoading(true);
    try {
      socketRef.current.emit('submitAnswer', {
        playerName,
        answer: selectedAnswer
      });
      setHasAnswered(true);
    } catch (error) {
      console.error('Submit answer error:', error);
      showErrorToast('Failed to submit answer');
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

  if (!gameStarted && !gameOver) {
    return (
      <div className="waiting-container">
        <h2>Waiting for Game to Start...</h2>
        {isLoading && <div className="loading-spinner" />}
      </div>
    );
  }

  if (!currentQuestion && gameStarted) {
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
