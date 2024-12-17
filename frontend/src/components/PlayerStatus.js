import React from 'react';

/**
 * PlayerStatus component to display the status of players.
 * @param {Object} props - The component props.
 * @param {Array} props.players - The list of players.
 * @param {Object} props.responseStatus - The response status of players.
 * @returns {JSX.Element} The PlayerStatus component.
 */
const PlayerStatus = ({ players, responseStatus }) => {
  return (
    <div className="game-show-container">
      <h3>Player Responses</h3>
      <div className="game-show-choices">
        {players.map((player) => (
          <li 
            key={player.githubHandle}
            className={responseStatus[player.githubHandle] ? 'answered' : 'waiting'}
          >
            {player.githubHandle}: {responseStatus[player.githubHandle] ? '✓ Answered' : '⌛ Waiting'}
          </li>
        ))}
      </div>
    </div>
  );
};

export default PlayerStatus;
