import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const RegistrationForm = () => {
  const [githubHandle, setGithubHandle] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/register', { githubHandle });
      navigate('/player');
    } catch (error) {
      console.error('Error registering:', error);
    }
  };

  return (
    <div className="registration-form">
      <h1>Register</h1>
      <form onSubmit={handleSubmit}>
        <label>
          GitHub Handle:
          <input
            type="text"
            value={githubHandle}
            onChange={(e) => setGithubHandle(e.target.value)}
          />
        </label>
        <button type="submit" className="game-show-button">Register</button>
      </form>
    </div>
  );
};

export default RegistrationForm;
