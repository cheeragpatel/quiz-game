/**
 * Socket.IO event handlers for real-time communication
 */
import GameState from '../models/GameState.js';
import { socketErrorHandler, ValidationError } from '../utils/errorHandler.js';
import { generateHostQuip } from '../virtualHost.js';

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
        
        // Send result to the player who submitted the answer
        socket.emit('answerResult', {
          success: true,
          correct: result.isCorrect || data.answer === gameState.currentQuestion.correctAnswer,
          score: result.score || gameState.playerScores[data.playerName]
        });
        
        // Notify game show that a player has answered
        io.emit('playerAnswered', {
          playerName: data.playerName
        });

        if (result.roundComplete) {
          // Generate a quip based on whether there was a winner
          const hostQuip = await generateHostQuip(
            result.winner ? gameState.currentQuestion.question : 'no winners',
            result.winner || gameState.currentQuestion.correctAnswer
          );

          // Broadcast round completion to all clients
          io.emit('roundComplete', {
            winner: result.winner,
            quip: hostQuip,
            correctAnswer: gameState.currentQuestion.correctAnswer,
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