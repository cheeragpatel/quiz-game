/**
 * Quiz Game Server
 * Main entry point for the backend API
 */
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PORT } from './config/index.js';
import { errorMiddleware } from './utils/errorHandler.js';
import { connectRedis, setupSocketIORedisAdapter, clearSocketSessions } from './redis/redisClient.js';
import GameState from './models/GameState.js';
import setupRoutes from './routes/index.js';
import { setupSocketHandlers } from './socket/socketHandlers.js';
import { manageGameInstances } from './utils/gameUtils.js';
import rateLimit from 'express-rate-limit';

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app and HTTP server
const app = express();
const httpServer = createServer(app);

// Configure Socket.IO with settings matching the client
const io = new Server(httpServer, {
  pingTimeout: 10000,
  pingInterval: 5000,
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Parse JSON request bodies
app.use(express.json());

// Apply rate limiting to all requests
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(limiter);

// Serve static files from the correct public directory
// First, try the Docker container path
const publicPath = process.env.NODE_ENV === 'production' 
  ? join(dirname(__dirname), 'public')  // In Docker: /usr/src/app/public
  : join(__dirname, 'public');          // Local development
console.log('Serving static files from:', publicPath);
app.use(express.static(publicPath));

// Serve index.html for all routes (SPA support)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(join(publicPath, 'index.html'));
});

// Connect to Redis
await connectRedis();

// Set up the Socket.IO Redis adapter
await setupSocketIORedisAdapter(io);

// Create the default game state
const gameState = new GameState();

// Initialize the server
async function initServer() {
  try {
    // Clear any socket sessions
    await clearSocketSessions();
    
    // Load persistent game state or create fresh state on server startup
    await gameState.loadState();
    
    // Always reset on server start to ensure clean state
    gameState.reset();
    
    // Persist the clean state
    await gameState.persistState();
    
    console.log('Game state initialized on server startup');
  } catch (error) {
    console.error('Failed to initialize game state:', error);
  }
}

// Set up Socket.IO handlers
setupSocketHandlers(io, gameState);

// Set up API routes
setupRoutes(app, io, gameState);

// Error handling middleware
app.use(errorMiddleware);

// Initialize and start the server
await initServer();

// Start the server
httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  // Enhanced error logging for better debugging
  if (reason instanceof Error) {
    console.error('Unhandled Rejection:', {
      message: reason.message,
      stack: reason.stack,
      code: reason.code,
      status: reason.status || (reason.response && reason.response.status),
      isRateLimit: reason.status === 429 || (reason.response && reason.response.status === 429)
    });
  } else {
    console.error('Unhandled Rejection:', reason);
  }
  
  // Don't exit the process on rate limit errors, just log them
  if (reason && 
      ((reason.status === 429) || 
       (reason.response && reason.response.status === 429) ||
       (reason.message && reason.message.includes('429')))) {
    console.error('Rate limit hit. Not crashing server.');
  } else {
    // For other critical errors, exit the process
    process.exit(1);
  }
});

// Export for testing
export { app, httpServer, gameState };
