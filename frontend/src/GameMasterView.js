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
  const [isLoading, setIsLoading] = useState(true);
  const [instanceId, setInstanceId] = useState(null);
  const [activeInstances, setActiveInstances] = useState([]);

  const socket = useMemo(() => io(), []);

  useEffect(() => {
    return () => {
      socket.disconnect();
    };
  }, [socket]);

  useEffect(() => {
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      showErrorToast('Connection error. Trying to reconnect...');
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      showErrorToast(getErrorMessage(error));
    });

    return () => {
      socket.off('connect_error');
      socket.off('error');
    };
  }, [socket]);

  useEffect(() => {
    let mounted = true;

    const fetchInitialData = async () => {
      try {
        const [playersResponse, instancesResponse] = await Promise.all([
          axios.get('/api/players'),
          axios.get('/api/gameInstances')
        ]);
        
        if (mounted) {
          setPlayers(playersResponse.data?.players || []);
          setActiveInstances(instancesResponse.data?.instances || []);
          setError(null);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        if (mounted) {
          setError(getErrorMessage(error));
          showErrorToast('Failed to load data');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchInitialData();
    
    const handleInstanceUpdate = (instances) => {
      if (mounted) {
        setActiveInstances(instances || []);
      }
    };

    socket.on('gameInstancesUpdated', handleInstanceUpdate);

    return () => {
      mounted = false;
      socket.off('gameInstancesUpdated', handleInstanceUpdate);
    };
  }, [socket]);

  useEffect(() => {
    const handleRoundComplete = (data) => {
      setWinner(data.winner);
      setHostQuip(data.quip);
      setScores(data.scores);
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

    const handleNewQuestion = () => {
      setResponseStatus({});
      setWinner(null);
      setHostQuip('');
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
  }, [setGameStatus, socket, setWinner, setHostQuip, setScores, setGameOver, setFinalScores, setPlayers, setResponseStatus]);

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
      const response = await axios.post('/api/nextQuestion');
      setCurrentQuestion(response.data);
      setWinner(null);
      setHostQuip('');
      setError(null);
    } catch (error) {
      console.error('Error fetching next question:', error);
      showErrorToast(getErrorMessage(error));
      setError('Failed to get next question');
    } finally {
      setIsLoading(false);
    }
  };

  const newGame = () => {
    setGameOver(false);
    setWinner(null);
    setHostQuip('');
    setScores({});
    setFinalScores({});
    setResponseStatus({});
    setGameStatus('not started');
    setError(null);
  };

  const createNewInstance = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post('/api/createGameInstance');
      setInstanceId(response.data.instanceId);
      setError(null);
    } catch (error) {
      console.error('Error creating game instance:', error);
      showErrorToast(getErrorMessage(error));
      setError('Failed to create game instance');
    } finally {
      setIsLoading(false);
    }
  };

  const switchInstance = async (id) => {
    setIsLoading(true);
    try {
      const response = await axios.post('/api/switchGameInstance', { instanceId: id });
      setInstanceId(id);
      
      // Update the game state based on the response
      const gameState = response.data || {};
      const gameStarted = gameState.gameStarted || false;
      
      // Set game status based on game state
      setGameStatus(gameStarted ? 'started' : 'not started');
      
      // Only update current question if the game is started and there is a question
      if (gameStarted && gameState.currentQuestion) {
        setCurrentQuestion(gameState.currentQuestion);
      } else {
        // Reset question if game is not started
        setCurrentQuestion(null);
      }
      
      // Ensure scores and players are properly handled, using fallbacks for null values
      setScores(gameState.scores || {});
      setPlayers(gameState.players || []);
      
      // Reset all UI state to ensure consistency when switching instances
      setResponseStatus({});
      setWinner(null);
      setHostQuip('');
      setGameOver(false);
      setFinalScores({});
      setError(null);
      
      console.log(`Successfully switched to game instance: ${id}`);
    } catch (error) {
      console.error('Error switching game instance:', error);
      showErrorToast(getErrorMessage(error));
      setError('Failed to switch game instance');
      
      // Reset to safe state when error occurs
      setGameStatus('not started');
      setCurrentQuestion(null);
      setScores({});
      setPlayers([]);
      setResponseStatus({});
      setWinner(null);
      setHostQuip('');
      setGameOver(false);
      setFinalScores({});
    } finally {
      setIsLoading(false);
    }
  };

  const resetGameState = async () => {
    setIsLoading(true);
    try {
      await axios.post('/api/resetGameState', { instanceId });
      setGameStatus('not started');
      setCurrentQuestion(null);
      setScores({});
      setPlayers([]);
      setWinner(null);
      setHostQuip('');
      setGameOver(false);
      setFinalScores({});
      setResponseStatus({});
      setError(null);
    } catch (error) {
      console.error('Error resetting game state:', error);
      showErrorToast(getErrorMessage(error));
      setError('Failed to reset game state');
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

  const renderInstanceButtons = () => {
    if (!Array.isArray(activeInstances) || activeInstances.length === 0) {
      return <p>No instances available</p>;
    }

    return (
      <div className="instance-buttons">
        {activeInstances.map((instance) => (
          <button
            key={instance.id}
            className={`game-show-button ${instance.id === instanceId ? 'selected' : ''}`}
            onClick={() => switchInstance(instance.id)}
            disabled={isLoading}
          >
            {instance.id}
            {instance.gameStarted ? ' (Active)' : ' (Not Started)'}
          </button>
        ))}
      </div>
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
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Next Question'}
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

  const renderInstanceControls = () => (
    <div className="instance-controls">
      <h3>Game Instances</h3>
      <button
        className="game-show-button"
        onClick={createNewInstance}
        disabled={isLoading}
      >
        Create New Instance
      </button>
      
      {activeInstances?.length > 0 && (
        <div className="instance-list">
          <h4>Switch to Instance:</h4>
          {renderInstanceButtons()}
        </div>
      )}
      
      {instanceId && (
        <button
          className="game-show-button reset-button"
          onClick={resetGameState}
          disabled={isLoading}
        >
          Reset Current Instance
        </button>
      )}
    </div>
  );

  return (
    <div>
      <h1>Game Master View</h1>
      
      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
        </div>
      ) : (
        <>
          {renderInstanceControls()}
          
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
              disabled={isLoading || !topics.trim() || !instanceId}
            >
              {isLoading ? 'Starting...' : 'Start Game'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default GameMasterView;
