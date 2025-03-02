import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import PlayerStatus from './components/PlayerStatus.js';
import ResponseStatus from './components/ResponseStatus.js';
import { getErrorMessage, showErrorToast } from './utils/errorHandler.js';

const GameShowView = () => {
  const [winners, setWinners] = useState([]);
  const [hostQuip, setHostQuip] = useState('');
  const [avatarUrls, setAvatarUrls] = useState({});
  const [welcomeQuip, setWelcomeQuip] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [finalScores, setFinalScores] = useState({});
  const [registeredPlayers, setRegisteredPlayers] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [finalWinners, setFinalWinners] = useState([]);
  const [goodbyeQuip, setGoodbyeQuip] = useState('');
  const [introQuip, setIntroQuip] = useState('');
  const [responseStatus, setResponseStatus] = useState({});
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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

    const fetchInitialData = async () => {
      try {
        const [playersResponse, welcomeResponse] = await Promise.all([
          axios.get('/api/players'),
          axios.get('/api/welcomeQuip')
        ]);

        if (mounted) {
          setRegisteredPlayers(playersResponse.data);
          setWelcomeQuip(welcomeResponse.data.quip);
          setError(null);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        if (mounted) {
          setError(getErrorMessage(error));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchInitialData();

    const handleGameStarted = (data) => {
      if (!mounted) return;
      setGameStarted(true);
      setCurrentQuestion(data.currentQuestion);
      setIntroQuip(data.introQuip);
      setWelcomeQuip(data.welcomeQuip);
      setError(null);
    };

    const handleNewQuestion = (question) => {
      if (!mounted) return;
      setCurrentQuestion(question);
      setWinners([]);
      setHostQuip('');
      setAvatarUrls({});
      setResponseStatus({});
    };

    const handleRoundComplete = async (data) => {
      if (!mounted) return;
      
      try {
        if (!data.winners || data.winners.length === 0) {
          setWinners([]);
          setHostQuip(`${data.quip}\nThe correct answer was: ${data.correctAnswer}`);
          setAvatarUrls({});
        } else {
          const winnersList = Array.isArray(data.winners) ? data.winners : [data.winners];
          setWinners(winnersList);
          setHostQuip(data.quip || 'And the winner is...');

          // Fetch avatars
          const avatars = {};
          await Promise.all(
            winnersList.map(async (winner) => {
              if (!winner) return;
              try {
                const response = await fetch(`https://api.github.com/users/${winner}`);
                if (!response.ok) throw new Error('Avatar fetch failed');
                const userData = await response.json();
                avatars[winner] = userData.avatar_url;
              } catch (error) {
                console.error(`Error fetching avatar for ${winner}:`, error);
                avatars[winner] = '/default-avatar.png';
              }
            })
          );
          if (mounted) {
            setAvatarUrls(avatars);
          }
        }
      } catch (error) {
        console.error('Error handling round complete:', error);
        showErrorToast(getErrorMessage(error));
      }
    };

    const handleGameOver = async (data) => {
      if (!mounted) return;
      try {
        setGameOver(true);
        setFinalWinners(data.winners);
        setFinalScores(data.finalScores);
        setHostQuip(data.quip);

        const goodbyeResponse = await axios.get('/api/goodbyeQuip');
        if (mounted) {
          setGoodbyeQuip(goodbyeResponse.data.quip);
        }
      } catch (error) {
        console.error('Error handling game over:', error);
        if (mounted) {
          setGoodbyeQuip("That's all folks! See you next time!");
        }
      }
    };

    socket.on('gameStarted', handleGameStarted);
    socket.on('newQuestion', handleNewQuestion);
    socket.on('roundComplete', handleRoundComplete);
    socket.on('gameOver', handleGameOver);
    socket.on('playerRegistered', (players) => {
      if (mounted) {
        setRegisteredPlayers(players);
      }
    });

    socket.on('playerAnswered', (data) => {
      if (mounted) {
        setResponseStatus(prev => ({
          ...prev,
          [data.playerName]: true
        }));
      }
    });

    return () => {
      mounted = false;
      socket.disconnect();
    };
  }, []);

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
