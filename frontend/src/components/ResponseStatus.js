import React from 'react';

/**
 * ResponseStatus component to display the response status of players.
 * @param {Object} props - The component props.
 * @param {Array} props.players - The list of players.
 * @param {Object} props.responseStatus - The response status of players.
 * @returns {JSX.Element} The ResponseStatus component.
 */
const ResponseStatus = ({ players, responseStatus }) => {
  return (
    <div className="response-status">
      <h3>Player Responses</h3>
      <div className="response-grid">
        {players.map((player) => (
          <div 
            key={player.githubHandle}
            className={`response-indicator ${responseStatus[player.githubHandle] ? 'answered' : 'waiting'}`}
          >
            <span className="player-name">{player.githubHandle}</span>
            <span className="response-icon">
              {responseStatus[player.githubHandle] ? '✓' : '⌛'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResponseStatus;
