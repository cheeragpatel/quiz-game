import React, { useState } from 'react';
import axios from 'axios';

const RegistrationForm = () => {
  const [githubHandle, setGithubHandle] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setGithubHandle(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.get(`https://api.github.com/users/${githubHandle}`);
      setAvatarUrl(response.data.avatar_url);
      setError('');
    } catch (error) {
      setError('Failed to fetch GitHub avatar. Please check the GitHub handle.');
      setAvatarUrl('');
    }
  };

  return (
    <div>
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <label>
          GitHub Handle:
          <input type="text" value={githubHandle} onChange={handleInputChange} required />
        </label>
        <button type="submit">Register</button>
      </form>
      {avatarUrl && (
        <div>
          <h3>Profile Picture</h3>
          <img src={avatarUrl} alt="GitHub Avatar" />
        </div>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default RegistrationForm;
