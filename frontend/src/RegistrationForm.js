import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getErrorMessage, showErrorToast } from './utils/errorHandler.js';

const RegistrationForm = () => {
  const [githubHandle, setGithubHandle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const validateGithubHandle = (handle) => {
    if (!handle || typeof handle !== 'string') {
      throw new Error('GitHub handle is required');
    }
    
    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(handle)) {
      throw new Error('Invalid GitHub handle format');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      validateGithubHandle(githubHandle);

      const response = await axios.post('/api/register', { githubHandle });
      
      if (response.data.success) {
        sessionStorage.setItem('playerName', githubHandle);
        navigate('/player');
      } else {
        throw new Error('Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);
      showErrorToast(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="registration-form">
      <h1>Register for Quiz Game</h1>
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="githubHandle">
            GitHub Handle:
            <input
              id="githubHandle"
              type="text"
              value={githubHandle}
              onChange={(e) => setGithubHandle(e.target.value)}
              placeholder="Enter your GitHub username"
              disabled={isLoading}
              className={error ? 'error' : ''}
            />
          </label>
        </div>
        <button 
          type="submit" 
          className="game-show-button"
          disabled={isLoading || !githubHandle.trim()}
        >
          {isLoading ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
  );
};

export default RegistrationForm;
