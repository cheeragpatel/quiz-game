import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import PlayerStatus from './components/PlayerStatus.js';
import ResponseStatus from './components/ResponseStatus.js';
import { getErrorMessage, showErrorToast } from './utils/errorHandler.js';

const GameShowView = ({ currentQuestion: propQuestion, gameStatus }) => {
  const [winners, setWinners] = useState([]);
  const [hostQuip, setHostQuip] = useState('');
  const [avatarUrls, setAvatarUrls] = useState({});
  const [welcomeQuip, setWelcomeQuip] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [finalScores, setFinalScores] = useState({});
  const [registeredPlayers, setRegisteredPlayers] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(propQuestion);
  const [finalWinners, setFinalWinners] = useState([]);
  const [goodbyeQuip, setGoodbyeQuip] = useState('');
  const [introQuip, setIntroQuip] = useState('');
  const [responseStatus, setResponseStatus] = useState({});
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Create a ref to store the socket connection
  const socketRef = useRef(null);

  // Function to fetch GitHub avatars
  const fetchGitHubAvatars = async (players) => {
    if (!Array.isArray(players) || players.length === 0) return;
    
    const newAvatarUrls = { ...avatarUrls };
    const fetchPromises = players
      .filter(player => player.githubHandle && !avatarUrls[player.githubHandle])
      .map(async (player) => {
        try {
          // GitHub API to get user avatar
          const response = await axios.get(`https://api.github.com/users/${player.githubHandle}`);
          if (response.data && response.data.avatar_url) {
            newAvatarUrls[player.githubHandle] = response.data.avatar_url;
          }
        } catch (error) {
          console.error(`Error fetching avatar for ${player.githubHandle}:`, error);
          // No need to throw - we'll just use the default avatar
        }
      });
    
    await Promise.allSettled(fetchPromises);
    setAvatarUrls(newAvatarUrls);
  };

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
      console.log('GameShow view connected to server');
    });

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
      setGameStarted(true);
      setGameOver(false);
      setCurrentQuestion(data.currentQuestion);
      setIntroQuip(data.introQuip);
      setWelcomeQuip(data.welcomeQuip);
      setResponseStatus({});
      setError(null);
    };

    const handleNewQuestion = (question) => {
      if (!mounted) return;
      setCurrentQuestion(question);
      setWinners([]);
      setHostQuip('');
      setResponseStatus({});
    };

    const handleRoundComplete = async (data) => {
      if (!mounted) return;
      
      try {
        if (!data.winner) {
          setWinners([]);
          setHostQuip(`${data.quip}\nThe correct answer was: ${data.correctAnswer}`);
        } else {
          const winnersList = Array.isArray(data.winner) ? data.winner : [data.winner];
          setWinners(winnersList);
          setHostQuip(data.quip);
          
          // Fetch avatars for winners immediately
          fetchGitHubAvatars(winnersList.map(w => ({ githubHandle: w })));
        }
      } catch (error) {
        console.error('Error handling round complete:', error);
      }
    };

    const handleGameOver = async (data) => {
      if (!mounted) return;
      try {
        setGameOver(true);
        setGameStarted(false);
        const winnersList = Array.isArray(data.winners) ? data.winners : [data.winners];
        setFinalWinners(winnersList);
        setFinalScores(data.finalScores);
        setHostQuip(data.goodbyeQuip || data.quip); // Ensure goodbyeQuip is used if available
        
        // Fetch avatars for final winners immediately
        fetchGitHubAvatars(winnersList.map(w => ({ githubHandle: w })));

        try {
          const goodbyeResponse = await axios.get('/api/goodbyeQuip');
          if (mounted) {
            setGoodbyeQuip(goodbyeResponse.data.quip);
          }
        } catch (error) {
          console.error('Error fetching goodbye quip:', error);
          if (mounted) {
            // Don't break the game flow for this error, just use a fallback
            setGoodbyeQuip("That's all folks! See you next time!");
          }
        }
      } catch (error) {
        console.error('Error handling game over:', error);
      }
    };

    const handlePlayerRegistered = (players) => {
      if (!mounted) return;
      setRegisteredPlayers(players);
      // Fetch avatars for new players
      fetchGitHubAvatars(players);
    };

    const handlePlayerAnswered = (data) => {
      if (!mounted) return;
      setResponseStatus(prev => ({
        ...prev,
        [data.playerName]: true
      }));
    };

    const handleReconnectState = (state) => {
      if (!mounted) return;
      setGameStarted(state.gameStarted);
      setCurrentQuestion(state.currentQuestion);
      setGameOver(!state.gameStarted && state.hasEnded);
      setFinalScores(state.playerScores || {});
      setRegisteredPlayers(state.registeredPlayers || []);
      
      // Fetch avatars for all players when reconnecting
      if (state.registeredPlayers && state.registeredPlayers.length > 0) {
        fetchGitHubAvatars(state.registeredPlayers);
      }
    };

    const fetchInitialData = async () => {
      try {
        const [playersResponse, welcomeResponse] = await Promise.all([
          axios.get('/api/players'),
          axios.get('/api/welcomeQuip')
        ]);

        if (mounted) {
          setRegisteredPlayers(playersResponse.data.players);
          setWelcomeQuip(welcomeResponse.data.quip);
          setError(null);
          
          // Fetch avatars for initial players
          fetchGitHubAvatars(playersResponse.data.players);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        if (mounted) {
          setError('Failed to load initial game data');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchInitialData();

    socket.on('gameStarted', handleGameStarted);
    socket.on('newQuestion', handleNewQuestion);
    socket.on('roundComplete', handleRoundComplete);
    socket.on('gameOver', handleGameOver);
    socket.on('playerRegistered', handlePlayerRegistered);
    socket.on('playerAnswered', handlePlayerAnswered);
    socket.on('reconnectState', handleReconnectState);

    return () => {
      mounted = false;
      socket.off('gameStarted', handleGameStarted);
      socket.off('newQuestion', handleNewQuestion);
      socket.off('roundComplete', handleRoundComplete);
      socket.off('gameOver', handleGameOver);
      socket.off('playerRegistered', handlePlayerRegistered);
      socket.off('playerAnswered', handlePlayerAnswered);
      socket.off('reconnectState', handleReconnectState);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Update from props
  useEffect(() => {
    setCurrentQuestion(propQuestion);
  }, [propQuestion]);

  useEffect(() => {
    if (gameStatus === 'started') {
      setGameStarted(true);
      setGameOver(false);
    } else if (gameStatus === 'ended') {
      setGameOver(true);
      setGameStarted(false);
    }
  }, [gameStatus]);

  // Effect to fetch avatars when winners change
  useEffect(() => {
    if (winners.length > 0) {
      fetchGitHubAvatars(winners.map(handle => ({ githubHandle: handle })));
    }
  }, [winners]);

  // Effect to fetch avatars when final winners change
  useEffect(() => {
    if (finalWinners.length > 0) {
      fetchGitHubAvatars(finalWinners.map(handle => ({ githubHandle: handle })));
    }
  }, [finalWinners]);

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="loading-container">
        <h2>Loading game show...</h2>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="game-show-container">
        <h1 className="game-show-header">Game Show Finale!</h1>
        <div className="champion-section">
          <h2>🏆 Champion{finalWinners.length > 1 ? 's' : ''} 🏆</h2>
          <div className="winners-display">
            {finalWinners.map((winner) => (
              <div key={winner} className="champion-display">
                <img
                  src={avatarUrls[winner] || '/default-avatar.png'}
                  alt={`${winner}'s avatar`}
                  className="champion-avatar"
                  onError={(e) => {
                    e.target.src = '/default-avatar.png';
                  }}
                />
                <h3>{winner}</h3>
              </div>
            ))}
          </div>
          <p className="host-quip">{hostQuip}</p>
          <div className="final-scores">
            <h3>Final Scores</h3>
            <ul className="scores-list">
              {Object.entries(finalScores)
                .sort(([,a], [,b]) => b - a)
                .map(([player, score]) => (
                  <li key={player}>
                    {player}: {score} points
                  </li>
                ))}
            </ul>
          </div>
          <div className="goodbye-message">
            <p>{goodbyeQuip}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-show-container">
      <h1 className="game-show-header">Welcome to Trivia Night!</h1>
      
      {!gameStarted && (
        <div className="game-show-welcome">
          {registeredPlayers.length > 0 ? (
            <p>{welcomeQuip}</p>
          ) : (
            <p>Waiting for players to register...</p>
          )}
        </div>
      )}

      {gameStarted && !currentQuestion && (
        <div className="game-show-welcome">
          <h2>{introQuip}</h2>
          <p>{welcomeQuip}</p>
        </div>
      )}

      {currentQuestion && (
        <>
          <h2 className="game-show-question">{currentQuestion.question}</h2>
          <ul className="game-show-choices">
            {currentQuestion.choices.map((choice, index) => (
              <li key={index}>{choice}</li>
            ))}
          </ul>
          {winners.length > 0 && (
            <div className="game-show-winner-overlay">
              <div className="game-show-winner">
                <div className="winners-avatars">
                  {winners.map((winner) => (
                    <img 
                      key={winner}
                      src={avatarUrls[winner] || '/default-avatar.png'}
                      alt={`${winner}'s avatar`}
                      className="winner-avatar"
                      onError={(e) => {
                        e.target.src = '/default-avatar.png';
                      }}
                    />
                  ))}
                </div>
                <h3>
                  {winners.length > 1 
                    ? `It's a tie between ${winners.join(' and ')}!`
                    : `Round Winner: ${winners[0]}`}
                </h3>
                <p>{hostQuip}</p>
              </div>
            </div>
          )}
        </>
      )}

      <PlayerStatus players={registeredPlayers} responseStatus={responseStatus} />
      <ResponseStatus players={registeredPlayers} responseStatus={responseStatus} />
    </div>
  );
};

export default GameShowView;
