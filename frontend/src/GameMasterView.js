import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import PlayerStatus from './components/PlayerStatus';
import ResponseStatus from './components/ResponseStatus';

const GameMasterView = ({ setCurrentQuestion, setGameStatus, gameStatus }) => {
  const [numQuestions, setNumQuestions] = useState(10);
  const [topics, setTopics] = useState('');
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState({});
  const [winner, setWinner] = useState(null);
  const [hostQuip, setHostQuip] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [finalScores, setFinalScores] = useState({});
  // eslint-disable-next-line no-unused-vars
  const [playerResponses, setPlayerResponses] = useState({});
  const [responseStatus, setResponseStatus] = useState({});

  const socket = io();

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
    socket.on('playerRegistered', (updatedPlayers) => {
      setPlayers(updatedPlayers);
    });
    return () => socket.off('playerRegistered');
  }, []);

  // Add socket listener for round completion
  useEffect(() => {
    socket.on('roundComplete', (data) => {
      setWinner(data.winner);
      setHostQuip(data.quip);
      setScores(data.scores);
    });
    return () => socket.off('roundComplete');
  }, []);

  // Add socket listener for game over
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    socket.on('gameOver', (data) => {
      setGameOver(true);
      setWinner(data.winner);
      setHostQuip(data.quip);
      setFinalScores(data.finalScores);
      setGameStatus('ended');
    });
    return () => socket.off('gameOver');
  }, [setGameStatus]);

  // Add socket listener for game started
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    socket.on('gameStarted', (data) => {
      console.log('Game started event received:', data);
      setGameStatus('started');
      setCurrentQuestion(data.currentQuestion);
    });
    return () => socket.off('gameStarted');
  }, [setCurrentQuestion, setGameStatus]);

  // Add socket listener for responses
  useEffect(() => {
    socket.on('playerAnswered', ({ playerName }) => {
      setPlayerResponses(prev => ({
        ...prev,
        [playerName]: true
      }));
    });

    socket.on('newQuestion', () => {
      setPlayerResponses({}); // Reset responses
    });
    return () => {
      socket.off('playerAnswered');
      socket.off('newQuestion');
    };
  }, []);

  // Add socket listener specifically for player answers
  useEffect(() => {
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

    return () => {
      socket.off('playerAnswered');
      socket.off('newQuestion');
    };
  }, []);

  // Add socket listener for reconnection
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    socket.on('reconnectStateRequest', (state) => {
      setGameStatus(state.gameStarted ? 'started' : 'not started');
      setCurrentQuestion(state.currentQuestion);
      setPlayers(state.registeredPlayers);
      setScores(state.playerScores);
      setResponseStatus(state.playerAnswers);
    });
    return () => socket.off('reconnectStateRequest');
  }, [setCurrentQuestion, setGameStatus]);

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

  // New function to reset game state and prepare for a new game
  const newGame = () => {
    // Reset all game state
    setGameOver(false);
    setWinner(null);
    setHostQuip('');
    setScores({});
    setFinalScores({});
    setResponseStatus({});
    setPlayerResponses({});
    setGameStatus('not started');
  };

  if (gameStatus === 'started') {
    return (
      <div>
        <h2>Game in Progress</h2>
        {/* Display current question or other game details */}
        <ResponseStatus players={players} responseStatus={responseStatus} />
        <PlayerStatus players={players} responseStatus={responseStatus} />

        {/* Game control buttons during active game */}
        <div className="game-controls">
          <button className="game-show-button" onClick={nextQuestion}>Next Question</button>
          <button className="game-show-button" onClick={endGame}>End Game</button>
        </div>
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
            {/* New Game button */}
            <button className="game-show-button new-game-button" onClick={newGame}>Start New Game</button>
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
