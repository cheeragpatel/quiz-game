import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import PlayerStatus from './components/PlayerStatus.js';
import ResponseStatus from './components/ResponseStatus.js';
import { getErrorMessage, showErrorToast } from './utils/errorHandler.js';

const GameMasterView = ({ setCurrentQuestion, setGameStatus, gameStatus }) => {
  const [numQuestions, setNumQuestions] = useState(10);
  const [topics, setTopics] = useState('');
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState({});
  const [winner, setWinner] = useState(null);
  const [hostQuip, setHostQuip] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [finalScores, setFinalScores] = useState({});
  const [responseStatus, setResponseStatus] = useState({});
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [retryTimeout, setRetryTimeout] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [allPlayersAnswered, setAllPlayersAnswered] = useState(false);

  const socket = useMemo(() => io(), []);

  useEffect(() => {
    return () => {
      socket.disconnect();
    };
  }, [socket]);

  useEffect(() => {
    let mounted = true;

    const fetchInitialData = async () => {
      try {
        const playersResponse = await axios.get('/api/players');
        if (mounted) {
          setPlayers(playersResponse.data?.players || []);
          setError(null);
        }
      } catch (error) {
        if (mounted) {
          setError(getErrorMessage(error));
          showErrorToast('Failed to load data');
        }
      }
    };

    fetchInitialData();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleRoundComplete = (data) => {
      setWinner(data.winner);
      setHostQuip(data.quip);
      setScores(data.scores);
      setAllPlayersAnswered(true);
      
      // Update question tracking if the server sent this info
      if (data.currentQuestionIndex !== undefined && data.totalQuestions !== undefined) {
        setCurrentQuestionIndex(data.currentQuestionIndex);
        setTotalQuestions(data.totalQuestions);
      }
      
      // If this is the last question, show a message that the game will end soon
      if (data.isLastQuestion) {
        showErrorToast('Last question completed - game will end automatically');
      }
    };

    const handleGameOver = (data) => {
      setGameOver(true);
      setWinner(data.winner);
      setHostQuip(data.quip);
      setFinalScores(data.finalScores);
      setGameStatus('ended');
    };

    const handlePlayerRegistered = (updatedPlayers) => {
      setPlayers(updatedPlayers || []);
    };

    const handlePlayerAnswered = ({ playerName }) => {
      setResponseStatus(prev => ({
        ...prev,
        [playerName]: true
      }));
    };

    const handleNewQuestion = (question) => {
      setResponseStatus({});
      setWinner(null);
      setHostQuip('');
      setAllPlayersAnswered(false);
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
    };

    socket.on('roundComplete', handleRoundComplete);
    socket.on('gameOver', handleGameOver);
    socket.on('playerRegistered', handlePlayerRegistered);
    socket.on('playerAnswered', handlePlayerAnswered);
    socket.on('newQuestion', handleNewQuestion);

    return () => {
      socket.off('roundComplete', handleRoundComplete);
      socket.off('gameOver', handleGameOver);
      socket.off('playerRegistered', handlePlayerRegistered);
      socket.off('playerAnswered', handlePlayerAnswered);
      socket.off('newQuestion', handleNewQuestion);
    };
  }, [setGameStatus, socket, currentQuestionIndex, totalQuestions]);

  const handleNumQuestionsChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (value > 0 && value <= 50) {
      setNumQuestions(value);
    }
  };

  const handleTopicsChange = (e) => {
    setTopics(e.target.value);
  };

  const startGame = async () => {
    if (!topics.trim()) {
      showErrorToast('Please enter at least one topic');
      return;
    }

    setIsLoading(true);
    try {
      const topicsArray = topics.split(',').filter(topic => topic.trim()).map(topic => topic.trim());
      if (topicsArray.length === 0) {
        throw new Error('Please enter at least one valid topic');
      }

      const response = await axios.post('/api/startGame', {
        numQuestions,
        topics: topicsArray,
      });
      setGameStatus('started');
      setCurrentQuestion(response.data.currentQuestion);
      setCurrentQuestionIndex(0);
      setTotalQuestions(numQuestions);
      setError(null);
    } catch (error) {
      console.error('Error starting game:', error);
      showErrorToast(getErrorMessage(error));
      setError('Failed to start game');
    } finally {
      setIsLoading(false);
    }
  };

  const endGame = async () => {
    setIsLoading(true);
    try {
      await axios.post('/api/endGame');
      setGameStatus('ended');
      setError(null);
    } catch (error) {
      console.error('Error ending game:', error);
      showErrorToast(getErrorMessage(error));
      setError('Failed to end game');
    } finally {
      setIsLoading(false);
    }
  };

  const nextQuestion = async () => {
    setIsLoading(true);
    try {
      // Clear any existing retry timeout
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        setRetryTimeout(null);
      }
      
      const response = await axios.post('/api/nextQuestion');
      setCurrentQuestion(response.data);
      setWinner(null);
      setHostQuip('');
      setError(null);
      setRetryCount(0);
    } catch (error) {
      console.error('Error fetching next question:', error);
      
      // Handle rate limiting (429 Too Many Requests)
      if (error.response && error.response.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 2;
        const retryMs = parseInt(retryAfter, 10) * 1000 || 2000;
        
        showErrorToast(`Rate limited. Automatically retrying in ${retryAfter} seconds...`);
        setError(`Rate limited. Waiting ${retryAfter} seconds before retrying automatically... (Attempt ${retryCount + 1})`);
        
        // Set up automatic retry with exponential backoff
        const timeoutId = setTimeout(() => {
          setRetryCount(prev => prev + 1);
          nextQuestion();
        }, retryMs);
        
        setRetryTimeout(timeoutId);
      }
      // Check if we've reached the end of available questions
      else if (error.response && error.response.data && 
          error.response.data.error && 
          error.response.data.error.includes('No more questions available')) {
        // Handle end of questions gracefully - automatically end the game
        try {
          showErrorToast('All questions completed - ending the game');
          await endGame();
        } catch (endGameError) {
          console.error('Error ending game:', endGameError);
          showErrorToast(getErrorMessage(endGameError));
          setError('Failed to end game after completing all questions');
        }
      } else {
        showErrorToast(getErrorMessage(error));
        setError('Failed to get next question');
      }
    } finally {
      if (!retryTimeout) {
        setIsLoading(false);
      }
    }
  };

  // Make sure to clean up any timeouts when unmounting
  useEffect(() => {
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [retryTimeout]);

  const newGame = () => {
    // Clear any existing retry timeout
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      setRetryTimeout(null);
    }
    setRetryCount(0);
    
    setGameOver(false);
    setWinner(null);
    setHostQuip('');
    setScores({});
    setFinalScores({});
    setResponseStatus({});
    setGameStatus('not started');
    setError(null);
  };

  const resetGame = async () => {
    // Clear any existing retry timeout
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      setRetryTimeout(null);
    }
    setRetryCount(0);
    
    setIsLoading(true);
    try {
      await axios.post('/api/resetGame');
      newGame();
    } catch (error) {
      console.error('Error resetting game:', error);
      showErrorToast(getErrorMessage(error));
      setError('Failed to reset game');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPlayersList = () => {
    if (!Array.isArray(players) || players.length === 0) {
      return <p>No players registered yet</p>;
    }

    return (
      <ul className="game-show-choices">
        {players.map((player) => (
          <li key={player.githubHandle || player.id || Math.random().toString()}>
            {player.githubHandle}: {scores[player.githubHandle] || 0} points
          </li>
        ))}
      </ul>
    );
  };

  const renderFinalScores = () => {
    const scoreEntries = Object.entries(finalScores || {});
    if (scoreEntries.length === 0) {
      return <p>No scores available</p>;
    }

    return (
      <ul className="game-show-choices">
        {scoreEntries
          .sort(([,a], [,b]) => b - a)
          .map(([player, score]) => (
            <li key={player}>{player}: {score} points</li>
          ))}
      </ul>
    );
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

  if (gameStatus === 'started') {
    return (
      <div>
        <h2>Game in Progress</h2>
        <div className="game-progress">
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </div>
        <ResponseStatus players={players || []} responseStatus={responseStatus || {}} />
        <PlayerStatus players={players || []} responseStatus={responseStatus || {}} />

        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner" />
          </div>
        )}

        <div className="game-controls">
          <button 
            className="game-show-button" 
            onClick={nextQuestion}
            disabled={isLoading || (currentQuestionIndex >= totalQuestions - 1 && allPlayersAnswered)}
          >
            {isLoading ? 'Loading...' : 
              (currentQuestionIndex >= totalQuestions - 1 && allPlayersAnswered) ? 
              'Final Question Complete' : 'Next Question'}
          </button>
          <button 
            className="game-show-button" 
            onClick={endGame}
            disabled={isLoading}
          >
            {isLoading ? 'Ending...' : 'End Game'}
          </button>
        </div>

        {winner && !gameOver && (
          <div className="game-show-winner">
            <h3>Round Winner: {winner}</h3>
            <p>{hostQuip}</p>
            {currentQuestionIndex >= totalQuestions - 1 && allPlayersAnswered && (
              <p className="ending-notice">Game will end automatically in a few moments...</p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="game-show-container">
        <div className="game-show-winner">
          <h2>Game Over!</h2>
          <h3>Final Winner: {winner}</h3>
          <p>{hostQuip}</p>
          <div className="final-scores">
            <h4>Final Scores:</h4>
            {renderFinalScores()}
          </div>
          <button 
            className="game-show-button new-game-button" 
            onClick={newGame}
            disabled={isLoading}
          >
            Start New Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>Game Master View</h1>
      
      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
        </div>
      ) : (
        <>
          <div className="game-show-container">
            <h2>Players and Scores</h2>
            {renderPlayersList()}
          </div>

          <div className="game-controls">
            <div className="control-group">
              <label>
                Number of Questions:
                <input
                  type="number"
                  value={numQuestions}
                  onChange={handleNumQuestionsChange}
                  min="1"
                  max="50"
                  className="game-input"
                />
              </label>
            </div>
            <div className="control-group">
              <label>
                Topics (comma separated):
                <input
                  type="text"
                  value={topics}
                  onChange={handleTopicsChange}
                  placeholder="e.g., science, history"
                  className="game-input"
                />
              </label>
            </div>
            <button 
              className="game-show-button"
              onClick={startGame}
              disabled={isLoading || !topics.trim()}
            >
              {isLoading ? 'Starting...' : 'Start Game'}
            </button>
            <button
              className="game-show-button reset-button"
              onClick={resetGame}
              disabled={isLoading}
            >
              Reset Game
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default GameMasterView;
