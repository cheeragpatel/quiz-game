import React from 'react';

/**
 * Custom error messages for different error types
 */
const ErrorMessages = {
  network: 'Network error. Please check your connection.',
  server: 'Server error. Please try again later.',
  gameState: 'Game state error. Please refresh the page.',
  validation: 'Invalid input. Please check your entries.',
  auth: 'Authentication error. Please log in again.',
  default: 'An unexpected error occurred.'
};

/**
 * Parse error and return appropriate message
 * @param {Error} error - The error object
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (error) => {
  if (!error) return ErrorMessages.default;

  // Network errors
  if (!navigator.onLine || error.message === 'Network Error') {
    return ErrorMessages.network;
  }

  // Axios errors
  if (error.response) {
    const status = error.response.status;
    const message = error.response.data?.error?.message;

    if (status === 400) return message || ErrorMessages.validation;
    if (status === 401 || status === 403) return message || ErrorMessages.auth;
    if (status >= 500) return message || ErrorMessages.server;
  }

  // Game specific errors
  if (error.message?.includes('game')) {
    return error.message;
  }

  return ErrorMessages.default;
};

/**
 * Format error for logging
 * @param {Error} error - The error object
 * @param {Object} context - Additional context
 * @returns {Object} Formatted error object
 */
export const formatError = (error, context = {}) => ({
  message: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString(),
  ...context
});

/**
 * Show error toast/alert to user
 * @param {string} message - Error message to display
 */
export const showErrorToast = (message) => {
  // For now, use alert. In future, replace with toast component
  alert(message);
};

/**
 * Error boundary class component
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', formatError(error, errorInfo));
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{getErrorMessage(this.state.error)}</p>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}