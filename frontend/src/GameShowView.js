import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

const GameShowView = ({ currentQuestion }) => {
  const [winners, setWinners] = useState([]);
  const [hostQuip, setHostQuip] = useState('');
  const [avatarUrls, setAvatarUrls] = useState({});
  const [welcomeQuip, setWelcomeQuip] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [finalScores, setFinalScores] = useState({});
  const [registeredPlayers, setRegisteredPlayers] = useState([]);

  useEffect(() => {
    const fetchWelcomeQuip = async () => {
      try {
        const response = await axios.get('/api/welcomeQuip');
        setWelcomeQuip(response.data.quip);
      } catch (error) {
        console.error('Error fetching welcome quip:', error);
      }
    };
    fetchWelcomeQuip();
  }, []);

  useEffect(() => {
    const socket = io();
    
    socket.on('gameStarted', () => {
      setGameStarted(true);
      setWelcomeQuip(''); // Clear welcome message
    });

    socket.on('newQuestion', () => {
      setWinners([]);
      setHostQuip('');
      setAvatarUrls({});
    });

    socket.on('roundComplete', async (data) => {
      console.log('Round complete data:', data); // Debug log
      
      if (!data.winner && !data.winners) return;

      // Handle winners array
      const winnersList = data.winners || 
        (Array.isArray(data.winner) ? data.winner : [data.winner]);

      if (winnersList.length > 0) {
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
        setAvatarUrls(avatars);
      }
    });

    socket.on('gameOver', (data) => {
      setGameOver(true);
      setWinners(Array.isArray(data.winner) ? data.winner : [data.winner]);
      setHostQuip(data.quip);
      setFinalScores(data.finalScores);
      setGameStarted(false);
    });

    socket.on('playerRegistered', (players) => {
      setRegisteredPlayers(players);
      generateWelcomeQuip(players).then(setWelcomeQuip);
    });

    return () => socket.close();
  }, []);

  const generateWelcomeQuip = async (players) => {
    try {
      const playerNames = players.map(player => player.githubHandle).join(', ');
      const prompt = `Welcome to the show ${playerNames}! Give a fun 70's welcome quip.`;
      const response = await axios.post('/api/generateQuip', { prompt });
      return response.data.quip;
    } catch (error) {
      console.error('Error generating welcome quip:', error);
      return "Welcome to the show!";
    }
  };

  return (
    <div className="game-show-container">
      <h1 className="game-show-header">Welcome to the 70's Quiz Show!</h1>
      
      {!gameStarted && (
        <div className="game-show-welcome">
          {registeredPlayers.length > 0 ? (
            <p>{welcomeQuip}</p>
          ) : (
            <p>Waiting for players to register...</p>
          )}
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
        </>
      )}

      {gameOver ? (
        <div className="game-show-winner-overlay">
          <div className="game-show-winner">
            <div className="winners-avatars">
              {winners.map((winner) => (
                <img 
                  key={winner}
                  src={avatarUrls[winner]} 
                  alt={`${winner}'s avatar`} 
                  className="winner-avatar"
                  onError={(e) => {
                    e.target.src = '/default-avatar.png';
                  }}
                />
              ))}
            </div>
            <h2>Game Over!</h2>
            <h3>
              {winners.length > 1 
                ? `It's a tie between ${winners.join(' and ')}!` 
                : `Final Winner: ${winners[0]}`}
            </h3>
            <p>{hostQuip}</p>
            <div className="final-scores">
              {Object.entries(finalScores)
                .sort(([,a], [,b]) => b - a)
                .map(([player, score]) => (
                  <div key={player} className="score-entry">
                    {player}: {score} points
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : (
        winners.length > 0 && (
          <div className="game-show-winner-overlay">
            <div className="game-show-winner">
              <div className="winners-avatars">
                {winners.map((winner) => (
                  <img 
                    key={winner}
                    src={avatarUrls[winner]} 
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
        )
      )}
    </div>
  );
};

export default GameShowView;