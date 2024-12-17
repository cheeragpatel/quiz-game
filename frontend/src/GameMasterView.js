import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

const GameMasterView = ({ setCurrentQuestion, setGameStatus, gameStatus }) => {
  const [numQuestions, setNumQuestions] = useState(10);
  const [topics, setTopics] = useState('');
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState({});
  const [winner, setWinner] = useState(null);
  const [hostQuip, setHostQuip] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [finalScores, setFinalScores] = useState({});
  const [playerResponses, setPlayerResponses] = useState({});
  const [responseStatus, setResponseStatus] = useState({});

  // Fetch players when component mounts
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await axios.get('/api/players');
        setPlayers(response.data);
      } catch (error) {
        console.error('Error fetching players:', error);
      }
    };
    fetchPlayers();
  }, []);

  // Add socket listener for new player registrations
  useEffect(() => {
    const socket = io();
    socket.on('playerRegistered', (updatedPlayers) => {
      setPlayers(updatedPlayers);
    });
    return () => socket.close();
  }, []);

  // Add socket listener for round completion
  useEffect(() => {
    const socket = io();
    socket.on('roundComplete', (data) => {
      setWinner(data.winner);
      setHostQuip(data.quip);
      setScores(data.scores);
    });
    return () => socket.close();
  }, []);

  // Add socket listener for game over
  useEffect(() => {
    const socket = io();
    socket.on('gameOver', (data) => {
      setGameOver(true);
      setWinner(data.winner);
      setHostQuip(data.quip);
      setFinalScores(data.finalScores);
      setGameStatus('ended');
    });
    return () => socket.close();
  }, [setGameStatus]);

  // Add socket listener for game started
  useEffect(() => {
    const socket = io();

    socket.on('gameStarted', (data) => {
      console.log('Game started event received:', data);
      setGameStatus('started');
      setCurrentQuestion(data.currentQuestion);
    });

    return () => socket.disconnect();
  }, []);

  // Add socket listener for responses
  useEffect(() => {
    const socket = io();
    
    socket.on('playerAnswered', ({ playerName }) => {
      setPlayerResponses(prev => ({
        ...prev,
        [playerName]: true
      }));
    });

    socket.on('newQuestion', () => {
      setPlayerResponses({}); // Reset responses
    });

    return () => socket.disconnect();
  }, []);

  // Add socket listener specifically for player answers
  useEffect(() => {
    const socket = io();

    socket.on('playerAnswered', (data) => {
      console.log('Player answered:', data); // Debug log
      setResponseStatus(prev => ({
        ...prev,
        [data.playerName]: true
      }));
    });

    // Reset responses when new question starts
    socket.on('newQuestion', () => {
      console.log('New question - resetting responses'); // Debug log
      setResponseStatus({});
    });

    return () => socket.disconnect();
  }, []);

  const handleNumQuestionsChange = (e) => {
    setNumQuestions(e.target.value);
  };

  const handleTopicsChange = (e) => {
    setTopics(e.target.value);
  };

  const startGame = async () => {
    try {
      const response = await axios.post('/api/startGame', {
        numQuestions,
        topics: topics.split(',').map((topic) => topic.trim()),
      });
      setGameStatus('started');
      setCurrentQuestion(response.data.currentQuestion);
    } catch (error) {
      console.error('Error starting game:', error);
    }
  };

  const endGame = async () => {
    try {
      await axios.post('/api/endGame');
      setGameStatus('ended');
    } catch (error) {
      console.error('Error ending game:', error);
    }
  };

  const nextQuestion = async () => {
    try {
      const response = await axios.post('/api/nextQuestion');
      setCurrentQuestion(response.data);
      setWinner(null); // Reset winner for new round
      setHostQuip(''); // Reset quip for new round
    } catch (error) {
      console.error('Error fetching next question:', error);
    }
  };

  const ResponseStatus = () => (
    <div className="response-status">
      <h3>Player Responses</h3>
      <div className="response-grid">
        {players.map(player => (
          <div 
            key={player.githubHandle}
            className={`response-indicator ${playerResponses[player.githubHandle] ? 'answered' : 'waiting'}`}
          >
            <span className="player-name">{player.githubHandle}</span>
            <span className="response-icon">
              {playerResponses[player.githubHandle] ? '✓' : '⌛'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPlayerStatus = () => (
    <div className="game-show-container">
      <h3>Player Responses</h3>
      <div className="game-show-choices">
        {players.map((player) => (
          <li 
            key={player.githubHandle}
            className={responseStatus[player.githubHandle] ? 'answered' : 'waiting'}
          >
            {player.githubHandle}: {responseStatus[player.githubHandle] ? '✓ Answered' : '⌛ Waiting'}
          </li>
        ))}
      </div>
    </div>
  );

  if (gameStatus === 'started') {
    return (
      <div>
        <h2>Game in Progress</h2>
        {/* Display current question or other game details */}
        <ResponseStatus />
        {renderPlayerStatus()}
      </div>
    );
  }

  return (
    <div>
      <h1>Game Master View</h1>
      
      {gameOver ? (
        <div className="game-show-container">
          <div className="game-show-winner">
            <h2>Game Over!</h2>
            <h3>Final Winner: {winner}</h3>
            <p>{hostQuip}</p>
            <div className="final-scores">
              <h4>Final Scores:</h4>
              <ul className="game-show-choices">
                {Object.entries(finalScores)
                  .sort(([,a], [,b]) => b - a)
                  .map(([player, score]) => (
                    <li key={player}>{player}: {score} points</li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Existing player list and scores */}
          <div className="game-show-container">
            <h2>Players and Scores</h2>
            {players.length === 0 ? (
              <p>No players registered yet</p>
            ) : (
              <ul className="game-show-choices">
                {players.map((player) => (
                  <li key={player.githubHandle}>
                    {player.githubHandle}: {scores[player.githubHandle] || 0} points
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Winner and quip display for rounds */}
          {winner && !gameOver && (
            <div className="game-show-winner">
              <h3>Round Winner: {winner}</h3>
              <p>{hostQuip}</p>
            </div>
          )}

          {/* Game controls */}
          <div>
            <label>
              Number of Questions:
              <input
                type="number"
                value={numQuestions}
                onChange={handleNumQuestionsChange}
                min="1"
              />
            </label>
          </div>
          <div>
            <label>
              Topics (comma separated):
              <input
                type="text"
                value={topics}
                onChange={handleTopicsChange}
                placeholder="e.g., science, history"
              />
            </label>
          </div>
          <div>
            <button className="game-show-button" onClick={startGame}>Start Game</button>
            <button className="game-show-button" onClick={endGame}>End Game</button>
            <button className="game-show-button" onClick={nextQuestion}>Next Question</button>
          </div>
        </>
      )}
    </div>
  );
};

export default GameMasterView;