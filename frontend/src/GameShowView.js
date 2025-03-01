import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import PlayerStatus from './components/PlayerStatus';
import ResponseStatus from './components/ResponseStatus';

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

  // Fetch initial players when component mounts
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await axios.get('/api/players');
        setRegisteredPlayers(response.data);
        if (response.data.length > 0) {
          generateWelcomeQuip(response.data).then(setWelcomeQuip);
        }
      } catch (error) {
        console.error('Error fetching players:', error);
      }
    };
    fetchPlayers();
  }, []);

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

    // Listen for the 'gameStarted' event
    socket.on('gameStarted', (data) => {
      setGameStarted(true);
      setCurrentQuestion(data.currentQuestion);
      setIntroQuip(data.introQuip);
      setWelcomeQuip(data.welcomeQuip);
    });

    socket.on('newQuestion', (question) => {
      setCurrentQuestion(question);
      setWinners([]);
      setHostQuip('');
      setAvatarUrls({});
      setResponseStatus({});
    });

    socket.on('roundComplete', async (data) => {
      console.log('Round complete data:', data);
      
      if (data.winners && data.winners.length === 0) {
        // No winners case
        setWinners([]);
        setHostQuip(`${data.quip}\nThe correct answer was: ${data.correctAnswer}`);
        setAvatarUrls({});
      } else {
        // Normal winners case
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
      }
    });

    socket.on('gameOver', async (data) => {
      setGameOver(true);
      setFinalWinners(data.winners);
      setFinalScores(data.finalScores);
      setHostQuip(data.quip);
      
      try {
        // Get goodbye quip from virtual host
        const goodbyeQuip = await axios.get('/api/goodbyeQuip');
        setGoodbyeQuip(goodbyeQuip.data.quip);
      } catch (error) {
        console.error('Error fetching goodbye quip:', error);
        setGoodbyeQuip("That's all folks! See you next time!");
      }
      
      // Fetch avatars...
    });

    socket.on('playerRegistered', (players) => {
      setRegisteredPlayers(players);
      generateWelcomeQuip(players).then(setWelcomeQuip);
    });

    socket.on('playerAnswered', (data) => {
      setResponseStatus(prev => ({
        ...prev,
        [data.playerName]: true
      }));
    });

    socket.on('reconnectState', (state) => {
      setGameStarted(state.gameStarted);
      setCurrentQuestion(state.currentQuestion);
      setRegisteredPlayers(state.registeredPlayers);
      setFinalScores(state.playerScores);
      setResponseStatus(state.playerAnswers);
    });

    return () => socket.disconnect();
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

  // Game over display with champion highlight and final scores
  if (gameOver) {
    return (
      <div className="game-show-container">
        {/* Main header announcing game completion */}
        <h1 className="game-show-header">Game Show Finale!</h1>

        {/* Champion section with avatar and celebration message */}
        <div className="champion-section">
          <h2>🏆 Champion 🏆</h2>
          {finalWinners.map((winner) => (
            <div key={winner} className="champion-display">
              <img
                src={avatarUrls[winner]}
                alt={`${winner}'s avatar`}
                className="champion-avatar"
                onError={(e) => {
                  e.target.src = '/default-avatar.png';
                }}
              />
              <h3>{winner}</h3>
              <p className="champion-score">Score: {finalScores[winner]}</p>
            </div>
          ))}
        </div>

        {/* Celebratory quip about the winner */}
        <div className="winner-message">
          <p>{hostQuip}</p>
        </div>

        {/* Final scoreboard showing all players */}
        <div className="final-scoreboard">
          <h3>Final Standings</h3>
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(finalScores)
                .sort(([, a], [, b]) => b - a)
                .map(([player, score], index) => (
                  <tr key={player} className={finalWinners.includes(player) ? 'winner-row' : ''}>
                    <td>#{index + 1}</td>
                    <td>{player}</td>
                    <td>{score}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Goodbye message */}
        <div className="goodbye-message">
          <p>{goodbyeQuip}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="game-show-container">
      <h1 className="game-show-header">Welcome to Triva Night!</h1>
      
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
      <PlayerStatus players={registeredPlayers} responseStatus={responseStatus} />
      <ResponseStatus players={registeredPlayers} responseStatus={responseStatus} />
    </div>
  );
};

export default GameShowView;
