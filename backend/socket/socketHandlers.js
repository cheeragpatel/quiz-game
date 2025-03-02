/**
 * Socket.IO event handlers for real-time communication
 */
import GameState from '../models/GameState.js';
import { socketErrorHandler, ValidationError } from '../utils/errorHandler.js';

/**
 * Set up Socket.IO event handlers
 * 
 * @param {Object} io - The Socket.IO server instance
 * @param {GameState} gameState - The game state
 */
export function setupSocketHandlers(io, gameState) {
  // Configure Socket.IO server settings
  io.engine.pingTimeout = 10000;
  io.engine.pingInterval = 5000;

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    let playerName = null;

    // Send current game state to newly connected client
    socket.emit('reconnectState', {
      ...gameState.saveState(),
      hasEnded: !gameState.gameStarted && gameState.currentQuestionIndex > 0
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      gameState.activeConnections.delete(socket.id);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      socketErrorHandler(socket, error);
    });

    socket.on('playerJoin', (name) => {
      playerName = name;
      socket.join('players');
      console.log(`Player ${name} joined`);
    });

    socket.on('submitAnswer', async (data) => {
      try {
        if (!data.playerName || !data.answer) {
          throw new ValidationError('Player name and answer are required');
        }

        const result = await gameState.submitAnswer(data.playerName, data.answer);
        socket.emit('answerResult', {
          success: true,
          correct: result.isCorrect,
          score: result.score
        });

        if (result.roundComplete) {
          io.emit('roundComplete', {
            winner: result.winner,
            correctAnswer: result.correctAnswer,
            scores: gameState.playerScores
          });
        }
      } catch (error) {
        console.error('Error handling answer submission:', error);
        socket.emit('answerResult', {
          success: false,
          error: error.message
        });
      }
    });

    // Add this socket to active connections
    gameState.activeConnections.add(socket.id);
  });
}

export default setupSocketHandlers;