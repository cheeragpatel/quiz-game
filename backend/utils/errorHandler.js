class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

class GameError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GameError';
  }
}

class StateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StateError';
  }
}

function errorMiddleware(err, req, res, next) {
  console.error('Error:', err);

  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message });
  }

  if (err instanceof GameError) {
    return res.status(500).json({ error: err.message });
  }

  if (err instanceof StateError) {
    return res.status(409).json({ error: err.message });
  }

  // Default error
  res.status(500).json({ error: 'An unexpected error occurred' });
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function socketErrorHandler(socket, error) {
  console.error('Socket error:', error);
  socket.emit('error', { message: error.message });
}

// Utility function to get standardized error messages
function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export {
  ValidationError,
  GameError,
  StateError,
  errorMiddleware,
  asyncHandler,
  socketErrorHandler,
  getErrorMessage
};